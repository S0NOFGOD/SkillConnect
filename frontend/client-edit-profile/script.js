"use strict";

const NIGERIAN_LOCATION_SCRIPT="../worker-create-profile/nigeria-location.js";

const $=id=>document.getElementById(id);

const editProfilePage=$("editProfilePage"),
profileForm=$("profileForm"),
profilePhotoInput=$("profilePhotoInput"),
profilePhoto=$("profilePhoto"),
profilePhotoPlaceholder=$("profilePhotoPlaceholder"),
sidebarProfilePhoto=$("sidebarProfilePhoto"),
sidebarProfilePhotoPlaceholder=$("sidebarProfilePhotoPlaceholder"),
photoFileName=$("photoFileName"),
fullNameInput=$("fullName"),
phoneInput=$("phone"),
countryInput=$("country"),
stateInput=$("state"),
cityInput=$("city"),
lgaInput=$("lga"),
updateProfileBtn=$("updateProfileBtn"),
buttonText=updateProfileBtn.querySelector(".button-text"),
buttonLoader=updateProfileBtn.querySelector(".button-loader"),
cancelBtn=$("cancelBtn"),
findWorkersBtn=$("findWorkersBtn"),
editProfileBtn=$("editProfileBtn"),
logoutBtn=$("logoutBtn"),
menuBtn=$("menuBtn"),
closeMenuBtn=$("closeMenuBtn"),
sidebar=$("sidebar"),
overlay=$("overlay");

const notificationOverlay=$("notificationOverlay"),
notificationCard=$("notificationCard"),
notificationIcon=$("notificationIcon"),
notificationTitle=$("notificationTitle"),
notificationText=$("notificationText"),
notificationButton=$("notificationButton"),
notificationCancelButtonMobile=$("notificationCancelButtonMobile");

const PROFILE_ENDPOINT="/api/client/edit-profile",
LOGOUT_ENDPOINT="/api/auth/logout";

let currentClient=null,notificationAction=null,isUpdatingProfile=false,isLoggingOut=false;

function setUpdateLoading(loading){
    updateProfileBtn.disabled=loading;
    cancelBtn.disabled=loading;
    buttonLoader.hidden=!loading;
    buttonText.textContent=loading?"Updating...":"Update Profile";
}

function setPageLoading(loading){
    editProfilePage.setAttribute("aria-busy",loading?"true":"false");
    profileForm.style.opacity=loading?".55":"1";
    profileForm.style.pointerEvents=loading?"none":"auto";
}

/* Sidebar */
function openMobileMenu(){
    sidebar.classList.add("active");
    overlay.classList.add("active");
    menuBtn.setAttribute("aria-expanded","true");
    overlay.setAttribute("aria-hidden","false");
}

function closeMobileMenu(){
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    menuBtn.setAttribute("aria-expanded","false");
    overlay.setAttribute("aria-hidden","true");
}

menuBtn.addEventListener("click",()=>{
    sidebar.classList.contains("active")?closeMobileMenu():openMobileMenu();
});
closeMenuBtn.addEventListener("click",closeMobileMenu);
overlay.addEventListener("click",closeMobileMenu);
document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
        closeMobileMenu();
        if(!notificationOverlay.hidden){
            notificationOverlay.hidden=true;
            notificationAction=null;
            resetNotificationButtons();
        }
    }
});

/* Location dropdowns */
function resetLocationFields(){
    stateInput.innerHTML='<option value="">Select State</option>';
    cityInput.innerHTML='<option value="">Select City</option>';
    lgaInput.innerHTML='<option value="">Select LGA</option>';
    stateInput.disabled=cityInput.disabled=lgaInput.disabled=true;
}

