"use strict";

const NIGERIAN_LOCATION_SCRIPT="../worker-create-profile/nigeria-location.js";

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
buttonLoader=updateProfileBtn.querySelector(".button-loader"),
cancelBtn=document.getElementById("cancelBtn"),
findWorkersBtn=document.getElementById("findWorkersBtn"),
editProfileBtn=document.getElementById("editProfileBtn"),
logoutBtn=document.getElementById("logoutBtn"),
menuBtn=document.getElementById("menuBtn"),
closeMenuBtn=document.getElementById("closeMenuBtn"),
sidebar=document.getElementById("sidebar"),
overlay=document.getElementById("overlay");

const notificationOverlay=document.getElementById("notificationOverlay"),
notificationCard=document.getElementById("notificationCard"),
notificationIcon=document.getElementById("notificationIcon"),
notificationTitle=document.getElementById("notificationTitle"),
notificationText=document.getElementById("notificationText"),
notificationButton=document.getElementById("notificationButton"),
notificationCancelButtonMobile=document.getElementById(
"notificationCancelButtonMobile"
);

const PROFILE_ENDPOINT="/api/client/edit-profile",
LOGOUT_ENDPOINT="/api/auth/logout";

let currentClient=null,
notificationAction=null,
isUpdatingProfile=false,
isLoggingOut=false;

function setUpdateLoading(loading){

updateProfileBtn.disabled=loading;
cancelBtn.disabled=loading;

buttonLoader.hidden=!loading;

buttonText.textContent=loading
?"Updating..."
:"Update Profile";

}

function setPageLoading(loading){

editProfilePage.setAttribute(
"aria-busy",
loading?"true":"false"
);

profileForm.style.opacity=loading?".55":"1";
profileForm.style.pointerEvents=loading?"none":"auto";

}

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

countryInput.addEventListener(
"change",
()=>populateStates()
);

stateInput.addEventListener(
"change",
()=>populateStateLocations()
);

// ==========================================
// NOTIFICATION MODAL
// Consistent with client-workers-search.
// ==========================================

const resetNotificationButtons=()=>{

notificationButton.disabled=false;
notificationCancelButtonMobile.disabled=false;

notificationButton.textContent="Continue";
notificationCancelButtonMobile.textContent="No";

notificationButton.onclick=null;
notificationCancelButtonMobile.onclick=null;

};

function showModal({
type="info",
title="Notification",
message="",
icon="i",
action=null
}={}){

notificationCard.className="notification-card";

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

if(typeof action==="function"){
action();
}

}

