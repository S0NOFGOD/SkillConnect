/* =========================
ELEMENTS
========================= */

const menuBtn=document.getElementById("menuBtn");
const closeMenuBtn=document.getElementById("closeMenuBtn");
const sidebar=document.getElementById("sidebar");
const overlay=document.getElementById("overlay");

const servicesBtn=document.getElementById("servicesBtn");
const adminBtn=document.getElementById("adminBtn");
const logoutBtn=document.getElementById("logoutBtn");

const addAdminBtn=document.getElementById("addAdminBtn");
const addAdminOverlay=document.getElementById("addAdminOverlay");
const closeAddAdminBtn=document.getElementById("closeAddAdminBtn");
const addAdminForm=document.getElementById("addAdminForm");

const fullNameInput=document.getElementById("fullName");
const passwordInput=document.getElementById("password");
const createAdminBtn=document.getElementById("createAdminBtn");

const adminContainer=document.getElementById("adminContainer");
const adminCount=document.getElementById("adminCount");

const confirmationOverlay=document.getElementById("confirmationOverlay");
const confirmationCard=document.getElementById("confirmationCard");
const confirmationCloseButton=document.getElementById("confirmationCloseButton");
const confirmationTitle=document.getElementById("confirmationTitle");
const confirmationText=document.getElementById("confirmationText");
const confirmationNoButton=document.getElementById("confirmationNoButton");
const confirmationYesButton=document.getElementById("confirmationYesButton");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationButton=document.getElementById("notificationButton");
const notificationCancelButton=document.getElementById("notificationCancelButton");

const loadingOverlay=document.getElementById("loadingOverlay");


/* =========================
API ENDPOINTS
========================= */

const ADMIN_MANAGEMENT_ENDPOINT="/api/admin-management";
const GET_ADMINS_ENDPOINT=`${ADMIN_MANAGEMENT_ENDPOINT}/admins`;
const CREATE_ADMIN_ENDPOINT=`${ADMIN_MANAGEMENT_ENDPOINT}/create`;
const DELETE_ADMIN_ENDPOINT=`${ADMIN_MANAGEMENT_ENDPOINT}/delete`;
const LOGOUT_ENDPOINT="/api/auth/logout";


/* =========================
STATE
========================= */

let confirmationAction=null;
let notificationAction=null;


/* =========================
LOADING MODAL
========================= */

function showLoading(){
loadingOverlay.hidden=false;
}

function hideLoading(){
loadingOverlay.hidden=true;
}


/* =========================
NOTIFICATION MODAL
========================= */

function showNotification(title,message,type="success",action=null){

notificationCard.classList.remove("success","error");
notificationCard.classList.add(type);

notificationTitle.textContent=title;
notificationText.textContent=message;

notificationIcon.textContent=
type==="success"?"✓":"!";

notificationAction=action;
notificationOverlay.hidden=false;
}

function hideNotification(){
notificationOverlay.hidden=true;
notificationAction=null;
}

notificationButton.addEventListener(
"click",
()=>{
const action=notificationAction;
hideNotification();

if(typeof action==="function"){
action();
}
}
);

notificationCancelButton.addEventListener(
"click",
hideNotification
);


/* =========================
CONFIRMATION MODAL
========================= */

function showConfirmation(title,message,action){

confirmationTitle.textContent=title;
confirmationText.textContent=message;
confirmationAction=action;

confirmationYesButton.textContent="Yes";
confirmationYesButton.disabled=false;

confirmationOverlay.hidden=false;
}

function hideConfirmation(){
confirmationOverlay.hidden=true;
confirmationAction=null;
}

confirmationNoButton.addEventListener(
"click",
hideConfirmation
);

confirmationCloseButton.addEventListener(
"click",
hideConfirmation
);

confirmationYesButton.addEventListener(
"click",
()=>{
const action=confirmationAction;

if(typeof action==="function"){
action();
}
}
);


/* =========================
MOBILE SIDEBAR
========================= */

function openSidebar(){

sidebar.classList.add("active");
overlay.classList.add("active");

menuBtn.setAttribute("aria-expanded","true");
}

function closeSidebar(){

sidebar.classList.remove("active");
overlay.classList.remove("active");

menuBtn.setAttribute("aria-expanded","false");
}

menuBtn.addEventListener(
"click",
openSidebar
);

closeMenuBtn.addEventListener(
"click",
closeSidebar
);

overlay.addEventListener(
"click",
closeSidebar
);


/* =========================
DASHBOARD FLOW
========================= */

