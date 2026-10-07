const VERIFY_OTP_URL=API_ENDPOINT("/api/auth/worker/password-reset-otp/verify");
const RESEND_OTP_URL=API_ENDPOINT("/api/auth/worker/password-reset-otp/resend");

const WORKER_AUTH_URL="../worker-authentication/index.html";
const PASSWORD_CHANGE_URL="../worker-password-change/index.html";

const otpForm=document.getElementById("otpForm");
const otpInputs=document.querySelectorAll(".otp-input");
const verifyButton=document.getElementById("verifyButton");
const verifyButtonText=verifyButton?verifyButton.querySelector(".btn-text"):null;
const workerEmailDisplay=document.getElementById("workerEmailDisplay");
const resendOTP=document.getElementById("resendOTP");
const countdown=document.getElementById("countdown");

const messageModal=document.getElementById("messageModal");
const messageModalOverlay=document.getElementById("messageModalOverlay");
const closeMessageModal=document.getElementById("closeMessageModal");
const messageModalButton=document.getElementById("messageModalButton");
const modalIcon=document.getElementById("modalIcon");
const messageModalTitle=document.getElementById("messageModalTitle");
const messageModalText=document.getElementById("messageModalText");

let workerEmail="";
let countdownTimer=null;
let requestInProgress=false;

document.addEventListener("DOMContentLoaded",initializePage);

function initializePage(){
workerEmail=sessionStorage.getItem("workerEmail");

if(!workerEmail){
    showModal("error","Session Expired","Your password reset session has expired. Please start the password reset process again.",function(){
        window.location.href=WORKER_AUTH_URL;
    });
    return;
}

if(workerEmailDisplay)workerEmailDisplay.textContent=workerEmail;
setupOTPInputs();
startCountdown();

}

function setupOTPInputs(){
otpInputs.forEach(function(input,index){

    input.addEventListener("input",function(){
        this.value=this.value.replace(/\D/g,"");

        if(this.value&&index<otpInputs.length-1){
            otpInputs[index+1].focus();
        }
    });

    input.addEventListener("keydown",function(event){
        if(event.key==="Backspace"&&!this.value&&index>0){
            otpInputs[index-1].focus();
        }
    });

    input.addEventListener("keypress",function(event){
        if(!/[0-9]/.test(event.key)){
            event.preventDefault();
        }
    });

    input.addEventListener("paste",function(event){
        event.preventDefault();

        const pastedText=(event.clipboardData||window.clipboardData)
            .getData("text")
            .replace(/\D/g,"")
            .slice(0,6);

        if(!pastedText)return;

        pastedText.split("").forEach(function(digit,digitIndex){
            if(otpInputs[digitIndex]){
                otpInputs[digitIndex].value=digit;
            }
        });

        const nextEmptyIndex=Array.from(otpInputs).findIndex(function(item){
            return !item.value;
        });

        if(nextEmptyIndex!==-1){
            otpInputs[nextEmptyIndex].focus();
        }else{
            otpInputs[otpInputs.length-1].focus();
        }
    });
});

}

function getOTPValue(){
return Array.from(otpInputs).map(function(input){
return input.value;
}).join("");
}

if(otpForm){
otpForm.addEventListener("submit",handleOTPVerification);
}

async function handleOTPVerification(event){
event.preventDefault();

if(requestInProgress)return;

workerEmail=sessionStorage.getItem("workerEmail");

if(!workerEmail){
    showModal("error","Session Expired","Your password reset session has expired. Please start again.",function(){
        window.location.href=WORKER_AUTH_URL;
    });
    return;
}

const otp=getOTPValue();

if(!otp){
    showModal("error","OTP Required","Please enter the 6-digit password reset code.");
    return;
}

if(!/^\d{6}$/.test(otp)){
    showModal("error","Invalid OTP","Please enter the complete 6-digit password reset code.");
    return;
}

setVerifyLoading(true);

try{
    const response=await fetch(VERIFY_OTP_URL,{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            email:workerEmail,
            otp:otp
        })
    });

    const data=await response.json();

    if(!response.ok||!data.success){
        showModal(
            "error",
            data.title||"Verification Failed",
            data.message||"The password reset code could not be verified."
        );
        return;
    }

    clearOTPInputs();

    showModal(
        "success",
        "OTP Verified",
        data.message||"Your password reset code has been verified successfully.",
        function(){
            window.location.href=PASSWORD_CHANGE_URL;
        }
    );

}catch(error){

    console.error(
        "Password reset OTP verification error:",
        error
    );

    showModal(
        "error",
        "Connection Error",
        "Unable to connect to the server. Please check your internet connection and try again."
    );

}finally{
    setVerifyLoading(false);
}

}

