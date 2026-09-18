/* 1. INITIALIZE PAGE */
document.addEventListener("DOMContentLoaded",()=>{
initializeTabs();
initializePasswordToggles();
initializeLogin();
initializeSignup();
initializeForgotPassword();
initializeGoogleButtons();
initializeNotificationModal();
initializeForgotModal();
});

/* 2. ELEMENT HELPER */
const getElement=id=>document.getElementById(id);

/* 3. TAB SWITCHING */
function initializeTabs(){
document.querySelectorAll(".tab").forEach(tab=>{
tab.addEventListener("click",()=>{
document.querySelectorAll(".tab").forEach(item=>item.classList.remove("active"));
document.querySelectorAll(".auth-form").forEach(form=>form.classList.remove("active"));
tab.classList.add("active");
const form=getElement(tab.dataset.tab==="login"?"loginForm":"signupForm");
form.classList.add("active");
});
});
}

/* 4. PASSWORD TOGGLES */
function initializePasswordToggles(){
const toggles=[
["toggleLoginPassword","loginPassword"],
["toggleSignupPassword","signupPassword"],
["toggleConfirmPassword","confirmPassword"]
];

toggles.forEach(([buttonId,inputId])=>{
const button=getElement(buttonId);
const input=getElement(inputId);

button.addEventListener("click",()=>{
const hidden=input.type==="password";
input.type=hidden?"text":"password";
button.textContent=hidden?"Hide":"Show";
});
});
}