function populateStates(selectedState=""){
    stateInput.innerHTML='<option value="">Select State</option>';
    cityInput.innerHTML='<option value="">Select City</option>';
    lgaInput.innerHTML='<option value="">Select LGA</option>';
    cityInput.disabled=lgaInput.disabled=true;

    if(countryInput.value!=="Nigeria"){
        stateInput.disabled=true;
        return;
    }

    getNigeriaStates().forEach(state=>{
        const option=document.createElement("option");
        option.value=option.textContent=state;
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
    cityInput.disabled=lgaInput.disabled=true;
    if(!stateInput.value)return;

    getCitiesByState(stateInput.value).forEach(city=>{
        const option=document.createElement("option");
        option.value=option.textContent=city;
        cityInput.appendChild(option);
    });

    getLGAsByState(stateInput.value).forEach(lga=>{
        const option=document.createElement("option");
        option.value=option.textContent=lga;
        lgaInput.appendChild(option);
    });

    cityInput.disabled=lgaInput.disabled=false;
    if(selectedCity)cityInput.value=selectedCity;
    if(selectedLga)lgaInput.value=selectedLga;
}

countryInput.addEventListener("change",()=>populateStates());
stateInput.addEventListener("change",()=>populateStateLocations());

/* Notifications */
function resetNotificationButtons(){
    notificationButton.disabled=notificationCancelButtonMobile.disabled=false;
    notificationButton.textContent="Continue";
    notificationCancelButtonMobile.textContent="No";
    notificationButton.onclick=null;
    notificationCancelButtonMobile.onclick=null;
}

function showModal({type="info",title="Notification",message="",icon="i",action=null}={}){
    notificationCard.className=`notification-card ${type}`;
    notificationIcon.textContent=icon;
    notificationTitle.textContent=title;
    notificationText.textContent=message;
    notificationAction=action;
    resetNotificationButtons();
    notificationOverlay.hidden=false;
    notificationButton.focus();
}

function closeModal(){
    notificationOverlay.hidden=true;
    const action=notificationAction;
    notificationAction=null;
    resetNotificationButtons();
    if(typeof action==="function")action();
}

notificationButton.addEventListener("click",()=>{
    if(typeof notificationButton.onclick==="function")return;
    closeModal();
});

notificationCancelButtonMobile.addEventListener("click",()=>{
    notificationOverlay.hidden=true;
    notificationAction=null;
    resetNotificationButtons();
});

function redirectToAuthentication(){
    window.location.href="../client-authentication/index.html";
}

function showAuthenticationError(message){
    showModal({
        type:"error",
        title:"Authentication Required",
        message:message||"Your session has expired. Please log in again.",
        icon:"!",
        action:redirectToAuthentication
    });
}

/* Response helpers */
async function getResponseData(response){
    try{return await response.json()}catch{return {}}
}

function getBackendMessage(data,fallback){
    return data.message||data.error||fallback;
}

/* Phone validation */
function normalizePhone(phone){
    let value=String(phone||"").trim().replace(/[\s()-]/g,"");
    if(value.startsWith("+234"))value="234"+value.slice(4);
    else if(value.startsWith("0"))value="234"+value.slice(1);
    return value;
}

function isValidPhone(phone){
    return /^234[789]\d{9}$/.test(phone);
}

/* Profile photos */
function validatePhoto(file){
    if(!file)return null;
    if(file.size>5*1024*1024)return "Profile photo must not be more than 5 MB.";
    if(!file.type.startsWith("image/"))return "Please select a valid image file.";
    return null;
}

function setPhoto(image,placeholder,url){
    image.onload=null;
    image.onerror=null;
    image.hidden=true;
    placeholder.hidden=false;

    if(typeof url!=="string"||!url.trim()){
        image.removeAttribute("src");
        return;
    }

    image.onload=()=>{
        image.hidden=false;
        placeholder.hidden=true;
    };

    image.onerror=()=>{
        image.hidden=true;
        image.removeAttribute("src");
        placeholder.hidden=false;
    };

    image.src=url.trim();
}

function displayProfilePhoto(photoUrl){
    setPhoto(profilePhoto,profilePhotoPlaceholder,photoUrl);
    setPhoto(sidebarProfilePhoto,sidebarProfilePhotoPlaceholder,photoUrl);
}

function displayClientData(client){
    currentClient=client;
    fullNameInput.value=client.fullName||"";
    phoneInput.value=client.phone||"";
    countryInput.value=client.country||"";
    populateStates(client.state||"");

    if(client.state)populateStateLocations(client.city||"",client.lga||"");
    displayProfilePhoto(client.profilePhoto);
}

function extractClientData(data){
    return data.client||data.data||data;
}

/* Load profile */
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

        const client=extractClientData(data);

        if(!client){
            showModal({
                type:"error",
                title:"Profile Error",
                message:"Client profile data was not returned by the server.",
                icon:"!"
            });
            return;
        }

        displayClientData(client);
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

/* Full-name validation */
function normalizeNamePart(name){
    return name.toLowerCase().split(/([-'])/).map(part=>{
        if(part==="-"||part==="'")return part;
        return part.charAt(0).toUpperCase()+part.slice(1);
    }).join("");
}

function normalizeFullName(value){
    const nameParts=String(value||"").trim().replace(/\s+/g," ").split(" ");
    if(nameParts.length!==2)return null;

    const pattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;
    if(!pattern.test(nameParts[0])||!pattern.test(nameParts[1]))return null;

    return nameParts.map(normalizeNamePart).join(" ");
}

/* Profile validation */
function validateProfile(){
    const normalizedFullName=normalizeFullName(fullNameInput.value);
    const phone=normalizePhone(phoneInput.value);
    const photoError=validatePhoto(profilePhotoInput.files[0]);

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

    const requiredFields=[
        [countryInput,"Country Required","Please select your country."],
        [stateInput,"State Required","Please select your state."],
        [cityInput,"City Required","Please select your city."],
        [lgaInput,"LGA Required","Please select your LGA."]
    ];

    for(const [field,title,message] of requiredFields){
        if(!field.value){
            showModal({type:"error",title,message,icon:"!"});
            return null;
        }
    }

    return {fullName:normalizedFullName,phone};
}

/* Update profile */
async function updateProfile(){
    if(isUpdatingProfile)return;

    const validated=validateProfile();
    if(!validated)return;

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

        showModal({
            type:"success",
            title:"Profile Updated",
            message:data.message||"Your profile has been updated successfully.",
            icon:"✓",
            action:()=>window.location.reload()
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

/* Profile photo selection */
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
        showModal({type:"error",title:"Invalid Photo",message:error,icon:"!"});
        return;
    }

    if(photoFileName)photoFileName.textContent=file.name;

    const previewUrl=URL.createObjectURL(file);
    profilePhoto.src=previewUrl;
    profilePhoto.hidden=false;
    profilePhotoPlaceholder.hidden=true;
    sidebarProfilePhoto.src=previewUrl;
    sidebarProfilePhoto.hidden=false;
    sidebarProfilePhotoPlaceholder.hidden=true;
});

profileForm.addEventListener("submit",event=>{
    event.preventDefault();
    updateProfile();
});

/* Navigation */
findWorkersBtn.addEventListener("click",()=>{
    closeMobileMenu();
    window.location.href="../client-workers-search/index.html";
});

editProfileBtn.addEventListener("click",closeMobileMenu);

cancelBtn.addEventListener("click",()=>{
    window.location.href="../client-dashboard/index.html";
});

/* Logout */
logoutBtn.addEventListener("click",()=>{
    closeMobileMenu();
    if(isLoggingOut)return;

    showModal({
        type:"confirm",
        title:"Logout",
        message:"Are you sure you want to logout?",
        icon:"?"
    });

    notificationButton.textContent="Yes";
    notificationCancelButtonMobile.textContent="No";

    notificationButton.onclick=async()=>{
        if(isLoggingOut)return;

        isLoggingOut=true;
        notificationButton.disabled=true;
        notificationCancelButtonMobile.disabled=true;
        notificationButton.textContent="Connecting…";

        try{
            const response=await API_REQUEST(LOGOUT_ENDPOINT,{method:"POST"});

            if(!response.ok){
                const data=await getResponseData(response);
                isLoggingOut=false;
                showModal({
                    type:"error",
                    title:"Logout Error",
                    message:getBackendMessage(data,"Logout failed. Please try again."),
                    icon:"!"
                });
                return;
            }

            window.location.href="../client-authentication/index.html";
        }catch(error){
            console.error("Logout error:",error);
            isLoggingOut=false;
            showModal({
                type:"error",
                title:"Connection Error",
                message:"Unable to connect to the server. Please try again.",
                icon:"!"
            });
        }
    };

    notificationCancelButtonMobile.onclick=()=>{
        notificationOverlay.hidden=true;
        notificationAction=null;
        isLoggingOut=false;
        resetNotificationButtons();
    };
});

/* Session expiry */
window.addEventListener("authSessionExpired",()=>{
    if(isLoggingOut||isUpdatingProfile)return;
    showAuthenticationError("Your session has expired. Please log in again.");
});

/* Initial load */
loadProfile();