if(resendOTP){
resendOTP.addEventListener("click",handleResendOTP);
}

async function handleResendOTP(event){
event.preventDefault();

if(requestInProgress)return;

if(resendOTP.classList.contains("disabled"))return;

workerEmail=sessionStorage.getItem("workerEmail");

if(!workerEmail){
    showModal("error","Session Expired","Your password reset session has expired. Please start again.",function(){
        window.location.href=WORKER_AUTH_URL;
    });
    return;
}

setResendLoading(true);

try{
    const response=await fetch(RESEND_OTP_URL,{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            email:workerEmail
        })
    });

    const data=await response.json();

    if(!response.ok||!data.success){
        showModal(
            "error",
            data.title||"Unable To Resend OTP",
            data.message||"We could not send a new password reset code."
        );
        return;
    }

    clearOTPInputs();
    startCountdown();

    showModal(
        "success",
        "OTP Sent",
        data.message||"A new password reset code has been sent to your email."
    );

}catch(error){

    console.error(
        "Password reset OTP resend error:",
        error
    );

    showModal(
        "error",
        "Connection Error",
        "Unable to connect to the server. Please try again."
    );

}finally{
    setResendLoading(false);
}

}

function setVerifyLoading(isLoading){
if(!verifyButton)return;

if(isLoading){
    requestInProgress=true;
    verifyButton.disabled=true;

    if(verifyButtonText){
        verifyButtonText.innerHTML=`
            <span class="loading-spinner"></span>
            Connecting...
        `;
    }

}else{
    requestInProgress=false;
    verifyButton.disabled=false;

    if(verifyButtonText){
        verifyButtonText.textContent="Verify OTP";
    }
}

}

function setResendLoading(isLoading){
if(!resendOTP)return;

if(isLoading){
    requestInProgress=true;
    resendOTP.classList.add("disabled");
    resendOTP.textContent="Connecting...";

}else{
    requestInProgress=false;
    resendOTP.textContent="Resend OTP";
}

}

function clearOTPInputs(){
otpInputs.forEach(function(input){
input.value="";
});

if(otpInputs[0]){
    otpInputs[0].focus();
}

}

function startCountdown(){
if(countdownTimer){
clearInterval(countdownTimer);
countdownTimer=null;
}

let secondsRemaining=60;

if(resendOTP){
    resendOTP.classList.add("disabled");
    resendOTP.textContent="Resend OTP";
}

updateCountdown(secondsRemaining);

countdownTimer=setInterval(function(){
    secondsRemaining--;

    updateCountdown(secondsRemaining);

    if(secondsRemaining<=0){
        clearInterval(countdownTimer);
        countdownTimer=null;

        if(resendOTP){
            resendOTP.classList.remove("disabled");
            resendOTP.textContent="Resend OTP";
        }

        if(countdown){
            countdown.textContent="You can resend the OTP now.";
        }
    }
},1000);

}

function updateCountdown(seconds){
if(!countdown)return;

if(seconds>0){
    countdown.textContent=`Resend available in ${seconds}s`;
}

}

function showModal(type,title,message,onClose=null){
if(!messageModal)return;

messageModal.classList.remove("success","error");
messageModal.classList.add(type);

if(modalIcon){
    modalIcon.textContent=type==="success"?"✓":"!";
}

if(messageModalTitle){
    messageModalTitle.textContent=title;
}

if(messageModalText){
    messageModalText.textContent=message;
}

if(messageModalButton){
    messageModalButton.textContent="Continue";
}

messageModal.classList.add("show");
messageModal.setAttribute("aria-hidden","false");
messageModal._onClose=onClose;

}

function closeModal(){
if(!messageModal)return;

messageModal.classList.remove("show");
messageModal.setAttribute("aria-hidden","true");

const onClose=messageModal._onClose;

messageModal._onClose=null;

if(typeof onClose==="function"){
    onClose();
}

}

if(closeMessageModal){
closeMessageModal.addEventListener("click",closeModal);
}

if(messageModalButton){
messageModalButton.addEventListener("click",closeModal);
}

if(messageModalOverlay){
messageModalOverlay.addEventListener("click",closeModal);
}

document.addEventListener("keydown",function(event){
if(
event.key==="Escape"&&
messageModal&&
messageModal.classList.contains("show")
){
closeModal();
}
});