/* =========================================================
   WORKER EDIT PROFILE SCRIPT
   config.js and nigeria-location.js load before this file.
========================================================= */

/* =========================
   1. PAGE ELEMENTS
========================= */
const editProfilePage=document.getElementById("editProfilePage"),
profileForm=document.getElementById("profileForm"),
profilePhotoInput=document.getElementById("profilePhotoInput"),
profilePhoto=document.getElementById("profilePhoto"),
profilePhotoPlaceholder=document.getElementById("profilePhotoPlaceholder"),
photoFileName=document.getElementById("photoFileName"),
fullNameInput=document.getElementById("fullName"),
phoneInput=document.getElementById("phone"),
countryInput=document.getElementById("country"),
stateInput=document.getElementById("state"),
cityInput=document.getElementById("city"),
lgaInput=document.getElementById("lga"),
locationInput=document.getElementById("location"),
updateProfileBtn=document.getElementById("updateProfileBtn"),
buttonText=updateProfileBtn.querySelector(".button-text"),
buttonLoader=updateProfileBtn.querySelector(".button-loader"),
cancelBtn=document.getElementById("cancelBtn"),
viewServicesBtn=document.getElementById("viewServicesBtn"),
editProfileBtn=document.getElementById("editProfileBtn"),
logoutBtn=document.getElementById("logoutBtn"),
menuBtn=document.getElementById("menuBtn"),
closeMenuBtn=document.getElementById("closeMenuBtn"),
sidebar=document.getElementById("sidebar"),
overlay=document.getElementById("overlay");

/* =========================
   2. NOTIFICATION MODAL
========================= */
const notificationOverlay=document.getElementById("notificationOverlay"),
notificationCard=document.getElementById("notificationCard"),
notificationIcon=document.getElementById("notificationIcon"),
notificationTitle=document.getElementById("notificationTitle"),
notificationText=document.getElementById("notificationText"),
notificationButton=document.getElementById("notificationButton"),
notificationCancelButton=document.getElementById("notificationCancelButton");

/* =========================
   3. API ENDPOINTS
========================= */
const PROFILE_ENDPOINT="/api/worker/edit-profile",
LOGOUT_ENDPOINT="/api/auth/worker/logout";

/* =========================
   4. PAGE STATE
========================= */
let currentWorker=null,
modalCloseAction=null,
isUpdatingProfile=false,
isLoggingOut=false;

/* =========================
   5. UPDATE LOADING
========================= */
function setUpdateLoading(loading){
    updateProfileBtn.disabled=loading;
    cancelBtn.disabled=loading;
    buttonLoader.hidden=!loading;
    buttonText.textContent=loading?"Updating...":"Update Profile";
}

/* =========================
   6. PAGE LOADING
========================= */
function setPageLoading(loading){
    editProfilePage.setAttribute("aria-busy",loading?"true":"false");
    profileForm.style.opacity=loading?".55":"1";
    profileForm.style.pointerEvents=loading?"none":"auto";
}

/* =========================
   7. MODAL
========================= */

/* Show the notification modal. */
function showModal({
    type="success",
    title="Notification",
    message="",
    icon="✓",
    onClose=null
}={}){

    /* Set modal appearance and content. */
    notificationCard.className=`notification-card ${type}`;
    notificationIcon.textContent=icon;
    notificationTitle.textContent=title;
    notificationText.textContent=message;
    modalCloseAction=onClose;
    notificationButton.onclick=null;
    notificationCancelButton.onclick=null;
    notificationButton.textContent="Continue";
    notificationButton.disabled=false;
    notificationCancelButton.hidden=true;
    notificationCancelButton.disabled=false;
    notificationButton.onclick=()=>{
        if(notificationButton.disabled)return;
        closeModal();
    };
    notificationCancelButton.onclick=()=>{
        if(notificationCancelButton.disabled)return;
        closeModal();
    };
    notificationOverlay.hidden=false;
    notificationButton.focus();
}

