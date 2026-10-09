/* 1. PAGE ELEMENTS */
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
updateProfileBtn=document.getElementById("updateProfileBtn"),
buttonText=updateProfileBtn.querySelector(".button-text"),
cancelBtn=document.getElementById("cancelBtn"),
viewServicesBtn=document.getElementById("viewServicesBtn"),
editProfileBtn=document.getElementById("editProfileBtn"),
logoutBtn=document.getElementById("logoutBtn"),
menuBtn=document.getElementById("menuBtn"),
closeMenuBtn=document.getElementById("closeMenuBtn"),
sidebar=document.getElementById("sidebar"),
overlay=document.getElementById("overlay");

/* 2. NOTIFICATION MODAL */
const notificationOverlay=document.getElementById("notificationOverlay"),
notificationCard=document.getElementById("notificationCard"),
notificationIcon=document.getElementById("notificationIcon"),
notificationTitle=document.getElementById("notificationTitle"),
notificationText=document.getElementById("notificationText"),
notificationButton=document.getElementById("notificationButton"),
notificationCancelButton=document.getElementById("notificationCancelButton"),
notificationNoButton=document.getElementById("notificationNoButton");

/* 3. API ENDPOINTS */
const PROFILE_ENDPOINT="/api/worker/edit-profile",
LOGOUT_ENDPOINT="/api/auth/worker/logout";

/* 4. PAGE STATE */
let currentWorker=null,
modalCloseAction=null,
isUpdatingProfile=false,
isLoggingOut=false;

/* 5. UPDATE LOADING */
function setUpdateLoading(loading){
    updateProfileBtn.disabled=loading;
    cancelBtn.disabled=loading;
    buttonText.textContent=loading?"Connecting...":"Update Profile";
}

/* 6. PAGE LOADING */
function setPageLoading(loading){
    editProfilePage.setAttribute("aria-busy",loading?"true":"false");
    profileForm.style.opacity=loading?".55":"1";
    profileForm.style.pointerEvents=loading?"none":"auto";
}

/* 7. LOCATION DROPDOWNS */
function resetLocationFields(){
    stateInput.innerHTML='<option value="">Select State</option>';
    cityInput.innerHTML='<option value="">Select City</option>';
    lgaInput.innerHTML='<option value="">Select LGA</option>';
    stateInput.disabled=true;
    cityInput.disabled=true;
    lgaInput.disabled=true;
}

function populateStates(selectedState=""){
    stateInput.innerHTML='<option value="">Select State</option>';
    cityInput.innerHTML='<option value="">Select City</option>';
    lgaInput.innerHTML='<option value="">Select LGA</option>';
    cityInput.disabled=true;
    lgaInput.disabled=true;

    if(countryInput.value!=="Nigeria"){
        stateInput.disabled=true;
        return;
    }

    getNigeriaStates().forEach(state=>{
        const option=document.createElement("option");
        option.value=state;
        option.textContent=state;
        stateInput.appendChild(option);
    });

    stateInput.disabled=false;

    if(selectedState){
        stateInput.value=selectedState;
        populateStateLocations();
    }
}

function populateStateLocations(selectedCity="",selectedLga=""){
    cityInput.innerHTML='<option value="">Select City</option>';
    lgaInput.innerHTML='<option value="">Select LGA</option>';
    cityInput.disabled=true;
    lgaInput.disabled=true;

    if(!stateInput.value)return;

    getCitiesByState(stateInput.value).forEach(city=>{
        const option=document.createElement("option");
        option.value=city;
        option.textContent=city;
        cityInput.appendChild(option);
    });

    getLGAsByState(stateInput.value).forEach(lga=>{
        const option=document.createElement("option");
        option.value=lga;
        option.textContent=lga;
        lgaInput.appendChild(option);
    });

    cityInput.disabled=false;
    lgaInput.disabled=false;

    if(selectedCity)cityInput.value=selectedCity;
    if(selectedLga)lgaInput.value=selectedLga;
}

