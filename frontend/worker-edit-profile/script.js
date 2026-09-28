/* =========================================================
   WORKER EDIT PROFILE SCRIPT
   config.js loads before this file.
========================================================= */

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
latitudeInput=document.getElementById("latitude"),
longitudeInput=document.getElementById("longitude"),
locationInput=document.getElementById("location"),
getLocationBtn=document.getElementById("getLocationBtn"),
locationButtonText=getLocationBtn.querySelector(".location-button-text"),
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

/* 2. NOTIFICATION MODAL */
const notificationOverlay=document.getElementById("notificationOverlay"),
notificationCard=document.getElementById("notificationCard"),
notificationIcon=document.getElementById("notificationIcon"),
notificationTitle=document.getElementById("notificationTitle"),
notificationText=document.getElementById("notificationText"),
notificationButton=document.getElementById("notificationButton"),
notificationCancelButton=document.getElementById("notificationCancelButton");

/* 3. API ENDPOINTS */
const PROFILE_ENDPOINT="/api/worker/edit-profile",
LOGOUT_ENDPOINT="/api/auth/worker/logout";

/* 4. PAGE STATE */
let currentWorker=null,modalCloseAction=null,isUpdatingProfile=false,isLoggingOut=false;

/* 5. UPDATE LOADING */
function setUpdateLoading(loading){
    updateProfileBtn.disabled=loading;
    cancelBtn.disabled=loading;
    buttonLoader.hidden=!loading;
    buttonText.textContent=loading?"Updating...":"Update Profile";
}

/* 6. PAGE LOADING */
function setPageLoading(loading){
    editProfilePage.setAttribute("aria-busy",loading?"true":"false");
    profileForm.style.opacity=loading?".55":"1";
    profileForm.style.pointerEvents=loading?"none":"auto";
}

/* 7. LOCATION LOADING */
function setLocationLoading(loading){
    getLocationBtn.disabled=loading;
    getLocationBtn.classList.toggle("loading",loading);
    locationButtonText.textContent=loading?"Getting Location...":"Get My Location";
}

/* 8. MODAL */
function showModal({type="success",title="Notification",message="",icon="✓",onClose=null}={}){
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
    notificationButton.onclick=()=>{if(!notificationButton.disabled)closeModal()};
    notificationCancelButton.onclick=()=>{if(!notificationCancelButton.disabled)closeModal()};
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
    if(typeof action==="function")action();
}

/* 9. AUTHENTICATION */
function redirectToAuthentication(){
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

/* 10. BACKEND RESPONSE */
async function getResponseData(response){
    try{return await response.json()}catch(error){return {}}
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
    stateInput.value=worker.state||"";
    cityInput.value=worker.city||"";
    lgaInput.value=worker.lga||"";
    latitudeInput.value=worker.latitude||"";
    longitudeInput.value=worker.longitude||"";
    locationInput.value=worker.lga&&worker.city?`${worker.lga}, ${worker.city}`:worker.location||"";
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
    const fullName=String(value||"").trim().replace(/\s+/g," ");
    const nameParts=fullName.split(" ");
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

    if(!countryInput.value||!stateInput.value||!cityInput.value||!lgaInput.value||!locationInput.value){
        showModal({
            type:"error",
            title:"Incomplete Location",
            message:"Please get your current location before updating your profile.",
            icon:"!"
        });
        return null;
    }

    return{fullName:normalizedFullName,phone};
}

/* 17. GET MY LOCATION */
getLocationBtn.addEventListener("click",()=>{
    if(!navigator.geolocation){
        showModal({
            type:"error",
            title:"Location Unavailable",
            message:"Your browser does not support location services.",
            icon:"!"
        });
        return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
        async position=>{
            const {latitude,longitude}=position.coords;

            try{
                const response=await API_REQUEST(
                    `/api/location?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
                    {method:"GET"}
                );

                const data=await getResponseData(response);

                if(response.status===401){
                    showAuthenticationError("Your login session has expired. Please log in again.");
                    return;
                }

                if(!response.ok){
                    showModal({
                        type:"error",
                        title:"Location Failed",
                        message:getBackendMessage(data,"Unable to determine your location. Please try again."),
                        icon:"!"
                    });
                    return;
                }

                const lga=data.lga||data.location?.lga,
                city=data.city||data.location?.city,
                state=data.state||data.location?.state,
                country=data.country||data.location?.country||"Nigeria";

                if(!lga||!city||!state){
                    showModal({
                        type:"error",
                        title:"Location Not Found",
                        message:"Unable to determine your LGA and city from your current location.",
                        icon:"!"
                    });
                    return;
                }

                countryInput.value=country;
                stateInput.value=state;
                cityInput.value=city;
                lgaInput.value=lga;
                latitudeInput.value=data.latitude??latitude;
                longitudeInput.value=data.longitude??longitude;
                locationInput.value=`${lga}, ${city}`;

                showModal({
                    type:"success",
                    title:"Location Found",
                    message:`Your location has been updated to ${lga}, ${city}.`,
                    icon:"✓"
                });
            }catch(error){
                console.error("Get location error:",error);
                showModal({
                    type:"error",
                    title:"Location Failed",
                    message:"Unable to determine your location. Please try again.",
                    icon:"!"
                });
            }finally{
                setLocationLoading(false);
            }
        },
        error=>{
            setLocationLoading(false);

            let message="Unable to access your location. Please try again.";

            if(error.code===error.PERMISSION_DENIED)
                message="Location permission was denied. Please allow location access and try again.";
            else if(error.code===error.POSITION_UNAVAILABLE)
                message="Your current location could not be determined. Please try again.";
            else if(error.code===error.TIMEOUT)
                message="Location request timed out. Please try again.";

            showModal({
                type:"error",
                title:"Location Failed",
                message,
                icon:"!"
            });
        },
        {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    );
});

/* 18. UPDATE PROFILE */
async function updateProfile(){
    if(isUpdatingProfile)return;

    const validated=validateProfile();
    if(!validated)return;

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

/* 19. PHOTO PREVIEW */
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

/* 20. FORM SUBMISSION */
profileForm.addEventListener("submit",event=>{
    event.preventDefault();
    updateProfile();
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

    showModal({
        type:"warning",
        title:"Confirm Logout",
        message:"Are you sure you want to log out?",
        icon:"!"
    });

    notificationButton.textContent="Continue";
    notificationButton.disabled=false;
    notificationCancelButton.hidden=false;
    notificationCancelButton.disabled=false;

    notificationButton.onclick=()=>{
        if(isLoggingOut)return;

        isLoggingOut=true;
        notificationButton.disabled=true;
        notificationCancelButton.disabled=true;
        notificationButton.innerHTML='<span class="button-loader"></span> Logging out...';

        logoutUser();
    };

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
    logoutBtn.disabled=true;
    logoutBtn.classList.add("is-loading");

    try{
        const response=await API_REQUEST(LOGOUT_ENDPOINT,{method:"POST"});
        const data=await getResponseData(response);

        if(response.status===401){
            isLoggingOut=false;
            notificationButton.disabled=false;
            notificationCancelButton.disabled=false;
            notificationButton.textContent="Continue";
            closeModal();

            showAuthenticationError("Your login session has expired. Please log in again.");
            return;
        }

        if(!response.ok){
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

/* 24. INITIALIZE PAGE */
document.addEventListener("DOMContentLoaded",loadProfile);