function closeModal(){
    notificationOverlay.hidden=true;
    const action=modalCloseAction;
    modalCloseAction=null;
    notificationButton.onclick=null;
    notificationCancelButton.onclick=null;
    notificationButton.textContent="Continue";
    notificationButton.disabled=false;
    notificationCancelButton.hidden=true;
    notificationCancelButton.disabled=false;
    if(typeof action==="function"){
        action();
    }
}

/* =========================
   8. AUTHENTICATION
========================= */
function redirectToAuthentication(){
    removeAccessToken();
    window.location.href="../worker-authentication/index.html";
}

function showAuthenticationError(message){
    showModal({
        type:"error",
        title:"Session Expired",
        message:message||"Your session has expired. Please log in again.",
        icon:"!",
        onClose:redirectToAuthentication
    });
}

/* =========================
   9. BACKEND RESPONSE
========================= */
async function getResponseData(response){
    try{return await response.json()}catch(error){return {}}
}

function getBackendMessage(data,fallback){
    return data.message||data.error||fallback;
}

/* =========================
   10. PHONE NORMALIZATION
========================= */
function normalizePhone(phone){
    let value=String(phone||"").trim().replace(/[\s()-]/g,"");
    if(value.startsWith("+234"))value="234"+value.slice(4);
    else if(value.startsWith("234"))value="234"+value.slice(3);
    else if(value.startsWith("0"))value="234"+value.slice(1);
    return value;
}

/* =========================
   11. PHONE VALIDATION
========================= */
function isValidPhone(phone){
    return /^234[789]\d{9}$/.test(phone);
}

/* =========================
   12. PHOTO VALIDATION
========================= */
function validatePhoto(file){
    if(!file)return null;
    if(file.size>5*1024*1024)return"Profile photo must not be more than 5 MB.";
    if(!file.type.startsWith("image/"))return"Please select a valid image file.";
    return null;
}

/* =========================
   13. LOCATION HELPERS
========================= */
function resetSelect(select,placeholder){
    select.innerHTML="";
    const option=document.createElement("option");
    option.value="";
    option.textContent=placeholder;
    select.appendChild(option);
    select.disabled=true;
}

function populateSelect(select,values,selectedValue,placeholder){
    resetSelect(select,placeholder);
    values.forEach(value=>{
        const option=document.createElement("option");
        option.value=value;
        option.textContent=value;
        if(value===selectedValue)option.selected=true;
        select.appendChild(option);
    });
    select.disabled=false;
}

/* =========================
   14. LOAD STATES
========================= */
function loadStates(selectedState=""){
    const countryData=NIGERIAN_LOCATION_DATA[countryInput.value];
    resetSelect(stateInput,"Select State");
    resetSelect(cityInput,"Select City");
    resetSelect(lgaInput,"Select LGA");
    if(countryData)
        populateSelect(stateInput,Object.keys(countryData),selectedState,"Select State");
}

/* =========================
   15. LOAD CITY / LGA
========================= */
function loadStateLocations(selectedCity="",selectedLga=""){
    const stateData=NIGERIAN_LOCATION_DATA?.[countryInput.value]?.[stateInput.value];
    resetSelect(cityInput,"Select City");
    resetSelect(lgaInput,"Select LGA");
    if(!stateData)return;
    populateSelect(cityInput,stateData.cities||[],selectedCity,"Select City");
    populateSelect(lgaInput,stateData.lgas||[],selectedLga,"Select LGA");
}

/* =========================
   16. LOCATION VALUE
========================= */
function updateLocationValue(){
    const values=[cityInput.value,lgaInput.value,stateInput.value,countryInput.value];
    locationInput.value=values.some(value=>!value)?"":values.join(", ");
}

/* =========================
   17. PROFILE PHOTO
========================= */
function displayProfilePhoto(photoUrl){
    if(!photoUrl){
        profilePhoto.hidden=true;
        profilePhotoPlaceholder.hidden=false;
        return;
    }
    profilePhoto.src=photoUrl;
    profilePhoto.hidden=false;
    profilePhotoPlaceholder.hidden=true;
}

