document.addEventListener("DOMContentLoaded",()=>{

const resetForm=document.getElementById("resetForm");
const passwordInput=document.getElementById("password");
const confirmPasswordInput=document.getElementById("confirmPassword");
const passwordToggle=document.getElementById("passwordToggle");
const confirmToggle=document.getElementById("confirmToggle");
const changePasswordBtn=document.getElementById("changePasswordBtn");
const buttonText=document.getElementById("buttonText");
const buttonLoader=document.getElementById("buttonLoader");

const notificationModal=document.getElementById("notificationModal");
const notificationOverlay=document.getElementById("notificationOverlay");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationMessage=document.getElementById("notificationMessage");
const notificationButton=document.getElementById("notificationButton");
const closeNotification=document.getElementById("closeNotification");

const workerEmail=sessionStorage.getItem("workerEmail");

function redirectToWorkerAuthentication(){
    window.location.href="../worker-authentication/index.html";
}

function closeModal(){
    notificationModal.classList.remove("show");
    notificationModal.setAttribute("aria-hidden","true");
}

function showModal(type,title,message,onContinue=null){
    notificationModal.classList.remove("success","error");
    notificationModal.classList.add(type);

    notificationIcon.textContent=type==="success"?"✓":"!";
    notificationTitle.textContent=title;
    notificationMessage.textContent=message;

    notificationButton._onContinue=onContinue;

    notificationModal.classList.add("show");
    notificationModal.setAttribute("aria-hidden","false");
    notificationButton.focus();
}

function continueModal(){
    const callback=notificationButton._onContinue;

    notificationButton._onContinue=null;

    closeModal();

    if(callback){
        callback();
    }
}

notificationButton.addEventListener("click",continueModal);
closeNotification.addEventListener("click",continueModal);

notificationOverlay.addEventListener("click",()=>{
    closeModal();
});

document.addEventListener("keydown",(event)=>{
    if(
        event.key==="Escape"&&
        notificationModal.classList.contains("show")
    ){
        closeModal();
    }
});

if(!workerEmail){
    showModal(
        "error",
        "Reset Session Required",
        "Your password reset session is missing or expired. Please restart the password reset process.",
        redirectToWorkerAuthentication
    );
    return;
}

passwordToggle.addEventListener("click",()=>{
    if(passwordInput.type==="password"){
        passwordInput.type="text";
        passwordToggle.textContent="🙈";
        passwordToggle.setAttribute("aria-label","Hide password");
    }else{
        passwordInput.type="password";
        passwordToggle.textContent="👁";
        passwordToggle.setAttribute("aria-label","Show password");
    }
});

confirmToggle.addEventListener("click",()=>{
    if(confirmPasswordInput.type==="password"){
        confirmPasswordInput.type="text";
        confirmToggle.textContent="🙈";
        confirmToggle.setAttribute("aria-label","Hide confirm password");
    }else{
        confirmPasswordInput.type="password";
        confirmToggle.textContent="👁";
        confirmToggle.setAttribute("aria-label","Show confirm password");
    }
});

function setLoadingState(isLoading){
    if(isLoading){
        buttonText.hidden=true;
        buttonLoader.hidden=false;
        changePasswordBtn.disabled=true;
        passwordInput.disabled=true;
        confirmPasswordInput.disabled=true;
    }else{
        buttonText.hidden=false;
        buttonLoader.hidden=true;
        changePasswordBtn.disabled=false;
        passwordInput.disabled=false;
        confirmPasswordInput.disabled=false;
    }
}

resetForm.addEventListener("submit",async(event)=>{
    event.preventDefault();

    const password=passwordInput.value.trim();
    const confirmPassword=confirmPasswordInput.value.trim();

    if(!password){
        showModal(
            "error",
            "Password Required",
            "Please enter a new password."
        );
        return;
    }

    if(password.length<8){
        showModal(
            "error",
            "Password Too Short",
            "Your password must contain at least 8 characters."
        );
        return;
    }

    if(!confirmPassword){
        showModal(
            "error",
            "Confirmation Required",
            "Please confirm your new password."
        );
        return;
    }

    if(password!==confirmPassword){
        showModal(
            "error",
            "Passwords Do Not Match",
            "The new password and confirmation password must be the same."
        );
        return;
    }

    setLoadingState(true);

    try{

        const response=await fetch(
            API_ENDPOINT("/api/worker-password-change"),
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    email:workerEmail,
                    newPassword:password,
                    confirmPassword:confirmPassword
                })
            }
        );

        const data=await response.json();

        if(!response.ok){

            setLoadingState(false);

            if(
                response.status===401&&
                data.message&&
                data.message.toLowerCase().includes("authorization")
            ){
                showModal(
                    "error",
                    "Password Reset Expired",
                    data.message,
                    redirectToWorkerAuthentication
                );
                return;
            }

            showModal(
                "error",
                "Password Change Failed",
                data.message||
                "Unable to change your password. Please try again."
            );

            return;
        }

        sessionStorage.removeItem("workerEmail");

        setLoadingState(false);

        showModal(
            "success",
            "Password Changed",
            data.message||
            "Your password has been changed successfully. You can now log in with your new password.",
            redirectToWorkerAuthentication
        );

    }catch(error){

        console.error(
            "Worker password change error:",
            error
        );

        setLoadingState(false);

        showModal(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please check your internet connection and try again."
        );
    }

});

});