adminBtn.addEventListener(
"click",
()=>{
closeSidebar();

window.location.href="../admin-dashboard/index.html";
}
);


/* =========================
SERVICES FLOW
========================= */

servicesBtn.addEventListener(
"click",
()=>{
closeSidebar();

window.location.href="../admin-worker-services/index.html";
}
);


/* =========================
LOAD ADMINS
========================= */

async function loadAdmins(){

showLoading();

try{

const response=await API_REQUEST(
GET_ADMINS_ENDPOINT,
{
method:"GET"
}
);

if(response.status===401){

hideLoading();

showNotification(
"Authentication Required",
"Your session has expired. Please log in again.",
"error",
()=>{
window.location.href=
"../admin-authentication/index.html";
}
);

return;
}

let data={};

try{
data=await response.json();
}catch(error){
data={};
}

if(!response.ok){

hideLoading();

showNotification(
"Error",
data.message||
"Unable to retrieve administrator accounts.",
"error"
);

return;
}

const admins=
Array.isArray(data.admins)?
data.admins:
[];

hideLoading();

if(admins.length===0){

adminContainer.innerHTML=`
<div class="empty-state">

<div class="empty-state-icon">
+
</div>

<h3>
No Administrators
</h3>

<p>
No administrator accounts exist.
</p>

</div>
`;

adminCount.textContent="0 Admins";

showNotification(
"No Admin Accounts",
data.message||
"No administrator accounts exist.",
"success"
);

return;
}

renderAdmins(admins);

}catch(error){

console.error(
"Load admins failed:",
error
);

hideLoading();

showNotification(
"Connection Error",
"Unable to connect to the server. Please try again.",
"error"
);

}

}


/* =========================
RENDER ADMINS
========================= */

function renderAdmins(admins){

adminContainer.innerHTML="";

adminCount.textContent=
`${admins.length} ${
admins.length===1?
"Admin":
"Admins"
}`;

admins.forEach(
admin=>{

const card=document.createElement("div");

card.className="admin-card";

card.dataset.adminId=admin.adminId;

card.innerHTML=`

<div class="admin-card-header">

<div class="admin-card-name">

<strong>
${escapeHTML(admin.fullName)}
</strong>

</div>

<button
type="button"
class="delete-admin-btn"
data-admin-id="${escapeHTML(admin.adminId)}"
data-admin-name="${escapeHTML(admin.fullName)}"
>
Delete
</button>

</div>

<div class="admin-information">

<div class="admin-information-item">

<strong>
${escapeHTML(admin.adminId)}
</strong>

</div>

</div>

`;

adminContainer.appendChild(card);

}
);


/* =========================
DELETE BUTTONS
========================= */

document
.querySelectorAll(".delete-admin-btn")
.forEach(
button=>{

button.addEventListener(
"click",
()=>{

const adminId=
button.dataset.adminId;

const adminName=
button.dataset.adminName;

showConfirmation(
"Delete Admin",
`Are you sure you want to delete ${adminName}?`,
()=>{
deleteAdmin(adminId);
}
);

}
);

}
);

}


/* =========================
ADD ADMIN MODAL
========================= */

function showAddAdminModal(){

addAdminOverlay.hidden=false;
fullNameInput.focus();

}

function hideAddAdminModal(){

addAdminOverlay.hidden=true;
addAdminForm.reset();

}

addAdminBtn.addEventListener(
"click",
showAddAdminModal
);

closeAddAdminBtn.addEventListener(
"click",
hideAddAdminModal
);


/* =========================
ADD ADMIN VALIDATION
========================= */

function validateAddAdmin(){

const fullName=
fullNameInput.value.trim();

const password=
passwordInput.value;

if(!fullName){

showNotification(
"Validation Error",
"Please enter the admin full name.",
"error"
);

return false;
}

if(!/^[A-Za-z]+ [A-Za-z]+$/.test(
fullName
)){

showNotification(
"Validation Error",
"Full name must contain exactly two names separated by a space.",
"error"
);

return false;
}

if(!password){

showNotification(
"Validation Error",
"Please enter the admin password.",
"error"
);

return false;
}

if(password.length<8){

showNotification(
"Validation Error",
"Password must contain at least 8 characters.",
"error"
);

return false;
}

return true;

}


/* =========================
ADD ADMIN FLOW
========================= */