/* =========================
   18. DISPLAY WORKER
========================= */
function displayWorkerData(worker){
    currentWorker=worker;
    fullNameInput.value=worker.fullName||"";
    phoneInput.value=worker.phone||"";
    countryInput.value=worker.country||"";
    loadStates(worker.state||"");
    stateInput.value=worker.state||"";
    loadStateLocations(worker.city||"",worker.lga||"");
    cityInput.value=worker.city||"";
    lgaInput.value=worker.lga||"";
    updateLocationValue();
    displayProfilePhoto(worker.profilePhoto);
}

/* =========================
   19. EXTRACT WORKER
========================= */
function extractWorkerData(data){
    return data.worker||data.data||data;
}

/* =========================
   20. LOAD PROFILE
========================= */
async function loadProfile(){
    if(!getAccessToken()){
        showAuthenticationError("You need to log in before editing your profile.");
        return;
    }

    setPageLoading(true);

    try{
        const response=await API_REQUEST(PROFILE_ENDPOINT,{method:"GET"});

        if(response.status===401){
            showAuthenticationError("Your login session has expired. Please log in again.");
            return;
        }

        const data=await getResponseData(response);

        if(!response.ok){
            showModal({
                type:"error",
                title:"Unable to Load Profile",
                message:getBackendMessage(data,"We could not load your profile. Please try again."),
                icon:"!"
            });
            return;
        }

        const worker=extractWorkerData(data);

        if(!worker){
            showModal({
                type:"error",
                title:"Profile Error",
                message:"Worker profile data was not returned by the server.",
                icon:"!"
            });
            return;
        }

        displayWorkerData(worker);
    }catch(error){
        console.error("Load profile error:",error);
        showModal({
            type:"error",
            title:"Connection Error",
            message:"Unable to connect to the server. Please try again.",
            icon:"!"
        });
    }finally{
        setPageLoading(false);
    }
}

/* =========================
   21. FULL NAME NORMALIZATION
========================= */

/*
 * Normalize a name part so that:
 * destiny  -> Destiny
 * DESTINY  -> Destiny
 * dEsTiNy  -> Destiny
 *
 * Apostrophes and hyphens inside a name part
 * are also handled correctly.
 */
