document.addEventListener("DOMContentLoaded",()=>{

const sidebar=document.getElementById("sidebar");
const menuBtn=document.getElementById("menuBtn");
const closeMenuBtn=document.getElementById("closeMenuBtn");
const overlay=document.getElementById("overlay");
const findWorkersBtn=document.getElementById("findWorkersBtn");
const editProfileBtn=document.getElementById("editProfileBtn");
const logoutBtn=document.getElementById("logoutBtn");

const clientFirstName=document.getElementById("clientFirstName");
const profilePhoto=document.getElementById("profilePhoto");
const profilePhotoPlaceholder=document.getElementById("profilePhotoPlaceholder");
const fullName=document.getElementById("fullName");
const phoneNumber=document.getElementById("phoneNumber");
const country=document.getElementById("country");
const state=document.getElementById("state");
const city=document.getElementById("city");
const lga=document.getElementById("lga");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationButton=document.getElementById("notificationButton");
const notificationCancelButton=document.getElementById("notificationCancelButton");

let notificationAction=null;

function openMenu(){
sidebar.classList.add("active");
overlay.classList.add("active");
menuBtn.setAttribute("aria-expanded","true");
overlay.setAttribute("aria-hidden","false");
}

function closeMenu(){
sidebar.classList.remove("active");
overlay.classList.remove("active");
menuBtn.setAttribute("aria-expanded","false");
overlay.setAttribute("aria-hidden","true");
}

menuBtn.addEventListener("click",openMenu);
closeMenuBtn.addEventListener("click",closeMenu);
overlay.addEventListener("click",closeMenu);

function showNotification(type,title,message,buttonText="Continue",action=null){
notificationCard.className=`notification-card ${type}`;
notificationIcon.textContent=type==="success"?"✓":type==="error"?"!":type==="confirm"?"?":"i";
notificationTitle.textContent=title;
notificationText.textContent=message;
notificationButton.textContent=buttonText;
notificationCancelButton.textContent=type==="confirm"?"No":"×";
notificationAction=action;
notificationOverlay.hidden=false;
}

function closeNotification(){
notificationOverlay.hidden=true;
notificationAction=null;
notificationCancelButton.textContent="×";
}

notificationCancelButton.addEventListener("click",closeNotification);

notificationButton.addEventListener("click",async()=>{
const action=notificationAction;
if(action)await action();
});

notificationOverlay.addEventListener("click",event=>{
if(event.target===notificationOverlay)closeNotification();
});

function setLoading(button,loading,text){
if(loading){
button.dataset.originalText=button.textContent;
button.textContent=text;
button.disabled=true;
}else{
button.textContent=button.dataset.originalText||button.textContent;
button.disabled=false;
}
}

function getFirstName(name=""){
return name.trim().split(/\s+/)[0]||"Client";
}

function setDashboardData(data){

const client=data.client||data;
const name=client.fullName||"—";

clientFirstName.textContent=getFirstName(name);
fullName.textContent=name;
phoneNumber.textContent=client.phone||"—";
country.textContent=client.country||"—";
state.textContent=client.state||"—";
city.textContent=client.city||"—";
lga.textContent=client.lga||"—";

if(client.profilePhoto){
profilePhoto.src=client.profilePhoto;
profilePhoto.hidden=false;
profilePhotoPlaceholder.hidden=true;

profilePhoto.onerror=()=>{
profilePhoto.hidden=true;
profilePhotoPlaceholder.hidden=false;
};

}else{
profilePhoto.hidden=true;
profilePhotoPlaceholder.hidden=false;
}

}

async function loadDashboard(){

try{

const response=await API_REQUEST("/api/client-dashboard");

if(response.ok){

const data=await response.json();

setDashboardData(data);

return;

}

if(response.status===401){

showNotification(
"error",
"Session Expired",
"Your session has expired. Please log in again.",
"Continue",
()=>window.location.href="../client-authentication/index.html"
);

return;

}

let message="Unable to load your dashboard.";

try{

const data=await response.json();

if(data.message)message=data.message;

}catch{}

showNotification("error","Dashboard Error",message);

}catch(error){

console.error("Client dashboard request failed:",error);

showNotification(
"error",
"Connection Error",
"Unable to connect to SkillConnect. Please try again."
);

}

}

findWorkersBtn.addEventListener("click",()=>{
closeMenu();
window.location.href="../find-workers/index.html";
});

editProfileBtn.addEventListener("click",()=>{
closeMenu();
window.location.href="../client-create-profile/index.html";
});

logoutBtn.addEventListener("click",()=>{

showNotification(
"confirm",
"Logout",
"Are you sure you want to log out?",
"Yes",
async()=>{

setLoading(notificationButton,true,"Logging out...");

try{

const response=await API_REQUEST("/api/auth/logout",{
method:"POST"
});

if(response.ok){

let message="You have been successfully logged out.";

try{

const data=await response.json();

if(data.message)message=data.message;

}catch{}

window.location.href="../client-authentication/index.html";

}else{

let message="Unable to log out. Please try again.";

try{

const data=await response.json();

if(data.message)message=data.message;

}catch{}

showNotification(
"error",
"Logout Failed",
message
);

}

}catch(error){

console.error("Logout request failed:",error);

showNotification(
"error",
"Connection Error",
"Unable to connect to SkillConnect. Please try again."
);

}finally{

setLoading(notificationButton,false);

}

}
);

});

window.addEventListener("authSessionExpired",()=>{

showNotification(
"error",
"Session Expired",
"Your authentication session has expired. Please log in again.",
"Continue",
()=>window.location.href="../client-authentication/index.html"
);

});

loadDashboard();

});