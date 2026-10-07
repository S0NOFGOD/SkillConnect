document.addEventListener("DOMContentLoaded",()=>{initializeNotificationModal();initializeReturnButton();initializeGoogleExchange();});

const getElement=id=>document.getElementById(id);

function saveWorkerEmail(email){sessionStorage.setItem("workerEmail",email);}

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
showExchangeError("This account uses password authentication. Please log in with your password.",true);
return;
}
showExchangeError("Google authentication could not be completed. Please try again.",false);
return;
}

if(!code){
showExchangeError("No authentication code was received.",false);
return;
}

try{
const response=await fetch(API_ENDPOINT("/api/worker-authentication/google/exchange"),{
method:"POST",
headers:{"Content-Type":"application/json"},
credentials:"include",
body:JSON.stringify({code})
});

const data=await response.json();

if(!response.ok){
showExchangeError(data.message||"Google authentication could not be completed.",true);
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
showModal(
"Login Successful",
data.message||`Welcome back, ${data.fullName}.`,
"success",
"../worker-dashboard/index.html"
);
return;
}

showExchangeError(data.message||"Unable to determine the result of Google authentication.",false);

}catch(error){
console.error("Google exchange error:",error);
showExchangeError("Unable to connect to the server. Please try again.",false);
}
}

function showExchangeError(message,returnToLogin){
getElement("loadingSpinner").classList.add("hidden");
getElement("statusMessage").textContent="Google authentication could not be completed.";
if(returnToLogin)getElement("returnButton").classList.remove("hidden");
showModal("Google Authentication Failed",message);
}