notificationButton.addEventListener("click",()=>{

if(typeof notificationButton.onclick==="function"){
return;
}

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

// ==========================================
// RESPONSE HELPERS
// ==========================================

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

// ==========================================
// PHONE HELPERS
// ==========================================

function normalizePhone(phone){

let value=String(phone||"")
.trim()
.replace(/[\s()-]/g,"");

if(value.startsWith("+234"))
value="234"+value.slice(4);

else if(value.startsWith("234"))
value="234"+value.slice(3);

else if(value.startsWith("0"))
value="234"+value.slice(1);

return value;

}

function isValidPhone(phone){

return /^234[789]\d{9}$/.test(phone);

}

// ==========================================
// PROFILE PHOTO HELPERS
// ==========================================

function validatePhoto(file){

if(!file)return null;

if(file.size>5*1024*1024)
return"Profile photo must not be more than 5 MB.";

if(!file.type.startsWith("image/"))
return"Please select a valid image file.";

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

function displayClientData(client){

currentClient=client;

fullNameInput.value=client.fullName||"";
phoneInput.value=client.phone||"";
countryInput.value=client.country||"";

populateStates(client.state||"");

if(client.state){

populateStateLocations(
client.city||"",
client.lga||""
);

}

displayProfilePhoto(client.profilePhoto);

}

function extractClientData(data){

return data.client||data.data||data;

}

// ==========================================
// LOAD PROFILE
// ==========================================

async function loadProfile(){

setPageLoading(true);

try{

const response=await API_REQUEST(
PROFILE_ENDPOINT,
{
method:"GET"
}
);

if(response.status===401){

showAuthenticationError(
"Your login session has expired. Please log in again."
);

return;

}

const data=await getResponseData(response);

if(!response.ok){

showModal({
type:"error",
title:"Unable to Load Profile",
message:getBackendMessage(
data,
"We could not load your profile. Please try again."
),
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

// ==========================================
// FULL NAME HELPERS
// ==========================================

function normalizeNamePart(name){

return name
.toLowerCase()
.split(/([-'])/)
.map(part=>{

if(part==="-"||part==="'")
return part;

return part.charAt(0).toUpperCase()+part.slice(1);

})
.join("");

}

function normalizeFullName(value){

const fullName=String(value||"")
.trim()
.replace(/\s+/g," ");

const nameParts=fullName.split(" ");

if(nameParts.length!==2)
return null;

const namePattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

if(
!namePattern.test(nameParts[0])||
!namePattern.test(nameParts[1])
)
return null;

return nameParts.map(normalizeNamePart).join(" ");

}

// ==========================================
// PROFILE VALIDATION
// ==========================================

function validateProfile(){

const normalizedFullName=normalizeFullName(
fullNameInput.value
);

const phone=normalizePhone(phoneInput.value);

const photo=profilePhotoInput.files[0];

const photoError=validatePhoto(photo);

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

if(!countryInput.value){

showModal({
type:"error",
title:"Country Required",
message:"Please select your country.",
icon:"!"
});

return null;

}

if(!stateInput.value){

showModal({
type:"error",
title:"State Required",
message:"Please select your state.",
icon:"!"
});

return null;

}

if(!cityInput.value){

showModal({
type:"error",
title:"City Required",
message:"Please select your city.",
icon:"!"
});

return null;

}

if(!lgaInput.value){

showModal({
type:"error",
title:"LGA Required",
message:"Please select your LGA.",
icon:"!"
});

return null;

}

return{
fullName:normalizedFullName,
phone
};

}

// ==========================================
// UPDATE PROFILE
// ==========================================

async function updateProfile(){

if(isUpdatingProfile)
return;

const validated=validateProfile();

if(!validated)
return;

const formData=new FormData(profileForm);

formData.set(
"fullName",
validated.fullName
);

formData.set(
"phone",
validated.phone
);

formData.set(
"country",
countryInput.value
);

formData.set(
"state",
stateInput.value
);

formData.set(
"city",
cityInput.value
);

formData.set(
"lga",
lgaInput.value
);

isUpdatingProfile=true;

setUpdateLoading(true);

try{

const response=await API_REQUEST(
PROFILE_ENDPOINT,
{
method:"PUT",
body:formData
}
);

if(response.status===401){

showAuthenticationError(
"Your login session has expired. Please log in again."
);

return;

}

const data=await getResponseData(response);

if(!response.ok){

showModal({
type:"error",
title:"Update Failed",
message:getBackendMessage(
data,
"Your profile could not be updated."
),
icon:"!"
});

return;

}

showModal({
type:"success",
title:"Profile Updated",
message:data.message||
"Your profile has been updated successfully.",
icon:"✓",
action:()=>{

window.location.reload();

}

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

// ==========================================
// PROFILE PHOTO CHANGE
// ==========================================

profilePhotoInput.addEventListener(
"change",
()=>{

const file=profilePhotoInput.files[0];

if(!file){

if(photoFileName){
photoFileName.textContent="No new photo selected";
}

return;

}

const error=validatePhoto(file);

if(error){

profilePhotoInput.value="";

if(photoFileName){
photoFileName.textContent="No new photo selected";
}

showModal({
type:"error",
title:"Invalid Photo",
message:error,
icon:"!"
});

return;

}

if(photoFileName){
photoFileName.textContent=file.name;
}

profilePhoto.src=URL.createObjectURL(file);

profilePhoto.hidden=false;
profilePhotoPlaceholder.hidden=true;

}
);

// ==========================================
// PROFILE FORM SUBMISSION
// ==========================================

profileForm.addEventListener(
"submit",
event=>{

event.preventDefault();

updateProfile();

}
);

// ==========================================
// NAVIGATION
// ==========================================

findWorkersBtn.addEventListener(
"click",
()=>{

window.location.href=
"../client-workers-search/index.html";

}
);

editProfileBtn.addEventListener(
"click",
closeMobileMenu
);

cancelBtn.addEventListener(
"click",
()=>{

window.location.href=
"../client-dashboard/index.html";

}
);

function openMobileMenu(){

sidebar.classList.add("active");

overlay.classList.add("active");

menuBtn.setAttribute(
"aria-expanded",
"true"
);

}

function closeMobileMenu(){

sidebar.classList.remove("active");

overlay.classList.remove("active");

menuBtn.setAttribute(
"aria-expanded",
"false"
);

}

menuBtn.addEventListener(
"click",
()=>{

if(sidebar.classList.contains("active")){
closeMobileMenu();
}else{
openMobileMenu();
}

}
);

closeMenuBtn.addEventListener(
"click",
closeMobileMenu
);

overlay.addEventListener(
"click",
closeMobileMenu
);

// ==========================================
// LOGOUT FLOW
// Consistent with client-workers-search.
// ==========================================

logoutBtn.addEventListener("click",()=>{

closeMobileMenu();

if(isLoggingOut){
return;
}

showModal({
type:"info",
title:"Logout",
message:"Are you sure you want to logout?",
icon:"i"
});

notificationButton.textContent="Yes";
notificationCancelButtonMobile.textContent="No";

notificationButton.onclick=async()=>{

if(isLoggingOut){
return;
}

isLoggingOut=true;

notificationButton.disabled=true;
notificationCancelButtonMobile.disabled=true;

notificationButton.textContent="Connecting…";

try{

const response=await API_REQUEST(
LOGOUT_ENDPOINT,
{
method:"POST"
}
);

if(!response.ok){

let message="Logout failed. Please try again.";

try{

const data=await response.json();

if(data.message){
message=data.message;
}

}catch(error){

// Keep the default error message.

}

isLoggingOut=false;

showModal({
type:"error",
title:"Logout Error",
message,
icon:"!"
});

return;

}

window.location.href=
"../client-authentication/index.html";

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

// ==========================================
// AUTHENTICATION SESSION EXPIRED
// ==========================================

window.addEventListener(
"authSessionExpired",
()=>{

if(isLoggingOut){
return;
}

if(isUpdatingProfile){
return;
}

showAuthenticationError(
"Your session has expired. Please log in again."
);

}
);

// ==========================================
// INITIAL PAGE LOAD
// ==========================================

loadProfile();