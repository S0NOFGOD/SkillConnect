const DASHBOARD_ENDPOINT="/api/worker/dashboard";
const SEND_PHONE_OTP_ENDPOINT="/api/worker/send-phone-otp";
const LOGOUT_ENDPOINT="/api/auth/worker/logout";

const sidebar=document.getElementById("sidebar");
const overlay=document.getElementById("overlay");
const menuBtn=document.getElementById("menuBtn");
const closeMenuBtn=document.getElementById("closeMenuBtn");
const viewServicesBtn=document.getElementById("viewServicesBtn");
const editProfileBtn=document.getElementById("editProfileBtn");
const logoutBtn=document.getElementById("logoutBtn");
const verificationActionBtn=document.getElementById("verificationActionBtn");

const workerFirstName=document.getElementById("workerFirstName");
const fullName=document.getElementById("fullName");
const phoneNumber=document.getElementById("phoneNumber");
const country=document.getElementById("country");
const state=document.getElementById("state");
const city=document.getElementById("city");
const lga=document.getElementById("lga");
const totalSkills=document.getElementById("totalSkills");
const phoneVerification=document.getElementById("phoneVerification");

const profilePhoto=document.getElementById("profilePhoto");
const profilePhotoPlaceholder=document.getElementById("profilePhotoPlaceholder");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationCloseButton=document.getElementById("notificationCancelButton");
const notificationButton=document.getElementById("notificationButton");

let modalAction=null;
let keepModalOpenDuringAction=false;

function showModal(title,message,type="info",action=null,buttonText="OK",keepOpenDuringAction=false){
notificationTitle.textContent=title;
notificationText.textContent=message;
notificationButton.textContent=buttonText;
notificationCard.className=`notification-card ${type}`;
modalAction=action;
keepModalOpenDuringAction=keepOpenDuringAction;
notificationCloseButton.hidden=false;
notificationOverlay.hidden=false;
notificationOverlay.classList.add("active");
}

function hideModal(executeAction=false){
notificationOverlay.classList.remove("active");
notificationOverlay.hidden=true;
const action=modalAction;
modalAction=null;
keepModalOpenDuringAction=false;
if(executeAction&&action)action();
}

function closeModal(){
if(modalAction&&keepModalOpenDuringAction){
const action=modalAction;
modalAction=null;
keepModalOpenDuringAction=false;
action();
return;
}
hideModal(true);
}

notificationButton.addEventListener("click",closeModal);

notificationCloseButton.addEventListener("click",()=>{
if(notificationButton.disabled)return;
hideModal(false);
});

function setLoading(button,loading){
if(!button)return;
if(loading){
if(!button.dataset.originalText)button.dataset.originalText=button.textContent.trim();
button.disabled=true;
button.classList.add("is-loading");
button.textContent="Processing...";
return;
}
button.disabled=false;
button.classList.remove("is-loading");
if(button.dataset.originalText){
button.textContent=button.dataset.originalText;
delete button.dataset.originalText;
}
}

function redirectToAuthentication(){
window.location.href="../worker-authentication/index.html";
}

function handleAuthenticationError(message="Your session has expired. Please log in again."){
removeAccessToken();
showModal("Authentication Required",message,"error",redirectToAuthentication,"Continue");
}

function checkAccessToken(){
const accessToken=getAccessToken();
if(!accessToken){
showModal("Authentication Required","Please log in to access your worker dashboard.","error",redirectToAuthentication,"Continue");
return false;
}
return true;
}

async function loadDashboard(){
if(!checkAccessToken())return;
try{
const response=await API_REQUEST(DASHBOARD_ENDPOINT,{method:"GET"});
if(response.status===401)return;
const data=await response.json();
if(!response.ok){
showModal("Unable to Load Dashboard",data.message||"Something went wrong while loading your dashboard.","error");
return;
}
displayWorkerData(data);
}catch(error){
console.error("Dashboard request failed:",error);
showModal("Connection Error","Unable to connect to the server. Please try again.","error");
}
}

function displayWorkerData(data){
const worker=data.worker||data;
const name=worker.fullName||"";
fullName.textContent=name||"Not provided";
phoneNumber.textContent=worker.phone||"Not provided";
country.textContent=worker.country||"Not provided";
state.textContent=worker.state||"Not provided";
city.textContent=worker.city||"Not provided";
lga.textContent=worker.lga||"Not provided";
workerFirstName.textContent=name.split(" ")[0]||"Worker";
totalSkills.textContent=worker.totalSkills??0;
displayProfilePhoto(worker.profilePhoto);
checkPhoneVerification(worker.phoneVerificationExpires);
}

