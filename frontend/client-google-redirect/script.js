document.addEventListener("DOMContentLoaded",()=>{
    initializeGoogleRedirect();
    initializeNotificationModal();
});

const getElement=id=>document.getElementById(id);
const GOOGLE_EXCHANGE_ENDPOINT="/api/client-authentication/google/exchange";

function initializeGoogleRedirect(){
    const params=new URLSearchParams(window.location.search);
    const code=params.get("code");
    const error=params.get("error");

    if(error){
        return showNotification("Google Authentication",error,()=>{
            window.location.href="../client-authentication/index.html";
        });
    }

    if(!code){
        return showNotification("Google Authentication","Google authentication code is missing.",()=>{
            window.location.href="../client-authentication/index.html";
        });
    }

    exchangeGoogleCode(code);
}

async function exchangeGoogleCode(code){
    const message=getElement("redirectMessage");
    if(message)message.textContent="Please wait while we complete your authentication.";

    try{
        const response=await fetch(API_ENDPOINT(GOOGLE_EXCHANGE_ENDPOINT),{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            credentials:"include",
            body:JSON.stringify({exchangeCode:code})
        });

        const data=await response.json().catch(()=>({}));

        if(!response.ok){
            return showNotification("Google Authentication",data.message||"Google authentication failed.",()=>{
                window.location.href="../client-authentication/index.html";
            });
        }

        if(data.email)sessionStorage.setItem("clientEmail",data.email);

        if(data.profileCompleted===false){
            return showNotification("Authentication Successful",data.message||"Please complete your client profile.",()=>{
                window.location.href="../client-create-profile/index.html";
            });
        }

        if(data.profileCompleted===true){
            return showNotification("Authentication Successful",data.message||`Welcome back, ${data.fullName||"Client"}!`,()=>{
                window.location.href="../client-dashboard/index.html";
            });
        }

        showNotification("Google Authentication","Authentication response was incomplete.",()=>{
            window.location.href="../client-authentication/index.html";
        });
    }catch(error){
        console.error("Google exchange failed:",error);
        showNotification("Connection Error","Unable to connect to the server. Please try again.",()=>{
            window.location.href="../client-authentication/index.html";
        });
    }
}

let notificationCallback=null;

function initializeNotificationModal(){
    const button=getElement("notificationButton");
    if(button)button.addEventListener("click",closeNotification);

    const overlay=getElement("notificationOverlay");
    if(overlay)overlay.addEventListener("click",event=>{
        if(event.target===overlay)closeNotification();
    });
}

function showNotification(title,message,callback=null){
    const overlay=getElement("notificationOverlay");
    const titleElement=getElement("notificationTitle");
    const messageElement=getElement("notificationMessage");

    notificationCallback=callback;

    if(titleElement)titleElement.textContent=title;
    if(messageElement)messageElement.textContent=message;
    if(overlay){
        overlay.hidden=false;
        overlay.setAttribute("aria-hidden","false");
    }
}

function closeNotification(){
    const overlay=getElement("notificationOverlay");
    if(overlay){
        overlay.hidden=true;
        overlay.setAttribute("aria-hidden","true");
    }

    const callback=notificationCallback;
    notificationCallback=null;
    if(typeof callback==="function")callback();
}