countryInput.addEventListener("change",()=>populateStates());
stateInput.addEventListener("change",()=>populateStateLocations());

/* 8. MODAL */
function showModal({
    type="success",
    title="Notification",
    message="",
    icon="✓",
    onClose=null,
    buttonText="Continue"
}={}){
    notificationCard.className=`notification-card ${type}`;
    notificationIcon.textContent=icon;
    notificationTitle.textContent=title;
    notificationText.textContent=message;

    modalCloseAction=onClose;

    notificationButton.textContent=buttonText;
    notificationButton.disabled=false;
    notificationButton.hidden=false;

    notificationNoButton.textContent="No";
    notificationNoButton.hidden=true;
    notificationNoButton.disabled=false;

    notificationCancelButton.hidden=false;
    notificationCancelButton.disabled=false;

    notificationButton.onclick=()=>{
        if(!notificationButton.disabled)closeModal();
    };

    notificationNoButton.onclick=()=>{
        if(!notificationNoButton.disabled)hideModal();
    };

    notificationCancelButton.onclick=()=>{
        if(!notificationCancelButton.disabled)closeModal();
    };

    notificationOverlay.hidden=false;

    notificationButton.focus();
}

function showConfirmationModal({
    title,
    message,
    icon="?",
    onConfirm
}){
    notificationCard.className="notification-card confirm";
    notificationIcon.textContent=icon;
    notificationTitle.textContent=title;
    notificationText.textContent=message;

    modalCloseAction=null;

    notificationButton.textContent="Yes";
    notificationButton.disabled=false;
    notificationButton.hidden=false;

    notificationNoButton.textContent="No";
    notificationNoButton.hidden=false;
    notificationNoButton.disabled=false;

    notificationCancelButton.hidden=true;
    notificationCancelButton.disabled=false;

    notificationButton.onclick=async()=>{
        if(notificationButton.disabled)return;

        notificationButton.disabled=true;
        notificationNoButton.disabled=true;
        notificationButton.textContent="Connecting...";

        modalCloseAction=null;

        await onConfirm();
    };

    notificationNoButton.onclick=()=>{
        if(isUpdatingProfile||isLoggingOut)return;
        hideModal();
    };

    notificationOverlay.hidden=false;

    notificationButton.focus();
}

function hideModal(){
    notificationOverlay.hidden=true;

    modalCloseAction=null;

    notificationButton.onclick=null;
    notificationNoButton.onclick=null;
    notificationCancelButton.onclick=null;

    notificationButton.textContent="Continue";
    notificationButton.disabled=false;
    notificationButton.hidden=false;

    notificationNoButton.textContent="No";
    notificationNoButton.disabled=false;
    notificationNoButton.hidden=true;

    notificationCancelButton.disabled=false;
    notificationCancelButton.hidden=false;
}

function closeModal(){
    const action=modalCloseAction;

    hideModal();

    if(typeof action==="function")action();
}

/* 9. AUTHENTICATION */
function redirectToAuthentication(){
    window.location.href="../worker-authentication/index.html";
}

function showAuthenticationError(message){
    showModal({
        type:"error",
        title:"Authentication Required",
        message:message||"Your session has expired. Please log in again.",
        icon:"!",
        onClose:redirectToAuthentication
    });
}

/* 10. BACKEND RESPONSE */
async function getResponseData(response){
    try{
        return await response.json();
    }catch(error){
        return {};
    }
}

function getBackendMessage(data,fallback){
    return data.message||data.error||fallback;
}

/* 11. PHONE */
function normalizePhone(phone){
    let value=String(phone||"").trim().replace(/[\s()-]/g,"");

    if(value.startsWith("+234"))value="234"+value.slice(4);
    else if(value.startsWith("234"))value="234"+value.slice(3);
    else if(value.startsWith("0"))value="234"+value.slice(1);

    return value;
}