/* 5. VALIDATION */
function validEmail(email){
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEmail(email,button){
if(validEmail(email))return true;

setLoading(button,false);

showModal(
"Invalid Email",
"Please enter a valid email address."
);

return false;
}

/* 6. LOADING STATE */
function setLoading(button,loading,text){
if(loading){
button.disabled=true;
button.dataset.text=button.textContent;
button.textContent=text;
button.classList.add("loading");
return;
}

button.disabled=false;
button.textContent=button.dataset.text||text;
button.classList.remove("loading");
}

/* 7. API REQUEST */
async function postRequest(endpoint,body){
const response=await fetch(
API_ENDPOINT(endpoint),
{
method:"POST",
headers:{"Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify(body)
}
);

const data=await response.json();

return{response,data};
}

/* 8. CONNECTION ERROR */
function handleConnectionError(error,button){
console.error(error);
setLoading(button,false);

showModal(
"Connection Error",
"Unable to connect to the server. Please try again."
);
}

/* 9. SESSION STORAGE */
function saveWorkerEmail(email){
sessionStorage.setItem("workerEmail",email);
}

function saveAccessToken(token){
sessionStorage.setItem("accessToken",token);
}

/* 10. NOTIFICATION MODAL */
let pendingRedirect=null;

function showModal(title,message,type="error",redirect=null){
getElement("notificationTitle").textContent=title;
getElement("notificationMessage").textContent=message;
getElement("notificationIcon").textContent=type==="success"?"✓":"!";

pendingRedirect=redirect;

const modal=getElement("notificationModal");

modal.classList.add("show");
modal.setAttribute("aria-hidden","false");
}

function closeNotificationModal(){
const modal=getElement("notificationModal");

modal.classList.remove("show");
modal.setAttribute("aria-hidden","true");

const redirect=pendingRedirect;
pendingRedirect=null;

if(redirect)window.location.href=redirect;
}

/* 11. NOTIFICATION EVENTS */
function initializeNotificationModal(){
getElement("closeNotification").addEventListener("click",closeNotificationModal);
getElement("notificationButton").addEventListener("click",closeNotificationModal);
}

/* 12. LOGIN FLOW */
function initializeLogin(){
getElement("loginForm").addEventListener("submit",async event=>{
event.preventDefault();

const button=getElement("loginButton");

const email=getElement("loginEmail")
.value.trim()
.toLowerCase();

const password=getElement("loginPassword").value;

setLoading(button,true,"Logging in...");

if(!validateEmail(email,button))return;

if(!password){
setLoading(button,false);

showModal(
"Password Required",
"Please enter your password."
);

return;
}

try{
const{response,data}=await postRequest(
"/api/worker-authentication/login",
{email,password}
);

if(!response.ok){
setLoading(button,false);

showModal(
"Login Failed",
data.message||"Unable to authenticate your account."
);

return;
}

saveWorkerEmail(data.email||email);

if(data.nextStep==="email-verification"){
setLoading(button,false);

showModal(
"Verify Your Email",
data.message||"A new verification code has been sent to your email.",
"success",
"../worker-email-otp/index.html"
);

return;
}

if(data.nextStep==="profile"){
setLoading(button,false);

showModal(
"Complete Your Profile",
data.message||"Your email is verified. Please complete your worker profile.",
"success",
"../worker-create-profile/index.html"
);

return;
}

if(data.nextStep==="authenticated"){
if(!data.accessToken){
setLoading(button,false);

showModal(
"Login Failed",
"Authentication was successful, but no access token was received."
);

return;
}

saveAccessToken(data.accessToken);
setLoading(button,false);

showModal(
"Login Successful",
"Welcome back. You can now access your dashboard.",
"success",
"../worker-dashboard/index.html"
);

return;
}

setLoading(button,false);

showModal(
"Authentication Error",
data.message||"Unable to determine your account status."
);

}catch(error){
handleConnectionError(error,button);
}
});
}

/* 13. CREATE ACCOUNT */
function initializeSignup(){
getElement("signupForm").addEventListener("submit",async event=>{
event.preventDefault();

const button=getElement("signupButton");

const email=getElement("signupEmail")
.value.trim()
.toLowerCase();

const password=getElement("signupPassword").value;
const confirmPassword=getElement("confirmPassword").value;
const termsAccepted=getElement("termsCheckbox").checked;

setLoading(button,true,"Creating...");

if(!validateEmail(email,button))return;

if(password.length<8){
setLoading(button,false);

showModal(
"Invalid Password",
"Password must contain at least 8 characters."
);

return;
}

if(password!==confirmPassword){
setLoading(button,false);

showModal(
"Passwords Do Not Match",
"Please make sure both passwords are identical."
);

return;
}

if(!termsAccepted){
setLoading(button,false);

showModal(
"Agreement Required",
"Please agree to the Terms and Privacy Policy."
);

return;
}

try{
const{response,data}=await postRequest(
"/api/worker-authentication/signup",
{
email,
password,
confirmPassword,
termsAccepted
}
);

if(!response.ok){
setLoading(button,false);

showModal(
"Account Creation Failed",
data.message||"Unable to create your account."
);

return;
}

saveWorkerEmail(data.email||email);
setLoading(button,false);

showModal(
"Account Created",
data.message||"Your verification code has been sent to your email.",
"success",
"../worker-email-otp/index.html"
);

}catch(error){
handleConnectionError(error,button);
}
});
}

/* 14. FORGOT PASSWORD */
function initializeForgotPassword(){
getElement("forgotForm").addEventListener("submit",async event=>{
event.preventDefault();

const button=getElement("forgotButton");

const email=getElement("resetEmail")
.value.trim()
.toLowerCase();

setLoading(button,true,"Verifying...");

if(!validateEmail(email,button))return;

try{
const{response,data}=await postRequest(
"/api/worker-authentication/forgot-password",
{email}
);

setLoading(button,false);

if(data.emailExists===false){
showModal(
"Request Received",
data.message||"If an account exists for this email, further instructions will be provided."
);

return;
}

if(!response.ok){
showModal(
"Request Failed",
data.message||"Unable to process your request."
);

return;
}

closeForgotModal();
saveWorkerEmail(data.email||email);

showModal(
"Verification Code Sent",
data.message||"A password reset code has been sent to your email.",
"success",
"../worker-password-reset-otp/index.html"
);

}catch(error){
handleConnectionError(error,button);
}
});
}

/* 15. FORGOT PASSWORD MODAL */
function initializeForgotModal(){
const modal=getElement("forgotModal");

getElement("forgotPassword").addEventListener("click",()=>{
modal.classList.add("show");
modal.setAttribute("aria-hidden","false");
});

getElement("closeModal").addEventListener("click",closeForgotModal);
getElement("forgotOverlay").addEventListener("click",closeForgotModal);
}

function closeForgotModal(){
const modal=getElement("forgotModal");

modal.classList.remove("show");
modal.setAttribute("aria-hidden","true");
}

/* 16. GOOGLE AUTHENTICATION */
function initializeGoogleButtons(){
const buttons=[
getElement("googleLoginButton"),
getElement("googleSignupButton")
];

buttons.forEach(button=>{
button.addEventListener("click",()=>{
button.disabled=true;
button.dataset.text=button.textContent;
button.textContent="Connecting...";
button.classList.add("loading");

window.location.href=API_ENDPOINT(
"/api/worker-authentication/google"
);
});
});
}

/* 17. ESCAPE KEY */
document.addEventListener("keydown",event=>{
if(event.key!=="Escape")return;

const forgotModal=getElement("forgotModal");

if(forgotModal.classList.contains("show")){
closeForgotModal();
}
});