document.addEventListener("DOMContentLoaded",()=>{initializeTabs();initializePasswordToggles();initializeLogin();initializeSignup();initializeForgotPassword();initializeGoogleButtons();initializeNotificationModal();initializeForgotModal();});
const getElement=id=>document.getElementById(id);

const CLIENT_AUTH_ENDPOINT="/api/client-authentication";
const CLIENT_GOOGLE_ENDPOINT="/api/client-authentication/google";
const CLIENT_FORGOT_PASSWORD_ENDPOINT="/api/client-authentication/forgot-password";

function setLoading(button,loading,text=""){
if(!button)return;
if(loading){
button.dataset.originalText=button.textContent;
if(text)button.textContent=text;
button.disabled=true;
button.classList.add("loading");
}else{
button.textContent=button.dataset.originalText||button.textContent;
button.disabled=false;
button.classList.remove("loading");
}
}

function isValidEmail(email){
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

let notificationCallback=null;

function showNotification(title,message,type="success",callback=null){
const modal=getElement("notificationModal"),icon=getElement("notificationIcon");
getElement("notificationTitle").textContent=title;
getElement("notificationMessage").textContent=message;
icon.textContent=type==="error"?"!":"✓";
notificationCallback=callback;
modal.classList.add("show");
modal.setAttribute("aria-hidden","false");
}

function closeNotification(){
const modal=getElement("notificationModal");
modal.classList.remove("show");
modal.setAttribute("aria-hidden","true");
const callback=notificationCallback;
notificationCallback=null;
if(typeof callback==="function")callback();
}

function initializeNotificationModal(){
getElement("closeNotification").addEventListener("click",closeNotification);
getElement("notificationOverlay").addEventListener("click",closeNotification);
getElement("notificationButton").addEventListener("click",closeNotification);
}

function openForgotModal(){
const modal=getElement("forgotModal");
modal.classList.add("show");
modal.setAttribute("aria-hidden","false");
getElement("resetEmail").focus();
}

function closeForgotModal(){
const modal=getElement("forgotModal");
modal.classList.remove("show");
modal.setAttribute("aria-hidden","true");
}

function initializeForgotModal(){
getElement("forgotPassword").addEventListener("click",openForgotModal);
getElement("closeModal").addEventListener("click",closeForgotModal);
getElement("forgotOverlay").addEventListener("click",closeForgotModal);
}

function initializeTabs(){
document.querySelectorAll(".tab").forEach(tab=>{
tab.addEventListener("click",()=>{
document.querySelectorAll(".tab").forEach(item=>item.classList.remove("active"));
document.querySelectorAll(".auth-form").forEach(form=>form.classList.remove("active"));
tab.classList.add("active");
getElement(`${tab.dataset.tab}Form`).classList.add("active");
});
});
}

function initializePasswordToggles(){
[["toggleLoginPassword","loginPassword"],["toggleSignupPassword","signupPassword"],["toggleConfirmPassword","confirmPassword"]].forEach(([buttonId,inputId])=>{
getElement(buttonId).addEventListener("click",()=>{
const input=getElement(inputId),button=getElement(buttonId),visible=input.type==="text";
input.type=visible?"password":"text";
button.textContent=visible?"Show":"Hide";
button.setAttribute("aria-label",visible?"Show password":"Hide password");
});
});
}

function initializeLogin(){
getElement("loginForm").addEventListener("submit",async event=>{
event.preventDefault();
const email=getElement("loginEmail").value.trim().toLowerCase(),password=getElement("loginPassword").value,button=getElement("loginButton");

    if(!isValidEmail(email))return showNotification("Invalid Email","Please enter a valid email address.","error");
    if(!password)return showNotification("Password Required","Please enter your password.","error");
    if(password.length<8)return showNotification("Invalid Password","Password must be at least 8 characters.","error");

    setLoading(button,true,"Logging in...");

    try{
        const response=await fetch(API_ENDPOINT(CLIENT_AUTH_ENDPOINT+"/login"),{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            credentials:"include",
            body:JSON.stringify({email,password})
        });
        const data=await response.json().catch(()=>({}));

        if(!response.ok){
            setLoading(button,false);
            return showNotification("Login Failed",data.message||"Unable to login. Please try again.","error");
        }

        setLoading(button,false);

        if(data.requiresEmailVerification){
            sessionStorage.setItem("clientEmail",email);
            return showNotification("Verify Your Email",data.message||"A verification code has been sent to your email.","success",()=>location.href="../client-email-otp/index.html");
        }

        if(data.profileCompleted===false){
            sessionStorage.setItem("clientEmail",email);
            return showNotification("Complete Your Profile",data.message||"Please complete your client profile.","success",()=>location.href="../client-create-profile/index.html");
        }

        if(data.accessToken)setAccessToken(data.accessToken);

        showNotification("Login Successful",data.message||"You have logged in successfully.","success",()=>location.href="../client-dashboard/index.html");
    }catch(error){
        console.error("Client login failed:",error);
        setLoading(button,false);
        showNotification("Connection Error","Unable to connect to the server. Please try again.","error");
    }
});

}

function initializeSignup(){
getElement("signupForm").addEventListener("submit",async event=>{
event.preventDefault();
const email=getElement("signupEmail").value.trim().toLowerCase(),password=getElement("signupPassword").value,confirmPassword=getElement("confirmPassword").value,terms=getElement("termsCheckbox").checked,button=getElement("signupButton");

    if(!isValidEmail(email))return showNotification("Invalid Email","Please enter a valid email address.","error");
    if(password.length<8)return showNotification("Invalid Password","Password must be at least 8 characters.","error");
    if(password!==confirmPassword)return showNotification("Password Mismatch","Passwords do not match.","error");
    if(!terms)return showNotification("Agreement Required","Please agree to the Terms and Privacy Policy.","error");

    setLoading(button,true,"Creating Account...");

    try{
        const response=await fetch(API_ENDPOINT(CLIENT_AUTH_ENDPOINT+"/signup"),{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            credentials:"include",
            body:JSON.stringify({email,password})
        });
        const data=await response.json().catch(()=>({}));

        if(!response.ok){
            setLoading(button,false);
            return showNotification("Account Creation Failed",data.message||"Unable to create your account. Please try again.","error");
        }

        sessionStorage.setItem("clientEmail",data.email||email);
        setLoading(button,false);
        showNotification("Account Created",data.message||"Your account was created successfully. Check your email for the verification code.","success",()=>location.href="../client-email-otp/index.html");
    }catch(error){
        console.error("Client signup failed:",error);
        setLoading(button,false);
        showNotification("Connection Error","Unable to connect to the server. Please try again.","error");
    }
});

}

function initializeForgotPassword(){
getElement("forgotForm").addEventListener("submit",async event=>{
event.preventDefault();
const email=getElement("resetEmail").value.trim().toLowerCase(),button=getElement("forgotButton");

    if(!isValidEmail(email))return showNotification("Invalid Email","Please enter a valid email address.","error");

    setLoading(button,true,"Verifying...");

    try{
        const response=await fetch(API_ENDPOINT(CLIENT_FORGOT_PASSWORD_ENDPOINT),{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            credentials:"include",
            body:JSON.stringify({email})
        });
        const data=await response.json().catch(()=>({}));

        if(!response.ok){
            setLoading(button,false);
            return showNotification("Email Verification Failed",data.message||"Unable to verify this email address.","error");
        }

        sessionStorage.setItem("clientEmail",data.email||email);
        setLoading(button,false);
        closeForgotModal();
        showNotification("Verification Code Sent",data.message||"A password reset code has been sent to your email.","success",()=>location.href="../client-password-reset-otp/index.html");
    }catch(error){
        console.error("Client password reset request failed:",error);
        setLoading(button,false);
        showNotification("Connection Error","Unable to connect to the server. Please try again.","error");
    }
});

}

function initializeGoogleButtons(){
const loginButton=getElement("googleLoginButton"),signupButton=getElement("googleSignupButton");
loginButton.addEventListener("click",()=>startGoogleAuthentication(loginButton));
signupButton.addEventListener("click",()=>startGoogleAuthentication(signupButton));
}

function startGoogleAuthentication(button){
setLoading(button,true,"Connecting...");
window.location.href=API_ENDPOINT(CLIENT_GOOGLE_ENDPOINT);
}