function isValidPhone(phone){
    return /^234[789]\d{9}$/.test(phone);
}

/* 12. PHOTO */
function validatePhoto(file){
    if(!file)return null;
    if(file.size>5*1024*1024)return"Profile photo must not be more than 5 MB.";
    if(!file.type.startsWith("image/"))return"Please select a valid image file.";
    return null;
}

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

/* 13. DISPLAY WORKER */
function displayWorkerData(worker){
    currentWorker=worker;

    fullNameInput.value=worker.fullName||"";
    phoneInput.value=worker.phone||"";
    countryInput.value=worker.country||"";

    populateStates(worker.state||"");

    if(worker.state){
        populateStateLocations(worker.city||"",worker.lga||"");
    }

    displayProfilePhoto(worker.profilePhoto);
}

function extractWorkerData(data){
    return data.worker||data.data||data;
}

/* 14. LOAD PROFILE */
async function loadProfile(){
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

/* 15. FULL NAME */
function normalizeNamePart(name){
    return name.toLowerCase().split(/([-'])/).map(part=>{
        if(part==="-"||part==="'")return part;
        return part.charAt(0).toUpperCase()+part.slice(1);
    }).join("");
}

function normalizeFullName(value){
    const fullName=String(value||"").trim().replace(/\s+/g," "),
    nameParts=fullName.split(" ");

    if(nameParts.length!==2)return null;

    const namePattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

    if(!namePattern.test(nameParts[0])||!namePattern.test(nameParts[1]))return null;

    return nameParts.map(normalizeNamePart).join(" ");
}

/* 16. VALIDATION */
function validateProfile(){
    const normalizedFullName=normalizeFullName(fullNameInput.value),
    phone=normalizePhone(phoneInput.value),
    photo=profilePhotoInput.files[0],
    photoError=validatePhoto(photo);

    if(photoError){
        showModal({type:"error",title:"Invalid Photo",message:photoError,icon:"!"});
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

    fullNameInput.value=normalizedFullName;

    if(!phone){
        showModal({type:"error",title:"Phone Number Required",message:"Please enter your phone number.",icon:"!"});
        return null;
    }

    if(!isValidPhone(phone)){
        showModal({type:"error",title:"Invalid Phone Number",message:"Please enter a valid Nigerian phone number.",icon:"!"});
        return null;
    }

    if(!countryInput.value){
        showModal({type:"error",title:"Country Required",message:"Please select your country.",icon:"!"});
        return null;
    }

    if(!stateInput.value){
        showModal({type:"error",title:"State Required",message:"Please select your state.",icon:"!"});
        return null;
    }

    if(!cityInput.value){
        showModal({type:"error",title:"City Required",message:"Please select your city.",icon:"!"});
        return null;
    }

    if(!lgaInput.value){
        showModal({type:"error",title:"LGA Required",message:"Please select your LGA.",icon:"!"});
        return null;
    }

    return{fullName:normalizedFullName,phone};
}

/* 17. UPDATE PROFILE CONFIRMATION */
function confirmProfileUpdate(){
    if(isUpdatingProfile)return;

    const validated=validateProfile();

    if(!validated)return;

    showConfirmationModal({
        title:"Confirm Profile Update",
        message:"Are you sure you want to update your profile?",
        icon:"?",
        onConfirm:updateProfile
    });
}

/* 18. UPDATE PROFILE */
async function updateProfile(){
    if(isUpdatingProfile)return;

    const validated=validateProfile();

    if(!validated){
        hideModal();
        return;
    }

    const formData=new FormData(profileForm);

    formData.set("fullName",validated.fullName);
    formData.set("phone",validated.phone);
    formData.set("country",countryInput.value);
    formData.set("state",stateInput.value);
    formData.set("city",cityInput.value);
    formData.set("lga",lgaInput.value);

    isUpdatingProfile=true;
    setUpdateLoading(true);

    try{
        const response=await API_REQUEST(PROFILE_ENDPOINT,{method:"PUT",body:formData});

        if(response.status===401){
            hideModal();
            showAuthenticationError("Your login session has expired. Please log in again.");
            return;
        }

        const data=await getResponseData(response);

        if(!response.ok){
            hideModal();

            showModal({
                type:"error",
                title:"Update Failed",
                message:getBackendMessage(data,"Your profile could not be updated."),
                icon:"!"
            });
            return;
        }

        if(data.worker){
            displayWorkerData(data.worker);
        }else{
            await loadProfile();
        }

        profilePhotoInput.value="";

        if(photoFileName){
            photoFileName.textContent="No new photo selected";
        }

        hideModal();

        showModal({
            type:"success",
            title:"Profile Updated",
            message:data.message||"Your profile has been updated successfully.",
            icon:"✓"
        });

    }catch(error){
        console.error("Update profile error:",error);

        hideModal();

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

/* 19. PHOTO PREVIEW */
profilePhotoInput.addEventListener("change",()=>{
    const file=profilePhotoInput.files[0];

    if(!file){
        if(photoFileName)photoFileName.textContent="No new photo selected";
        return;
    }

    const error=validatePhoto(file);

    if(error){
        profilePhotoInput.value="";

        if(photoFileName)photoFileName.textContent="No new photo selected";

        showModal({
            type:"error",
            title:"Invalid Photo",
            message:error,
            icon:"!"
        });

        return;
    }

    if(photoFileName)photoFileName.textContent=file.name;

    profilePhoto.src=URL.createObjectURL(file);
    profilePhoto.hidden=false;
    profilePhotoPlaceholder.hidden=true;
});

/* 20. FORM SUBMISSION */
profileForm.addEventListener("submit",event=>{
    event.preventDefault();
    confirmProfileUpdate();
});

/* 21. NAVIGATION */
editProfileBtn.addEventListener("click",closeMobileMenu);

cancelBtn.addEventListener("click",()=>{
    window.location.href="../worker-dashboard/index.html";
});

viewServicesBtn.addEventListener("click",()=>{
    window.location.href="../worker-services/index.html";
});

/* 22. MOBILE SIDEBAR */
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

/* 23. LOGOUT */
logoutBtn.addEventListener("click",()=>{
    if(isLoggingOut)return;

    showConfirmationModal({
        title:"Logout",
        message:"Are you sure you want to log out?",
        icon:"?",
        onConfirm:logoutUser
    });
});

async function logoutUser(){
    if(isLoggingOut)return;

    isLoggingOut=true;
    logoutBtn.disabled=true;
    logoutBtn.classList.add("is-loading");

    try{
        const response=await API_REQUEST(LOGOUT_ENDPOINT,{method:"POST"});

        const data=await getResponseData(response);

        if(response.status===401){
            hideModal();

            showAuthenticationError("Your login session has expired. Please log in again.");
            return;
        }

        if(!response.ok){
            hideModal();

            showModal({
                type:"error",
                title:"Logout Failed",
                message:getBackendMessage(data,"Unable to log out. Please try again."),
                icon:"!"
            });
            return;
        }

        window.location.href="../worker-authentication/index.html";

    }catch(error){
        console.error("Logout error:",error);

        hideModal();

        showModal({
            type:"error",
            title:"Connection Error",
            message:"Unable to connect to the server. Please try again.",
            icon:"!"
        });

    }finally{
        isLoggingOut=false;
        logoutBtn.disabled=false;
        logoutBtn.classList.remove("is-loading");
    }
}

/* 24. SESSION EXPIRATION */
window.addEventListener("authSessionExpired",()=>{
    hideModal();

    showAuthenticationError("Your login session has expired. Please log in again.");
});

/* 25. INITIALIZE PAGE */
document.addEventListener("DOMContentLoaded",loadProfile);