function displayProfilePhoto(photoUrl){
if(!profilePhoto||!profilePhotoPlaceholder)return;
profilePhoto.hidden=true;
profilePhotoPlaceholder.hidden=true;
profilePhoto.onload=null;
profilePhoto.onerror=null;
if(!photoUrl||typeof photoUrl!=="string"||!photoUrl.trim()){
profilePhoto.removeAttribute("src");
profilePhotoPlaceholder.hidden=false;
return;
}
profilePhoto.onload=()=>{
profilePhoto.hidden=false;
profilePhotoPlaceholder.hidden=true;
};
profilePhoto.onerror=()=>{
profilePhoto.hidden=true;
profilePhoto.removeAttribute("src");
profilePhotoPlaceholder.hidden=false;
};
profilePhoto.hidden=true;
profilePhoto.src=photoUrl.trim();
}

function checkPhoneVerification(phoneVerificationExpires){
const expiryTime=phoneVerificationExpires?new Date(phoneVerificationExpires).getTime():NaN;
if(!phoneVerificationExpires||Number.isNaN(expiryTime)||expiryTime<=Date.now()){
showVerificationPrompt();
return;
}
phoneVerification.textContent="Verified";
startVerificationCountdown(expiryTime);
}

function showVerificationPrompt(){
phoneVerification.textContent="Unverified";
verificationActionBtn.textContent="Verify Profile";
showModal("Verify Your Profile","Verify your profile to be discovered by nearby clients.","info",sendPhoneOtp,"Continue",true);
}

let countdownTimer=null;

function startVerificationCountdown(expiryTime){
clearInterval(countdownTimer);
updateVerificationCountdown(expiryTime);
countdownTimer=setInterval(()=>{
if(expiryTime<=Date.now()){
clearInterval(countdownTimer);
showVerificationPrompt();
return;
}
updateVerificationCountdown(expiryTime);
},1000);
}

function updateVerificationCountdown(expiryTime){
verificationActionBtn.textContent=formatCountdown(expiryTime);
}

function formatCountdown(expiryTime){
const totalSeconds=Math.floor(Math.max(0,expiryTime-Date.now())/1000);
const days=Math.floor(totalSeconds/86400);
const hours=Math.floor((totalSeconds%86400)/3600);
const minutes=Math.floor((totalSeconds%3600)/60);
const seconds=totalSeconds%60;
return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

verificationActionBtn.addEventListener("click",()=>{
if(verificationActionBtn.textContent.trim()!=="Verify Profile")return;
showVerificationPrompt();
});

async function sendPhoneOtp(){
setLoading(notificationButton,true);
try{
const response=await API_REQUEST(SEND_PHONE_OTP_ENDPOINT,{method:"POST"});
if(response.status===401){
setLoading(notificationButton,false);
hideModal(false);
return;
}
const data=await response.json();
if(!response.ok){
setLoading(notificationButton,false);
hideModal(false);
showModal("Verification Error",data.message||"Unable to send verification code.","error");
return;
}
if(data.phone)sessionStorage.setItem("workerPhone",data.phone);
setLoading(notificationButton,false);
hideModal(false);
showModal("OTP Sent",data.message||"A verification code has been sent to your phone.","success",()=>{
window.location.href="../worker-phone-otp/index.html";
},"Continue");
}catch(error){
console.error("Phone OTP request failed:",error);
setLoading(notificationButton,false);
hideModal(false);
showModal("Connection Error","Unable to send the verification code. Please try again.","error");
}
}

function openSidebar(){
sidebar.classList.add("active");
overlay.classList.add("active");
}

function closeSidebar(){
sidebar.classList.remove("active");
overlay.classList.remove("active");
}

menuBtn.addEventListener("click",openSidebar);
closeMenuBtn.addEventListener("click",closeSidebar);
overlay.addEventListener("click",closeSidebar);

viewServicesBtn.addEventListener("click",()=>{
window.location.href="../worker-services/index.html";
});

editProfileBtn.addEventListener("click",()=>{
window.location.href="../worker-edit-profile/index.html";
});

logoutBtn.addEventListener("click",()=>{
showModal("Logout","Are you sure you want to log out.","confirm",logoutWorker,"Logout",true);
});

async function logoutWorker(){
setLoading(notificationButton,true);

try{
const response=await API_REQUEST(LOGOUT_ENDPOINT,{method:"POST"});

if(response.status===401){
setLoading(notificationButton,false);
hideModal(false);
return;
}

const data=await response.json();

if(!response.ok){
setLoading(notificationButton,false);
showModal(
"Logout Failed",
data.message||"Unable to log out. Please try again.",
"error"
);
return;
}

removeAccessToken();

window.location.href="../worker-authentication/index.html";

}catch(error){
console.error("Logout request failed:",error);

setLoading(notificationButton,false);

hideModal(false);

showModal(
"Connection Error",
"Unable to log out at this time. Please try again.",
"error"
);
}
}

window.addEventListener("authSessionExpired",()=>{
handleAuthenticationError();
});

document.addEventListener("DOMContentLoaded",()=>{
loadDashboard();
});