addAdminForm.addEventListener(
"submit",
async event=>{

event.preventDefault();

if(!validateAddAdmin()){
return;
}

const fullName=
fullNameInput.value.trim();

const password=
passwordInput.value;

createAdminBtn.textContent="Connecting...";
createAdminBtn.disabled=true;

try{

const response=
await API_REQUEST(
CREATE_ADMIN_ENDPOINT,
{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({
fullName,
password
})
}
);

if(response.status===401){

createAdminBtn.textContent=
"Create Admin";

createAdminBtn.disabled=false;

showNotification(
"Authentication Required",
"Your session has expired. Please log in again.",
"error",
()=>{
window.location.href=
"../admin-authentication/index.html";
}
);

return;
}

let data={};

try{
data=await response.json();
}catch(error){
data={};
}

if(!response.ok){

createAdminBtn.textContent=
"Create Admin";

createAdminBtn.disabled=false;

showNotification(
"Unable to Create Admin",
data.message||
"The administrator account could not be created.",
"error"
);

return;
}

hideAddAdminModal();

createAdminBtn.textContent=
"Create Admin";

createAdminBtn.disabled=false;

showNotification(
"Admin Created",
data.message||
"Admin account created successfully.",
"success",
()=>{
window.location.reload();
}
);

}catch(error){

console.error(
"Create admin failed:",
error
);

createAdminBtn.textContent=
"Create Admin";

createAdminBtn.disabled=false;

showNotification(
"Connection Error",
"Unable to connect to the server. Please try again.",
"error"
);

}

}
);


/* =========================
DELETE ADMIN FLOW
========================= */

async function deleteAdmin(adminId){

confirmationYesButton.textContent=
"Connecting...";

confirmationYesButton.disabled=true;

try{

const response=
await API_REQUEST(
DELETE_ADMIN_ENDPOINT,
{
method:"DELETE",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({
adminId
})
}
);

if(response.status===401){

confirmationYesButton.textContent=
"Yes";

confirmationYesButton.disabled=false;

showNotification(
"Authentication Required",
"Your session has expired. Please log in again.",
"error",
()=>{
window.location.href=
"../admin-authentication/index.html";
}
);

return;
}

let data={};

try{
data=await response.json();
}catch(error){
data={};
}

if(!response.ok){

confirmationYesButton.textContent=
"Yes";

confirmationYesButton.disabled=false;

showNotification(
"Unable to Delete Admin",
data.message||
"The administrator account could not be deleted.",
"error"
);

return;
}

confirmationYesButton.textContent=
"Yes";

confirmationYesButton.disabled=false;

showNotification(
"Admin Deleted",
data.message||
"Admin account deleted successfully.",
"success",
()=>{
window.location.reload();
}
);

}catch(error){

console.error(
"Delete admin failed:",
error
);

confirmationYesButton.textContent=
"Yes";

confirmationYesButton.disabled=false;

showNotification(
"Connection Error",
"Unable to connect to the server. Please try again.",
"error"
);

}

}


/* =========================
LOGOUT FLOW
========================= */

logoutBtn.addEventListener(
"click",
()=>{
closeSidebar();

showConfirmation(
"Confirm Logout",
"Are you sure you want to log out?",
logoutAdmin
);

}
);

async function logoutAdmin(){

confirmationYesButton.textContent=
"Connecting...";

confirmationYesButton.disabled=true;

try{

const response=
await fetch(
API_ENDPOINT(LOGOUT_ENDPOINT),
{
method:"POST",
credentials:"include"
}
);

let data={};

try{
data=await response.json();
}catch(error){
data={};
}

if(!response.ok){

confirmationYesButton.textContent=
"Yes";

confirmationYesButton.disabled=false;

showNotification(
"Logout Failed",
data.message||
"Unable to log out. Please try again.",
"error"
);

return;
}

confirmationOverlay.hidden=true;

confirmationYesButton.textContent=
"Yes";

confirmationYesButton.disabled=false;

window.location.href=
"../admin-authentication/index.html";

}catch(error){

console.error(
"Logout failed:",
error
);

confirmationYesButton.textContent=
"Yes";

confirmationYesButton.disabled=false;

showNotification(
"Connection Error",
"Unable to connect to the server. Please try again.",
"error"
);

}

}


/* =========================
HELPERS
========================= */

function getInitials(fullName){

const name=
String(fullName||"").trim();

if(!name){
return"AD";
}

const parts=
name
.split(/\s+/)
.filter(Boolean);

if(parts.length===1){

return parts[0]
.substring(0,2)
.toUpperCase();

}

return(
parts[0][0]+
parts[parts.length-1][0]
).toUpperCase();

}

function escapeHTML(value){

return String(value??"")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");

}


/* =========================
START
========================= */

document.addEventListener(
"DOMContentLoaded",
()=>{
loadAdmins();
}
);