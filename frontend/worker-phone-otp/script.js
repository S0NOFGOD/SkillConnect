"use strict";

const PHONE_ENDPOINT="/api/worker/phone-otp";
const VERIFY_ENDPOINT="/api/worker/verify-phone";
const RESEND_ENDPOINT="/api/worker/resend-phone-otp";

const workerPhone=document.getElementById("workerPhone");
const otpForm=document.getElementById("otpForm");
const otpInputs=[...document.querySelectorAll(".otp-input")];
const verifyButton=document.getElementById("verifyButton");
const resendOTP=document.getElementById("resendOTP");
const countdown=document.getElementById("countdown");

const notificationModal=document.getElementById("notificationModal");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationMessage=document.getElementById("notificationMessage");
const notificationCloseButton=document.getElementById("notificationCloseButton");

let countdownTimer=null;
let resendSeconds=60;
let modalCallback=null;
let phoneLoaded=false;
let verificationInProgress=false;
let resendInProgress=false;
let sessionExpired=false;

/* INITIALIZE */

document.addEventListener("DOMContentLoaded",()=>{
    initializeOTPInputs();
    initializeVerification();
    initializeResend();
    initializeNotificationModal();
    loadWorkerPhone();
});

/* NOTIFICATIONS */

function showNotification(title,message,type="success",callback=null){
    notificationTitle.textContent=title;
    notificationMessage.textContent=message;
    notificationIcon.className=`notification-icon ${type}`;
    notificationIcon.textContent=type==="success"?"✓":"!";
    modalCallback=callback;
    notificationModal.hidden=false;
}

function closeNotification(){
    notificationModal.hidden=true;
}

function initializeNotificationModal(){
    notificationCloseButton.addEventListener("click",()=>{
        closeNotification();
        const callback=modalCallback;
        modalCallback=null;
        if(typeof callback==="function")callback();
    });
}

/* AUTHENTICATION EXPIRY */

function redirectToLogin(){
    window.location.href="../worker-authentication/index.html";
}

function handleAuthenticationExpiry(){
    sessionExpired=true;
    stopCountdown();

    setButtonLoading(verifyButton,false,"Verify Phone");
    verifyButton.disabled=true;

    resendOTP.classList.add("disabled");
    resendOTP.setAttribute("aria-disabled","true");
    resendOTP.textContent="Resend OTP";

    if(!notificationModal.hidden)return;

    showNotification(
        "Authentication Required",
        "Your authentication session has expired. Please log in again.",
        "error",
        redirectToLogin
    );
}

window.addEventListener("authSessionExpired",()=>{
    handleAuthenticationExpiry();
});

/* LOAD MASKED PHONE */

async function loadWorkerPhone(){
    workerPhone.textContent="Connecting...";
    countdown.textContent="Connecting...";
    setControlsDisabled(true);

    try{
        const response=await API_REQUEST(PHONE_ENDPOINT,{method:"GET"});
        const data=await response.json().catch(()=>({}));

        if(response.status===401){
            handleAuthenticationExpiry();
            return;
        }

        if(!response.ok){
            showNotification(
                "Request Failed",
                data.message||"Unable to load your phone number.",
                "error",
                ()=>{window.location.reload();}
            );
            return;
        }

        if(sessionExpired)return;

        if(typeof data.phone!=="string"||!data.phone){
            showNotification(
                "Phone Unavailable",
                "The server did not return your masked phone number.",
                "error"
            );
            return;
        }

        workerPhone.textContent=data.phone;
        phoneLoaded=true;
        setControlsDisabled(false);
        startCountdown();

    }catch(error){
        console.error("Load phone request failed:",error);
        countdown.textContent="Unable to connect.";

        showNotification(
            "Connection Failed",
            "Unable to connect to the server. Please try again.",
            "error",
            loadWorkerPhone
        );
    }
}

function setControlsDisabled(disabled){
    otpInputs.forEach(input=>input.disabled=disabled);
    verifyButton.disabled=disabled||sessionExpired;

    if(disabled){
        resendOTP.classList.add("disabled");
        resendOTP.setAttribute("aria-disabled","true");
    }
}

/* OTP INPUTS */

function initializeOTPInputs(){
    otpInputs.forEach((input,index)=>{
        input.addEventListener("input",()=>{
            input.value=input.value.replace(/\D/g,"").slice(0,1);
            input.classList.remove("invalid");

            if(input.value&&index<otpInputs.length-1){
                otpInputs[index+1].focus();
            }
        });

        input.addEventListener("keydown",event=>{
            if(event.key==="Backspace"&&!input.value&&index>0){
                otpInputs[index-1].focus();
            }

            if(event.key==="ArrowLeft"&&index>0){
                otpInputs[index-1].focus();
            }

            if(event.key==="ArrowRight"&&index<otpInputs.length-1){
                otpInputs[index+1].focus();
            }
        });

        input.addEventListener("paste",event=>{
            event.preventDefault();

            const pasted=(event.clipboardData||window.clipboardData)
                .getData("text").replace(/\D/g,"").slice(0,6);

            pasted.split("").forEach((digit,i)=>{
                if(otpInputs[i])otpInputs[i].value=digit;
            });

            if(pasted.length){
                otpInputs[Math.min(pasted.length,6)-1].focus();
            }
        });
    });
}

