document.addEventListener("DOMContentLoaded",()=>{initializeNotificationModal();initializeReturnButton();initializeGoogleExchange();});

const getElement=id=>document.getElementById(id);

function saveWorkerEmail(email){sessionStorage.setItem("workerEmail",email);}
function saveAccessToken(token){sessionStorage.setItem("accessToken",token);}

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

function initializeNotificationModal(){
getElement("closeNotification").addEventListener("click",closeNotificationModal);
getElement("notificationButton").addEventListener("click",closeNotificationModal);
}

function initializeReturnButton(){
getElement("returnButton").addEventListener("click",()=>{
window.location.href="../worker-authentication/index.html";
});
}

async function initializeGoogleExchange(){
const params=new URLSearchParams(window.location.search);
const error=params.get("error");
const code=params.get("code");

if(error){
if(error==="password-account"){
handleExchangeError("This account uses password authentication. Please log in with your password.");
return;
}

handleExchangeError("Google authentication could not be completed. Please try again.");
return;
}

if(!code){
handleExchangeError("No authentication code was received.");
return;
}

try{
const response=await fetch(
API_ENDPOINT("/api/worker-authentication/google/exchange"),
{
method:"POST",
headers:{"Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify({code})
}
);

const data=await response.json();

if(!response.ok){
handleExchangeError(
data.message||"Google authentication could not be completed."
);
return;
}

if(data.email)saveWorkerEmail(data.email);

if(data.nextStep==="profile"){
showModal(
"Google Authentication Successful",
data.message||"Your Google account has been connected. Please complete your worker profile.",
"success",
"../worker-create-profile/index.html"
);
return;
}

if(data.nextStep==="authenticated"){
if(!data.accessToken){
handleExchangeError(
"Authentication completed, but no access token was received."
);
return;
}

saveAccessToken(data.accessToken);

showModal(
"Login Successful",
data.message||"Welcome back. Your account is ready.",
"success",
"../worker-dashboard/index.html"
);
return;
}

if(data.nextStep==="login-required"){
handleExchangeError(
data.message||"This account uses password authentication. Please log in with your password."
);
return;
}

if(data.nextStep==="suspended"){
handleExchangeError(
data.message||"Your account has been suspended."
);
return;
}

handleExchangeError(
data.message||"Unable to determine the result of Google authentication."
);

}catch(error){
console.error("Google exchange error:",error);
handleExchangeError(
"Unable to connect to the server. Please try again."
);
}
}

function handleExchangeError(message){
getElement("loadingSpinner").classList.add("hidden");
getElement("statusMessage").textContent="Google authentication could not be completed.";
getElement("retryButton").classList.remove("hidden");
getElement("returnButton").classList.remove("hidden");
showModal("Google Authentication Failed",message);
}

getElement("retryButton")?.addEventListener("click",()=>{
const button=getElement("retryButton");
button.disabled=true;
button.textContent="Connecting...";
window.location.href=API_ENDPOINT("/api/worker-authentication/google");
});