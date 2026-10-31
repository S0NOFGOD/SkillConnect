"use strict";

/* 1. ELEMENTS */
const $=id=>document.getElementById(id);

const editProfilePage=$("editProfilePage"),connectionStatus=$("connectionStatus"),profileContent=$("profileContent"),profileForm=$("profileForm");
const profilePhotoInput=$("profilePhotoInput"),formProfilePhoto=$("formProfilePhoto"),formProfilePhotoPlaceholder=$("formProfilePhotoPlaceholder");
const sidebarProfilePhoto=$("sidebarProfilePhoto"),sidebarProfilePhotoPlaceholder=$("sidebarProfilePhotoPlaceholder"),photoFileName=$("photoFileName");
const fullNameInput=$("fullName"),phoneInput=$("phone"),latitudeInput=$("latitude"),longitudeInput=$("longitude");
const getLocationBtn=$("getLocationBtn"),locationStatus=$("locationStatus");
const updateProfileBtn=$("updateProfileBtn"),buttonText=updateProfileBtn.querySelector(".button-text"),cancelBtn=$("cancelBtn");
const dashboardBtn=$("dashboardBtn"),viewServicesBtn=$("viewServicesBtn"),editProfileBtn=$("editProfileBtn"),logoutBtn=$("logoutBtn");
const menuBtn=$("menuBtn"),closeMenuBtn=$("closeMenuBtn"),sidebar=$("sidebar"),overlay=$("overlay");

const notificationOverlay=$("notificationOverlay"),notificationCard=$("notificationCard"),notificationIcon=$("notificationIcon");
const notificationTitle=$("notificationTitle"),notificationText=$("notificationText"),notificationButton=$("notificationButton");
const notificationCancelButton=$("notificationCancelButton"),notificationNoButton=$("notificationNoButton");

/* 2. ENDPOINTS */
const PROFILE_ENDPOINT="/api/worker/edit-profile",LOGOUT_ENDPOINT="/api/auth/logout";

/* 3. STATE */
let currentWorker=null,modalCloseAction=null,isUpdatingProfile=false,isLoggingOut=false,isGettingLocation=false;

/* 4. LOADING STATES */
function setPageLoading(loading){
    editProfilePage.setAttribute("aria-busy",String(loading));
    connectionStatus.hidden=!loading;
    profileContent.hidden=loading;
}

function setUpdateLoading(loading){
    updateProfileBtn.disabled=cancelBtn.disabled=loading;
    buttonText.textContent=loading?"Updating...":"Update Profile";
}

function setLocationLoading(loading){
    getLocationBtn.disabled=loading;
    getLocationBtn.textContent=loading?"Getting...":"Get My Location";
}

/* 5. NOTIFICATION MODAL */
function showModal({
    type="success",title="Notification",message="",icon="✓",onClose=null,buttonText:label="Continue"
}={}){
    notificationCard.className=`notification-card ${type}`;
    notificationIcon.textContent=icon;
    notificationTitle.textContent=title;
    notificationText.textContent=message;
    modalCloseAction=onClose;

    notificationButton.textContent=label;
    notificationButton.disabled=false;
    notificationButton.hidden=false;
    notificationNoButton.hidden=true;
    notificationNoButton.disabled=false;
    notificationCancelButton.hidden=false;
    notificationCancelButton.disabled=false;

    notificationButton.onclick=()=>{if(!notificationButton.disabled)closeModal();};
    notificationCancelButton.onclick=()=>{if(!notificationCancelButton.disabled)closeModal();};
    notificationNoButton.onclick=null;

    notificationOverlay.hidden=false;
    notificationButton.focus();
}

function showConfirmationModal({title,message,icon="?",onConfirm}){
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

    notificationButton.onclick=async()=>{
        if(notificationButton.disabled)return;
        notificationButton.disabled=notificationNoButton.disabled=true;
        notificationButton.textContent="Logging Out...";
        await onConfirm();
    };

    notificationNoButton.onclick=()=>{if(!isLoggingOut)hideModal();};

    notificationOverlay.hidden=false;
    notificationButton.focus();
}

