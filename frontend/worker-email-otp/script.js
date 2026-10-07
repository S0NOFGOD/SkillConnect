const otpForm=document.getElementById("otpForm");
const otpInputs=document.querySelectorAll(".otp-input");
const workerEmailElement=document.getElementById("workerEmail");
const verifyButton=document.getElementById("verifyButton");
const buttonText=verifyButton.querySelector(".btn-text");
const resendOTP=document.getElementById("resendOTP");
const countdownElement=document.getElementById("countdown");
const notificationModal=document.getElementById("notificationModal");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationMessage=document.getElementById("notificationMessage");
const notificationCloseButton=document.getElementById("notificationCloseButton");

const workerEmail=sessionStorage.getItem("workerEmail");
const authenticationPage="../worker-authentication/index.html";

let countdownSeconds=60;
let countdownTimer=null;
let isVerifying=false;
let isResending=false;
let notificationCallback=null;

const showNotification=(type,title,message,callback=null)=>{
    notificationTitle.textContent=title;
    notificationMessage.textContent=message;
    notificationCallback=callback;
    notificationIcon.classList.remove("success","error");
    notificationIcon.classList.add(type);
    notificationIcon.textContent=type==="success"?"✓":"!";
    notificationCloseButton.textContent="Continue";
    notificationModal.hidden=false;
};

const closeNotification=()=>{
    const callback=notificationCallback;
    notificationCallback=null;
    notificationModal.hidden=true;
    if(callback)callback();
};

notificationCloseButton.addEventListener("click",()=>{closeNotification();});

if(!workerEmail){
    showNotification("error","Session Expired","Your verification session has expired. Please return to the login or signup page.",()=>{
        window.location.href=authenticationPage;
    });
}else{
    workerEmailElement.textContent=workerEmail;
}

otpInputs.forEach((input,index)=>{
    input.addEventListener("input",()=>{
        input.value=input.value.replace(/\D/g,"");
        input.classList.remove("invalid");
        if(input.value&&index<otpInputs.length-1)otpInputs[index+1].focus();
    });

    input.addEventListener("keydown",event=>{
        if(event.key==="Backspace"&&!input.value&&index>0)otpInputs[index-1].focus();
    });

    input.addEventListener("paste",event=>{
        event.preventDefault();

        const pastedText=(event.clipboardData||window.clipboardData).getData("text").replace(/\D/g,"").slice(0,6);

        pastedText.split("").forEach((digit,digitIndex)=>{
            if(otpInputs[digitIndex])otpInputs[digitIndex].value=digit;
        });

        const lastIndex=Math.min(pastedText.length,otpInputs.length)-1;
        if(lastIndex>=0)otpInputs[lastIndex].focus();
    });
});

const getOTP=()=>Array.from(otpInputs).map(input=>input.value.trim()).join("");

const validateOTP=otp=>/^\d{6}$/.test(otp);

const markOTPInvalid=()=>{
    otpInputs.forEach(input=>input.classList.add("invalid"));
};

const clearOTPInputs=()=>{
    otpInputs.forEach(input=>{
        input.value="";
        input.classList.remove("invalid");
    });

    if(otpInputs[0])otpInputs[0].focus();
};

const setVerifyLoading=loading=>{
    if(loading){
        verifyButton.disabled=true;
        buttonText.innerHTML=`<span class="loading-spinner"></span> Connecting...`;
    }else{
        verifyButton.disabled=false;
        buttonText.textContent="Verify Email";
    }
};

const setResendLoading=loading=>{
    if(loading){
        resendOTP.classList.add("disabled");
        resendOTP.textContent="Connecting...";
    }else{
        resendOTP.classList.remove("disabled");
        resendOTP.textContent="Resend OTP";
    }
};

otpForm.addEventListener("submit",async event=>{
    event.preventDefault();

    if(isVerifying)return;

    const otp=getOTP();

    if(!validateOTP(otp)){
        markOTPInvalid();

        showNotification(
            "error",
            "Invalid OTP",
            "Please enter the complete 6-digit verification code."
        );

        return;
    }

    isVerifying=true;
    setVerifyLoading(true);

    try{
        const response=await fetch(
            API_ENDPOINT("/api/auth/worker/verify"),
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    email:workerEmail,
                    otp:otp
                })
            }
        );

        const data=await response.json();

        if(!response.ok||!data.success){
            showNotification(
                "error",
                "Verification Failed",
                data.message||"The verification code could not be verified."
            );

            clearOTPInputs();
            return;
        }

        showNotification(
            "success",
            "Email Verified",
            data.message||"Your email has been successfully verified.",
            ()=>{
                window.location.href="../worker-create-profile/index.html";
            }
        );

    }catch(error){
        console.error("Email OTP verification error:",error);

        showNotification(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please check your internet connection and try again."
        );

    }finally{
        isVerifying=false;
        setVerifyLoading(false);
    }
});

resendOTP.addEventListener("click",async event=>{
    event.preventDefault();

    if(isResending||countdownTimer)return;

    if(!workerEmail){
        showNotification(
            "error",
            "Session Expired",
            "Your verification session has expired. Please return to the authentication page."
        );

        return;
    }

    isResending=true;
    setResendLoading(true);

    try{
        const response=await fetch(
            API_ENDPOINT("/api/auth/worker/resend"),
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    email:workerEmail
                })
            }
        );

        const data=await response.json();

        if(!response.ok||!data.success){
            showNotification(
                "error",
                "Unable to Resend OTP",
                data.message||"We could not send a new verification code."
            );

            return;
        }

        showNotification(
            "success",
            "OTP Sent",
            data.message||"A new verification code has been sent to your email."
        );

        clearOTPInputs();
        startCountdown();

    }catch(error){
        console.error("Resend OTP error:",error);

        showNotification(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please try again."
        );

    }finally{
        isResending=false;
        setResendLoading(false);
    }
});

function startCountdown(){
    if(countdownTimer){
        clearInterval(countdownTimer);
    }

    countdownSeconds=60;

    resendOTP.classList.add("disabled");

    countdownElement.textContent=`Resend available in ${countdownSeconds}s`;

    countdownTimer=setInterval(()=>{
        countdownSeconds--;

        if(countdownSeconds<=0){
            clearInterval(countdownTimer);
            countdownTimer=null;

            resendOTP.classList.remove("disabled");
            resendOTP.textContent="Resend OTP";
            countdownElement.textContent="You can request a new OTP.";

            return;
        }

        countdownElement.textContent=`Resend available in ${countdownSeconds}s`;
    },1000);
}

if(workerEmail&&otpInputs[0]){
    otpInputs[0].focus();
    startCountdown();
}

const observeModal=new MutationObserver(()=>{
    if(notificationModal.hidden){
        document.body.style.overflow="";
    }else{
        document.body.style.overflow="hidden";
    }
});

observeModal.observe(
    notificationModal,
    {
        attributes:true,
        attributeFilter:["hidden"]
    }
);

console.log("SkillConnect Worker Email OTP JavaScript loaded successfully.");