function normalizeNamePart(name){

    return name
        .toLowerCase()
        .split(/([-'])/)
        .map(part=>{
            if(part==="-"||part==="'")return part;

            return part.charAt(0).toUpperCase()+part.slice(1);
        })
        .join("");
}


/*
 * Validate and normalize the worker's full name.
 *
 * The name MUST contain exactly two names separated
 * by whitespace.
 *
 * Example:
 * Destiny Okpone
 * Samuel Okpone
 */
function normalizeFullName(value){

    const fullName=String(value||"")
        .trim()
        .replace(/\s+/g," ");

    /*
     * Exactly two name parts are required.
     */
    const nameParts=fullName.split(" ");

    if(nameParts.length!==2){
        return null;
    }

    /*
     * Each name part may contain letters,
     * apostrophes or hyphens.
     */
    const namePattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

    if(
        !namePattern.test(nameParts[0]) ||
        !namePattern.test(nameParts[1])
    ){
        return null;
    }

    /*
     * Normalize both names.
     */
    return nameParts
        .map(normalizeNamePart)
        .join(" ");
}


/* =========================
   22. FRONTEND VALIDATION
========================= */
function validateProfile(){

    const normalizedFullName=
        normalizeFullName(fullNameInput.value),

    phone=normalizePhone(phoneInput.value),

    photo=profilePhotoInput.files[0],

    photoError=validatePhoto(photo);


    if(photoError){

        showModal({
            type:"error",
            title:"Invalid Photo",
            message:photoError,
            icon:"!"
        });

        return null;
    }


    if(!normalizedFullName){

        showModal({
            type:"error",
            title:"Invalid Full Name",
            message:"Please enter exactly two names with a space between them, for example: Destiny Okpone.",
            icon:"!"
        });

        return null;
    }


    /*
     * Put the normalized name back into the input.
     *
     * Example:
     * destiny okpone
     * becomes:
     * Destiny Okpone
     */
    fullNameInput.value=normalizedFullName;


    if(!phone){

        showModal({
            type:"error",
            title:"Phone Number Required",
            message:"Please enter your phone number.",
            icon:"!"
        });

        return null;
    }


    if(!isValidPhone(phone)){

        showModal({
            type:"error",
            title:"Invalid Phone Number",
            message:"Please enter a valid Nigerian phone number.",
            icon:"!"
        });

        return null;
    }


    if(
        !countryInput.value||
        !stateInput.value||
        !cityInput.value||
        !lgaInput.value
    ){

        showModal({
            type:"error",
            title:"Incomplete Location",
            message:"Please select your country, state, city and LGA.",
            icon:"!"
        });

        return null;
    }


    return{
        fullName:normalizedFullName,
        phone
    };
}

/* =========================
   23. UPDATE PROFILE
========================= */
async function updateProfile(){
    if(isUpdatingProfile)return;

    const validated=validateProfile();
    if(!validated)return;

    if(!getAccessToken()){
        showAuthenticationError("Your login session is no longer available.");
        return;
    }

    updateLocationValue();

    const formData=new FormData(profileForm);
    formData.set("fullName",validated.fullName);
    formData.set("phone",validated.phone);
    formData.set("location",locationInput.value);

    isUpdatingProfile=true;
    setUpdateLoading(true);

    try{
        const response=await API_REQUEST(PROFILE_ENDPOINT,{
            method:"PUT",
            body:formData
        });

        if(response.status===401){
            showAuthenticationError("Your login session has expired. Please log in again.");
            return;
        }

        const data=await getResponseData(response);

        if(!response.ok){
            showModal({
                type:"error",
                title:"Update Failed",
                message:getBackendMessage(data,"Your profile could not be updated."),
                icon:"!"
            });
            return;
        }

        if(data.worker)displayWorkerData(data.worker);
        else await loadProfile();

        profilePhotoInput.value="";
        photoFileName.textContent="No new photo selected";

        showModal({
            type:"success",
            title:"Profile Updated",
            message:data.message||"Your profile has been updated successfully.",
            icon:"✓"
        });
    }catch(error){
        console.error("Update profile error:",error);
        showModal({
            type:"error",
            title:"Connection Error",
            message:"Unable to update your profile. Please try again.",
            icon:"!"
        });
    }finally{
        isUpdatingProfile=false;
        setUpdateLoading(false);
    }
}

/* =========================
   23. PHOTO PREVIEW
========================= */
profilePhotoInput.addEventListener("change",()=>{
    const file=profilePhotoInput.files[0];

    if(!file){
        photoFileName.textContent="No new photo selected";
        return;
    }

    const error=validatePhoto(file);

    if(error){
        profilePhotoInput.value="";
        photoFileName.textContent="No new photo selected";
        showModal({type:"error",title:"Invalid Photo",message:error,icon:"!"});
        return;
    }

    photoFileName.textContent=file.name;
    profilePhoto.src=URL.createObjectURL(file);
    profilePhoto.hidden=false;
    profilePhotoPlaceholder.hidden=true;
});

/* =========================
   24. LOCATION EVENTS
========================= */
countryInput.addEventListener("change",()=>{
    loadStates();
    updateLocationValue();
});

stateInput.addEventListener("change",()=>{
    loadStateLocations();
    updateLocationValue();
});

cityInput.addEventListener("change",updateLocationValue);
lgaInput.addEventListener("change",updateLocationValue);

/* =========================
   25. FORM SUBMISSION
========================= */
profileForm.addEventListener("submit",event=>{
    event.preventDefault();
    updateProfile();
});

/* =========================
   26. NAVIGATION
========================= */
editProfileBtn.addEventListener("click",closeMobileMenu);

cancelBtn.addEventListener("click",()=>{
    window.location.href="../worker-dashboard/index.html";
});

viewServicesBtn.addEventListener("click",()=>{
    window.location.href="../worker-services/index.html";
});

/* =========================
   27. MOBILE SIDEBAR
========================= */
function openMobileMenu(){
    sidebar.classList.add("active");
    overlay.classList.add("active");
    menuBtn.setAttribute("aria-expanded","true");
}

function closeMobileMenu(){
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    menuBtn.setAttribute("aria-expanded","false");
}

menuBtn.addEventListener("click",openMobileMenu);
closeMenuBtn.addEventListener("click",closeMobileMenu);
overlay.addEventListener("click",closeMobileMenu);

/* =========================
   28. LOGOUT
========================= */

/* Show logout confirmation. */
logoutBtn.addEventListener("click",()=>{
    if(isLoggingOut)return;

    if(!getAccessToken()){
        showAuthenticationError(
            "Your login session has expired. Please log in again."
        );
        return;
    }

    showModal({
        type:"warning",
        title:"Confirm Logout",
        message:"Are you sure you want to log out?",
        icon:"!"
    });

    /* Configure confirmation buttons. */
    notificationButton.textContent="Continue";
    notificationButton.disabled=false;
    notificationCancelButton.hidden=false;
    notificationCancelButton.disabled=false;

    /* Continue starts logout and immediately shows loading. */
    notificationButton.onclick=()=>{
        if(isLoggingOut)return;

        isLoggingOut=true;

        /* Disable both modal buttons immediately. */
        notificationButton.disabled=true;
        notificationCancelButton.disabled=true;

        /* Show loading state on Continue button. */
        notificationButton.innerHTML=
            '<span class="button-loader"></span> Logging out...';

        logoutUser();
    };

    /* Cancel closes the confirmation modal. */
    notificationCancelButton.onclick=()=>{
        if(isLoggingOut)return;

        notificationButton.textContent="Continue";
        notificationButton.disabled=false;
        notificationCancelButton.disabled=false;

        closeModal();
    };
});


/* Perform logout after confirmation. */
async function logoutUser(){

    const accessToken=getAccessToken();

    if(!accessToken){
        isLoggingOut=false;

        notificationButton.disabled=false;
        notificationCancelButton.disabled=false;
        notificationButton.textContent="Continue";

        closeModal();

        showAuthenticationError(
            "Your login session has expired. Please log in again."
        );

        return;
    }

    /* Disable the sidebar logout button while logging out. */
    logoutBtn.disabled=true;
    logoutBtn.classList.add("is-loading");

    try{
        /*
         * Send logout request to the backend.
         * API_REQUEST automatically includes the access token.
         */
        const response=await API_REQUEST(LOGOUT_ENDPOINT,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "Authorization":`Bearer ${accessToken}`
            }
        });

        const data=await getResponseData(response);

        if(response.status===401){
            removeAccessToken();

            isLoggingOut=false;

            notificationButton.disabled=false;
            notificationCancelButton.disabled=false;
            notificationButton.textContent="Continue";

            closeModal();

            showAuthenticationError(
                "Your login session has expired. Please log in again."
            );

            return;
        }

        if(!response.ok){
            showModal({
                type:"error",
                title:"Logout Failed",
                message:getBackendMessage(
                    data,
                    "Unable to log out. Please try again."
                ),
                icon:"!"
            });

            return;
        }

        /* Logout succeeded. */
        removeAccessToken();

        window.location.href=
            "../worker-authentication/index.html";

    }catch(error){
        console.error("Logout error:",error);

        showModal({
            type:"error",
            title:"Logout Failed",
            message:"Unable to connect to the server. Please try again.",
            icon:"!"
        });

    }finally{
        isLoggingOut=false;

        logoutBtn.disabled=false;
        logoutBtn.classList.remove("is-loading");

        notificationButton.disabled=false;
        notificationCancelButton.disabled=false;
        notificationButton.textContent="Continue";
    }
}

/* =========================
   29. INITIALIZE PAGE
========================= */
document.addEventListener("DOMContentLoaded",loadProfile);