function getOTP(){
    return otpInputs.map(input=>input.value).join("");
}

/* VERIFY PHONE */

function initializeVerification(){
    otpForm.addEventListener("submit",async event=>{
        event.preventDefault();

        if(verificationInProgress||sessionExpired||!phoneLoaded)return;

        const otp=getOTP();

        if(!/^\d{6}$/.test(otp)){
            otpInputs.forEach(input=>{
                input.classList.toggle("invalid",!input.value);
            });

            showNotification(
                "Invalid OTP",
                "Please enter the complete 6-digit verification code.",
                "error"
            );
            return;
        }

        otpInputs.forEach(input=>input.classList.remove("invalid"));

        verificationInProgress=true;
        setButtonLoading(verifyButton,true,"Connecting...");

        try{
            const response=await API_REQUEST(VERIFY_ENDPOINT,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({otp})
            });

            const data=await response.json().catch(()=>({}));

            if(sessionExpired)return;

            if(response.status===401){
                handleAuthenticationExpiry();
                return;
            }

            if(!response.ok){
                showNotification(
                    "Verification Failed",
                    data.message||"The verification code is invalid or has expired.",
                    "error"
                );
                return;
            }

            showNotification(
                "Phone Verified",
                data.message||"Your phone number has been successfully verified.",
                "success",
                ()=>{window.location.href="../worker-payment-page/index.html";}
            );

        }catch(error){
            console.error("Phone verification failed:",error);

            showNotification(
                "Connection Failed",
                "Unable to connect to the server. Please try again.",
                "error"
            );
        }finally{
            verificationInProgress=false;

            if(!sessionExpired){
                setButtonLoading(verifyButton,false,"Verify Phone");
            }
        }
    });
}

/* RESEND OTP */

function initializeResend(){
    resendOTP.addEventListener("click",async event=>{
        event.preventDefault();

        if(
            resendInProgress||
            sessionExpired||
            !phoneLoaded||
            resendSeconds>0
        ){
            return;
        }

        resendInProgress=true;
        resendOTP.dataset.loading="true";
        resendOTP.classList.add("disabled");
        resendOTP.setAttribute("aria-disabled","true");
        resendOTP.textContent="Connecting...";

        try{
            const response=await API_REQUEST(RESEND_ENDPOINT,{
                method:"POST"
            });

            const data=await response.json().catch(()=>({}));

            if(sessionExpired)return;

            if(response.status===401){
                handleAuthenticationExpiry();
                return;
            }

            if(!response.ok){
                const cooldownUntil=
                    data.coolDownUntil||data.cooldownUntil;

                let message=data.message||
                    "Unable to resend the verification code.";

                if(cooldownUntil){
                    const remaining=Math.max(
                        0,
                        Math.ceil(
                            (new Date(cooldownUntil).getTime()-Date.now())/1000
                        )
                    );

                    if(remaining>0){
                        startCountdown(remaining);
                        message+=" You can try again after the cooldown expires.";
                    }
                }

                showNotification("Resend Failed",message,"error");
                return;
            }

            otpInputs.forEach(input=>{
                input.value="";
                input.classList.remove("invalid");
            });

            startCountdown(60);

            showNotification(
                "OTP Sent",
                data.message||
                    "A new verification code has been sent to your phone.",
                "success"
            );

        }catch(error){
            console.error("Resend OTP failed:",error);

            showNotification(
                "Connection Failed",
                "Unable to connect to the server. Please try again.",
                "error"
            );
        }finally{
            resendInProgress=false;
            resendOTP.dataset.loading="false";

            if(!sessionExpired){
                resendOTP.textContent="Resend OTP";

                if(resendSeconds<=0){
                    enableResend();
                }else{
                    resendOTP.classList.add("disabled");
                    resendOTP.setAttribute("aria-disabled","true");
                }
            }
        }
    });
}

/* RESEND COUNTDOWN */

function startCountdown(seconds=60){
    stopCountdown();

    resendSeconds=Math.max(0,Math.ceil(seconds));

    resendOTP.classList.add("disabled");
    resendOTP.setAttribute("aria-disabled","true");

    updateCountdown();

    if(resendSeconds===0){
        enableResend();
        return;
    }

    countdownTimer=setInterval(()=>{
        resendSeconds--;
        updateCountdown();

        if(resendSeconds<=0){
            stopCountdown();
            enableResend();
        }
    },1000);
}

function stopCountdown(){
    if(countdownTimer!==null){
        clearInterval(countdownTimer);
        countdownTimer=null;
    }
}

function updateCountdown(){
    countdown.textContent=resendSeconds>0
        ?`Resend available in ${resendSeconds}s`
        :"You can resend the OTP now.";
}

function enableResend(){
    if(sessionExpired||!phoneLoaded||resendInProgress)return;

    resendOTP.classList.remove("disabled");
    resendOTP.setAttribute("aria-disabled","false");
    resendOTP.textContent="Resend OTP";
}

/* BUTTON LOADING */

function setButtonLoading(button,loading,text){
    button.classList.toggle("loading",loading);
    button.disabled=loading||sessionExpired;

    button.innerHTML=loading
        ?`<span class="loading-spinner"></span><span>${text}</span>`
        :`<span class="btn-text">${text}</span>`;
}