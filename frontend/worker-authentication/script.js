document.addEventListener("DOMContentLoaded",()=>{initializeTabs();initializePasswordToggles();initializeLogin();initializeSignup();initializeForgotPassword();initializeGoogleButtons();initializeNotificationModal();initializeForgotModal();});
const getElement=id=>document.getElementById(id);
let pendingRedirect=null;

function validateEmail(email){
if(!email){showModal("Email Required","Please enter your email address.");return false;}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showModal("Invalid Email","Please enter a valid email address.");return false;}
return true;
}

function initializeTabs(){
document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
document.querySelectorAll(".tab").forEach(item=>item.classList.remove("active"));
document.querySelectorAll(".auth-form").forEach(form=>form.classList.remove("active"));
tab.classList.add("active");
getElement(tab.dataset.tab==="login"?"loginForm":"signupForm").classList.add("active");
}));
}

function initializePasswordToggles(){
[["toggleLoginPassword","loginPassword"],["toggleSignupPassword","signupPassword"],["toggleConfirmPassword","confirmPassword"]].forEach(([buttonId,inputId])=>{
const button=getElement(buttonId),input=getElement(inputId);
button.addEventListener("click",()=>{
const hidden=input.type==="password";
input.type=hidden?"text":"password";
button.textContent=hidden?"Hide":"Show";
});
});
}

function setLoading(button,loading,text){
if(loading){
button.disabled=true;
button.dataset.text=button.textContent;
button.textContent=text;
button.classList.add("loading");
}else{
button.disabled=false;
button.textContent=button.dataset.text||text;
button.classList.remove("loading");
}
}

async function postRequest(endpoint,body){
const response=await fetch(API_ENDPOINT(endpoint),{
method:"POST",
headers:{"Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify(body)
});
const data=await response.json();
return{response,data};
}

function handleConnectionError(error,button){
console.error(error);
setLoading(button,false);
showModal("Connection Error","Unable to connect to the server. Please try again.");
}

function saveWorkerEmail(email){
sessionStorage.setItem("workerEmail",email);
}

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

function initializeNotificationModal(){
getElement("closeNotification").addEventListener("click",closeNotificationModal);
getElement("notificationButton").addEventListener("click",closeNotificationModal);
}

/* LOGIN */

function initializeLogin(){
getElement("loginForm").addEventListener("submit",async event=>{
event.preventDefault();

const button=getElement("loginButton");
const email=getElement("loginEmail").value.trim().toLowerCase();
const password=getElement("loginPassword").value;

if(!validateEmail(email))return;
if(!password){showModal("Password Required","Please enter your password.");return;}

setLoading(button,true,"Connecting...");

try{
const{response,data}=await postRequest("/api/worker-authentication/login",{email,password});

if(!response.ok){
setLoading(button,false);
showModal("Login Failed",data.message||"Unable to authenticate your account.");
return;
}

if(data.nextStep==="email-verification"){
saveWorkerEmail(data.email||email);
setLoading(button,false);
showModal("Verify Your Email",data.message||"A new verification code has been sent to your email.","success","../worker-email-otp/index.html");
return;
}

if(data.nextStep==="profile"){
saveWorkerEmail(data.email||email);
setLoading(button,false);
showModal("Complete Your Profile",data.message||"Please complete your worker profile.","success","../worker-create-profile/index.html");
return;
}

if(data.nextStep==="authenticated"){
setLoading(button,false);
showModal("Login Successful",data.message||`Welcome back, ${data.fullName}.`,"success","../worker-dashboard/index.html");
return;
}

setLoading(button,false);
showModal("Authentication Error",data.message||"Unable to determine your account status.");
}catch(error){
handleConnectionError(error,button);
}
});
}

/* SIGN UP */

function initializeSignup(){
getElement("signupForm").addEventListener("submit",async event=>{
event.preventDefault();

const button=getElement("signupButton");
const email=getElement("signupEmail").value.trim().toLowerCase();
const password=getElement("signupPassword").value;
const confirmPassword=getElement("confirmPassword").value;
const termsAccepted=getElement("termsCheckbox").checked;

if(!validateEmail(email))return;
if(!password){showModal("Password Required","Please enter your password.");return;}
if(password.length<8){showModal("Password Too Short","Password must be at least 8 characters.");return;}
if(!confirmPassword){showModal("Confirm Password Required","Please confirm your password.");return;}
if(password!==confirmPassword){showModal("Passwords Do Not Match","Please make sure both passwords match.");return;}
if(!termsAccepted){showModal("Agreement Required","You must agree to the Terms and Privacy Policy.");return;}

setLoading(button,true,"Connecting...");

try{
const{response,data}=await postRequest("/api/worker-authentication/signup",{email,password,confirmPassword,termsAccepted});

if(!response.ok){
setLoading(button,false);
showModal("Account Creation Failed",data.message||"Unable to create your account.");
return;
}

saveWorkerEmail(data.email||email);
setLoading(button,false);
showModal("Account Created",data.message||"Your verification code has been sent to your email.","success","../worker-email-otp/index.html");
}catch(error){
handleConnectionError(error,button);
}
});
}

/* FORGOT PASSWORD */

function initializeForgotPassword(){
getElement("forgotForm").addEventListener("submit",async event=>{
event.preventDefault();

const button=getElement("forgotButton");
const email=getElement("resetEmail").value.trim().toLowerCase();

if(!validateEmail(email))return;

setLoading(button,true,"Connecting...");

try{
const{response,data}=await postRequest("/api/worker-authentication/forgot-password",{email});

if(!response.ok){
setLoading(button,false);
closeForgotModal();
showModal("Request Failed",data.message||"Unable to process your request.");
return;
}

saveWorkerEmail(data.email||email);
setLoading(button,false);
closeForgotModal();
showModal("Verification Code Sent",data.message||"A password reset code has been sent to your email.","success","../worker-password-reset-otp/index.html");
}catch(error){
handleConnectionError(error,button);
}
});
}

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

/* CONTINUE WITH GOOGLE */

function initializeGoogleButtons(){
[getElement("googleLoginButton"),getElement("googleSignupButton")].forEach(button=>{
button.addEventListener("click",()=>{
button.disabled=true;
button.textContent="Connecting...";
button.classList.add("loading");
window.location.href=API_ENDPOINT("/api/worker-authentication/google");
});
});
}

document.addEventListener("keydown",event=>{
if(event.key!=="Escape")return;
const modal=getElement("forgotModal");
if(modal.classList.contains("show"))closeForgotModal();
});