function hideModal(){
    notificationOverlay.hidden=true;
    modalCloseAction=null;
    notificationButton.onclick=notificationNoButton.onclick=notificationCancelButton.onclick=null;

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

/* 6. AUTHENTICATION */
function redirectToAuthentication(){
    window.location.href="../worker-authentication/index.html";
}

function showAuthenticationError(message="Your login session has expired. Please log in again."){
    showModal({type:"error",title:"Authentication Required",message,icon:"!",onClose:redirectToAuthentication});
}

function handleUnauthorized(){
    setPageLoading(false);
    setUpdateLoading(false);
    showAuthenticationError();
}

/* 7. BACKEND RESPONSE */
async function getResponseData(response){
    try{return await response.json();}
    catch{return {};}
}

function getBackendMessage(data,fallback){
    return data.message||data.error||fallback;
}

/* 8. PHONE */
function normalizePhone(phone){
    let value=String(phone||"").trim().replace(/[\s()-]/g,"");
    if(value.startsWith("+234"))value="0"+value.slice(4);
    else if(value.startsWith("234"))value="0"+value.slice(3);
    return value;
}

function isValidPhone(phone){
    return /^0[789]\d{9}$/.test(phone);
}

/* 9. FULL NAME */
function normalizeNamePart(name){
    return name.toLowerCase().split(/([-'])/).map(part=>{
        if(part==="-"||part==="'")return part;
        return part.charAt(0).toUpperCase()+part.slice(1);
    }).join("");
}

function normalizeFullName(value){
    const parts=String(value||"").trim().replace(/\s+/g," ").split(" ");
    const pattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;
    if(parts.length!==2||!parts.every(part=>pattern.test(part)))return null;
    return parts.map(normalizeNamePart).join(" ");
}

/* 10. PHOTO */
function validatePhoto(file){
    if(!file)return null;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type))return "Profile photo must be a JPG, PNG, or WebP image.";
    if(file.size>10*1024*1024)return "Profile photo must not exceed 10 MB.";
    return null;
}

function setPhoto(image,placeholder,url){
    if(!image)return;

    image.onerror=()=>{
        image.removeAttribute("src");
        image.hidden=true;
        if(placeholder)placeholder.hidden=false;
    };

    image.onload=()=>{
        image.hidden=false;
        if(placeholder)placeholder.hidden=true;
    };

    if(url){
        image.hidden=false;
        image.src=url;
        if(placeholder)placeholder.hidden=true;
    }else{
        image.removeAttribute("src");
        image.hidden=true;
        if(placeholder)placeholder.hidden=false;
    }
}

function displayProfilePhoto(photoUrl){
    setPhoto(formProfilePhoto,formProfilePhotoPlaceholder,photoUrl);
    setPhoto(sidebarProfilePhoto,sidebarProfilePhotoPlaceholder,photoUrl);
}

/* 11. WORKER DATA */
function displayWorkerData(worker){
    currentWorker=worker;
    fullNameInput.value=worker.fullName||"";
    phoneInput.value=worker.phone||"";
    latitudeInput.value=worker.latitude??"";
    longitudeInput.value=worker.longitude??"";
    displayProfilePhoto(worker.profilePhoto);
}

function extractWorkerData(data){
    return data.worker||data.data||null;
}

/* 12. LOAD PROFILE */
async function loadProfile(){
    setPageLoading(true);

    try{
        const response=await API_REQUEST(PROFILE_ENDPOINT,{method:"GET"});

        if(response.status===401){
            handleUnauthorized();
            return;
        }

        const data=await getResponseData(response);

        if(!response.ok){
            setPageLoading(false);
            showModal({
                type:"error",title:"Unable to Load Profile",
                message:getBackendMessage(data,"We could not load your profile. Please try again."),icon:"!"
            });
            return;
        }

        const worker=extractWorkerData(data);

        if(!worker){
            setPageLoading(false);
            showModal({
                type:"error",title:"Profile Error",
                message:"Worker profile data was not returned by the server.",icon:"!"
            });
            return;
        }

        displayWorkerData(worker);
        setPageLoading(false);

    }catch(error){
        console.error("Load profile error:",error);
        setPageLoading(false);
        showModal({
            type:"error",title:"Connection Error",
            message:"Unable to connect to the server. Please try again.",icon:"!"
        });
    }
}

