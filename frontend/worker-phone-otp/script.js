const PHONE_ENDPOINT="/api/worker/phone-otp";
const VERIFY_ENDPOINT="/api/worker/verify-phone";
const RESEND_ENDPOINT="/api/worker/resend-phone-otp";

const workerPhone=document.getElementById("workerPhone");
const otpForm=document.getElementById("otpForm");
const otpInputs=document.querySelectorAll(".otp-input");
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


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded",()=>{
    initializeOTPInputs();
    initializeVerification();
    initializeResend();
    initializeNotificationModal();
    loadWorkerPhone();
});


/* =========================================================
   LOAD MASKED WORKER PHONE
========================================================= */

async function loadWorkerPhone(){

    try{

        const response=await API_REQUEST(PHONE_ENDPOINT,{
            method:"GET"
        });

        if(response.status===401){
            showNotification(
                "Authentication Required",
                "Your authentication session has expired. Please log in again.",
                "error",
                ()=>{
                    window.location.href="../worker-authentication/index.html";
                }
            );
            return;
        }

        const data=await response.json().catch(()=>({}));

        if(!response.ok){
            showNotification(
                "Request Failed",
                data.message||"Unable to load your phone number.",
                "error"
            );
            return;
        }

        workerPhone.textContent=data.phone||"Phone number unavailable.";

        startCountdown();

    }catch(error){

        console.error("Load phone request failed:",error);

        showNotification(
            "Request Failed",
            "Unable to connect to the server. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   OTP INPUTS
========================================================= */

function initializeOTPInputs(){

    otpInputs.forEach((input,index)=>{

        input.addEventListener("input",()=>{

            input.value=input.value.replace(/\D/g,"").slice(0,1);
            input.classList.remove("invalid");

            if(input.value&&index<otpInputs.length-1){
                otpInputs[index+1].focus();
            }
        });

        input.addEventListener("keydown",(event)=>{

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

        input.addEventListener("paste",(event)=>{

            event.preventDefault();

            const pasted=(event.clipboardData||window.clipboardData)
                .getData("text")
                .replace(/\D/g,"")
                .slice(0,6);

            pasted.split("").forEach((digit,i)=>{
                if(otpInputs[i])otpInputs[i].value=digit;
            });

            if(pasted.length){
                otpInputs[Math.min(pasted.length,6)-1].focus();
            }
        });
    });
}


/* =========================================================
   VERIFY PHONE
========================================================= */

function initializeVerification(){

    otpForm.addEventListener("submit",async(event)=>{

        event.preventDefault();

        if(verifyButton.disabled)return;

        const otp=getOTP();

        if(!/^\d{6}$/.test(otp)){

            otpInputs.forEach(input=>input.classList.add("invalid"));

            showNotification(
                "Invalid OTP",
                "Please enter the complete 6-digit verification code.",
                "error"
            );

            return;
        }

        otpInputs.forEach(input=>input.classList.remove("invalid"));

        setButtonLoading(
            verifyButton,
            true,
            "Verifying..."
        );

        try{

            const response=await API_REQUEST(VERIFY_ENDPOINT,{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({otp})
            });

            const data=await response.json().catch(()=>({}));

            if(response.status===401){

                showNotification(
                    "Authentication Required",
                    "Your authentication session has expired. Please log in again.",
                    "error",
                    ()=>{
                        window.location.href="../worker-authentication/index.html";
                    }
                );

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
                ()=>{
                    window.location.href="../worker-dashboard/index.html";
                }
            );

        }catch(error){

            console.error("Phone verification request failed:",error);

            showNotification(
                "Request Failed",
                "Unable to connect to the server. Please try again.",
                "error"
            );

        }finally{

            setButtonLoading(
                verifyButton,
                false,
                "Verify Phone"
            );
        }
    });
}


/* =========================================================
   RESEND OTP
========================================================= */

function initializeResend(){

    resendOTP.addEventListener("click",async(event)=>{

        event.preventDefault();

        if(
            resendOTP.classList.contains("disabled")||
            resendOTP.dataset.loading==="true"
        )return;

        resendOTP.dataset.loading="true";
        resendOTP.classList.add("disabled");
        resendOTP.textContent="Resending...";

        try{

            const response=await API_REQUEST(RESEND_ENDPOINT,{
                method:"POST"
            });

            const data=await response.json().catch(()=>({}));

            if(response.status===401){

                showNotification(
                    "Authentication Required",
                    "Your authentication session has expired. Please log in again.",
                    "error",
                    ()=>{
                        window.location.href="../worker-authentication/index.html";
                    }
                );

                return;
            }

            if(!response.ok){

                showNotification(
                    "Resend Failed",
                    data.message||"Unable to resend the verification code.",
                    "error"
                );

                return;
            }

            otpInputs.forEach(input=>{
                input.value="";
                input.classList.remove("invalid");
            });

            startCountdown();

            showNotification(
                "OTP Sent",
                data.message||"A new verification code has been sent to your phone.",
                "success"
            );

        }catch(error){

            console.error("Resend OTP request failed:",error);

            showNotification(
                "Request Failed",
                "Unable to connect to the server. Please try again.",
                "error"
            );

        }finally{

            resendOTP.dataset.loading="false";

            if(resendSeconds<=0){
                resendOTP.classList.remove("disabled");
                resendOTP.textContent="Resend OTP";
            }
        }
    });
}


/* =========================================================
   OTP COUNTDOWN
========================================================= */

function startCountdown(){

    clearInterval(countdownTimer);

    resendSeconds=60;

    resendOTP.classList.add("disabled");
    resendOTP.textContent="Resend OTP";

    updateCountdown();

    countdownTimer=setInterval(()=>{

        resendSeconds--;

        updateCountdown();

        if(resendSeconds<=0){

            clearInterval(countdownTimer);

            if(resendOTP.dataset.loading!=="true"){
                resendOTP.classList.remove("disabled");
                resendOTP.textContent="Resend OTP";
            }
        }

    },1000);
}


function updateCountdown(){

    if(resendSeconds>0){
        countdown.textContent=`Resend available in ${resendSeconds}s`;
    }else{
        countdown.textContent="You can resend the OTP now.";
    }
}


/* =========================================================
   GET OTP VALUE
========================================================= */

function getOTP(){

    return Array.from(otpInputs)
        .map(input=>input.value)
        .join("");
}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(button,loading,text){

    button.disabled=loading;

    button.classList.toggle("loading",loading);

    if(loading){

        button.innerHTML=`
            <span class="loading-spinner"></span>
            <span>${text}</span>
        `;

    }else{

        button.innerHTML=`
            <span class="btn-text">${text}</span>
        `;
    }
}


/* =========================================================
   NOTIFICATION MODAL
========================================================= */

function initializeNotificationModal(){

    notificationCloseButton.addEventListener("click",()=>{

        closeNotification();

        if(typeof modalCallback==="function"){

            const callback=modalCallback;

            modalCallback=null;

            callback();
        }
    });
}


function showNotification(
    title,
    message,
    type="success",
    callback=null
){

    notificationTitle.textContent=title;
    notificationMessage.textContent=message;

    notificationIcon.className=`notification-icon ${type}`;

    notificationIcon.textContent=
        type==="success"?"✓":"!";

    modalCallback=callback;

    notificationModal.hidden=false;
}


function closeNotification(){

    notificationModal.hidden=true;
}


/* =========================================================
   PAGE PROTECTION
========================================================= */

window.addEventListener(
    "authSessionExpired",
    ()=>{
        if(!notificationModal.hidden)return;

        showNotification(
            "Authentication Required",
            "Your authentication session has expired. Please log in again.",
            "error",
            ()=>{
                window.location.href="../worker-authentication/index.html";
            }
        );
    }
);