/* 13. GET MY LOCATION */
function getMyLocation(){
    if(isGettingLocation)return;

    if(!navigator.geolocation){
        showModal({
            type:"error",title:"Location Unavailable",
            message:"Your browser does not support location services.",icon:"!"
        });
        return;
    }

    isGettingLocation=true;
    setLocationLoading(true);
    locationStatus.textContent="";

    navigator.geolocation.getCurrentPosition(
        position=>{
            latitudeInput.value=position.coords.latitude;
            longitudeInput.value=position.coords.longitude;
            locationStatus.textContent="Location retrieved successfully.";
            isGettingLocation=false;
            setLocationLoading(false);
        },
        error=>{
            isGettingLocation=false;
            setLocationLoading(false);

            const messages={
                1:"Location permission was denied. Please allow location access.",
                2:"Your location is currently unavailable. Please try again.",
                3:"Location request timed out. Please try again."
            };

            showModal({
                type:"error",title:"Unable to Get Location",
                message:messages[error.code]||"Unable to retrieve your location.",icon:"!"
            });
        },
        {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
}

getLocationBtn.addEventListener("click",getMyLocation);

/* 14. FRONTEND VALIDATION */
function validateProfile(){
    const fullName=normalizeFullName(fullNameInput.value);
    const phone=normalizePhone(phoneInput.value);
    const latitude=Number(latitudeInput.value);
    const longitude=Number(longitudeInput.value);
    const photoError=validatePhoto(profilePhotoInput.files[0]);

    if(photoError){
        showModal({type:"error",title:"Invalid Photo",message:photoError,icon:"!"});
        return null;
    }

    if(!fullName){
        showModal({
            type:"error",title:"Invalid Full Name",
            message:"Please enter exactly two names with a space between them, for example: Destiny Okpone.",icon:"!"
        });
        return null;
    }

    if(!phone){
        showModal({type:"error",title:"Phone Number Required",message:"Please enter your phone number.",icon:"!"});
        return null;
    }

    if(!isValidPhone(phone)){
        showModal({type:"error",title:"Invalid Phone Number",message:"Please enter a valid Nigerian phone number.",icon:"!"});
        return null;
    }

    if(!latitudeInput.value.trim()||!Number.isFinite(latitude)||latitude<-90||latitude>90){
        showModal({
            type:"error",title:"Invalid Latitude",
            message:"Please use Get My Location to retrieve a valid latitude.",icon:"!"
        });
        return null;
    }

    if(!longitudeInput.value.trim()||!Number.isFinite(longitude)||longitude<-180||longitude>180){
        showModal({
            type:"error",title:"Invalid Longitude",
            message:"Please use Get My Location to retrieve a valid longitude.",icon:"!"
        });
        return null;
    }

    fullNameInput.value=fullName;
    return {fullName,phone,latitude,longitude};
}

/* 15. UPDATE PROFILE */
async function updateProfile(){
    if(isUpdatingProfile)return;

    const validated=validateProfile();
    if(!validated)return;

    const formData=new FormData();
    formData.append("fullName",validated.fullName);
    formData.append("phone",validated.phone);
    formData.append("latitude",String(validated.latitude));
    formData.append("longitude",String(validated.longitude));

    const photo=profilePhotoInput.files[0];
    if(photo)formData.append("profilePhoto",photo);

    isUpdatingProfile=true;
    setUpdateLoading(true);

    try{
        const response=await API_REQUEST(PROFILE_ENDPOINT,{method:"PUT",body:formData});
        const data=await getResponseData(response);

        if(response.status===401){
            isUpdatingProfile=false;
            setUpdateLoading(false);
            handleUnauthorized();
            return;
        }

        if(!response.ok){
            showModal({
                type:"error",title:"Update Failed",
                message:getBackendMessage(data,"Your profile could not be updated."),icon:"!"
            });
            return;
        }

        if(data.worker)displayWorkerData(data.worker);

        profilePhotoInput.value="";
        photoFileName.textContent="No new photo selected";

        showModal({
            type:"success",title:"Profile Updated",
            message:data.message||"Your profile has been updated successfully.",
            icon:"✓",onClose:()=>window.location.reload()
        });

    }catch(error){
        console.error("Update profile error:",error);
        showModal({
            type:"error",title:"Connection Error",
            message:"Unable to update your profile. Please try again.",icon:"!"
        });
    }finally{
        isUpdatingProfile=false;
        setUpdateLoading(false);
    }
}

/* 16. PHOTO PREVIEW */
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
    setPhoto(formProfilePhoto,formProfilePhotoPlaceholder,URL.createObjectURL(file));
});

/* 17. FORM SUBMISSION */
profileForm.addEventListener("submit",event=>{
    event.preventDefault();
    updateProfile();
});

/* 18. NAVIGATION */
dashboardBtn.addEventListener("click",()=>window.location.href="../worker-dashboard/index.html");
viewServicesBtn.addEventListener("click",()=>window.location.href="../worker-services/index.html");
editProfileBtn.addEventListener("click",closeMobileMenu);
cancelBtn.addEventListener("click",()=>window.location.href="../worker-dashboard/index.html");

/* 19. MOBILE SIDEBAR */
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

/* 20. LOGOUT */
logoutBtn.addEventListener("click",()=>{
    if(isLoggingOut)return;
    showConfirmationModal({
        title:"Logout",message:"Are you sure you want to log out?",icon:"?",onConfirm:logoutUser
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
            handleUnauthorized();
            return;
        }

        if(!response.ok){
            hideModal();
            showModal({
                type:"error",title:"Logout Failed",
                message:getBackendMessage(data,"Unable to log out. Please try again."),icon:"!"
            });
            return;
        }

        window.location.href="../worker-authentication/index.html";

    }catch(error){
        console.error("Logout error:",error);
        hideModal();
        showModal({
            type:"error",title:"Connection Error",
            message:"Unable to connect to the server. Please try again.",icon:"!"
        });
    }finally{
        isLoggingOut=false;
        logoutBtn.disabled=false;
        logoutBtn.classList.remove("is-loading");
    }
}

/* 21. SESSION EXPIRATION */
window.addEventListener("authSessionExpired",()=>{
    setPageLoading(false);
    setUpdateLoading(false);
    hideModal();
    handleUnauthorized();
});

/* 22. INITIALIZE */
document.addEventListener("DOMContentLoaded",loadProfile);