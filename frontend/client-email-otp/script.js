const CLIENT_EMAIL_KEY="clientEmail";
const VERIFY_OTP_ENDPOINT="/api/client-email-otp/verify";
const RESEND_OTP_ENDPOINT="/api/client-email-otp/resend";

const clientEmailElement=document.getElementById("clientEmail");
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

const clientEmail=sessionStorage.getItem(CLIENT_EMAIL_KEY);

let notificationAction=null;
let countdownTimer=null;
let resendAvailable=false;
let currentLoadingAction=null;

/* =========================
   1. NOTIFICATION MODAL
========================= */
function showNotification(title,message,type="success",action=null){
    notificationTitle.textContent=title;
    notificationMessage.textContent=message;
    notificationIcon.textContent=type==="success"?"✓":"!";
    notificationIcon.className=`notification-icon ${type}`;
    notificationAction=action;
    notificationModal.hidden=false;
}

function closeNotification(){
    notificationModal.hidden=true;

    const action=notificationAction;
    notificationAction=null;

    if(typeof action==="function")action();
}

notificationCloseButton.addEventListener(
    "click",
    closeNotification
);

notificationModal.addEventListener(
    "click",
    event=>{
        if(event.target===notificationModal){
            closeNotification();
        }
    }
);

/* =========================
   2. INITIAL EMAIL CHECK
========================= */
function initializeEmail(){
    if(!clientEmail){
        clientEmailElement.textContent="Email not found";

        showNotification(
            "Email Not Found",
            "We could not find your email address. Please return to client authentication and try again.",
            "error",
            ()=>{
                window.location.href="../client-authentication/index.html";
            }
        );

        return false;
    }

    clientEmailElement.textContent=clientEmail;
    return true;
}

/* =========================
   3. OTP INPUT
========================= */
otpInputs.forEach((input,index)=>{
    input.addEventListener("input",()=>{
        input.value=input.value.replace(/\D/g,"").slice(0,1);
        input.classList.remove("invalid");

        if(input.value&&index<otpInputs.length-1){
            otpInputs[index+1].focus();
        }
    });

    input.addEventListener("keydown",event=>{
        if(
            event.key==="Backspace"&&
            !input.value&&
            index>0
        ){
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
            .getData("text")
            .replace(/\D/g,"")
            .slice(0,6);

        pasted.split("").forEach((digit,i)=>{
            if(otpInputs[i])otpInputs[i].value=digit;
        });

        if(pasted.length){
            otpInputs[Math.min(pasted.length-1,5)].focus();
        }
    });
});

/* =========================
   4. GET OTP
========================= */
function getOTP(){
    return otpInputs.map(input=>input.value).join("");
}

/* =========================
   5. VALIDATE OTP
========================= */
function validateOTP(){
    const otp=getOTP();

    otpInputs.forEach(input=>{
        input.classList.remove("invalid");
    });

    if(!/^\d{6}$/.test(otp)){
        otpInputs.forEach(input=>{
            if(!input.value)input.classList.add("invalid");
        });

        showNotification(
            "Invalid OTP",
            "Please enter the complete 6-digit verification code.",
            "error"
        );

        const firstEmpty=otpInputs.find(input=>!input.value);
        (firstEmpty||otpInputs[0]).focus();

        return null;
    }

    return otp;
}

/* =========================
   6. LOADING STATE
========================= */
function setVerifyLoading(loading){
    currentLoadingAction=loading?"verify":null;
    verifyButton.disabled=loading;

    if(loading){
        verifyButton.classList.add("loading");
        verifyButton.innerHTML=
            '<span class="loading-spinner"></span><span>Verifying...</span>';
    }else{
        verifyButton.classList.remove("loading");
        verifyButton.innerHTML=
            '<span class="btn-text">Verify Email</span>';
    }
}

function setResendLoading(loading){
    currentLoadingAction=loading?"resend":null;
    resendOTP.classList.toggle("disabled",loading);
    resendOTP.textContent=loading?"Sending...":"Resend OTP";
}

/* =========================
   7. API RESPONSE
========================= */
async function getResponseData(response){
    try{
        return await response.json();
    }catch(error){
        return {};
    }
}

function getServerMessage(data,fallback){
    return data.message||
        data.error||
        data.msg||
        fallback;
}

/* =========================
   8. VERIFY OTP
========================= */
otpForm.addEventListener(
    "submit",
    async event=>{
        event.preventDefault();

        if(!clientEmail)return;

        const otp=validateOTP();

        if(!otp)return;

        setVerifyLoading(true);

        try{
            const response=await API_REQUEST(
                VERIFY_OTP_ENDPOINT,
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        email:clientEmail,
                        otp
                    })
                }
            );

            const data=await getResponseData(response);

            if(!response.ok){
                showNotification(
                    "Verification Failed",
                    getServerMessage(
                        data,
                        "We could not verify your email. Please check your OTP and try again."
                    ),
                    "error"
                );

                return;
            }

            showNotification(
                "Email Verified",
                getServerMessage(
                    data,
                    "Your email has been successfully verified."
                ),
                "success",
                ()=>{
                    window.location.href="../client-create-profile/index.html";
                }
            );

        }catch(error){
            console.error(
                "Client email OTP verification failed:",
                error
            );

            showNotification(
                "Connection Error",
                "Unable to connect to the server. Please try again.",
                "error"
            );

        }finally{
            setVerifyLoading(false);
        }
    }
);

/* =========================
   9. RESEND COUNTDOWN
========================= */
function startCountdown(seconds=60){
    clearInterval(countdownTimer);

    let remaining=seconds;
    resendAvailable=false;
    resendOTP.classList.add("disabled");

    countdown.textContent=
        `Resend available in ${remaining}s`;

    countdownTimer=setInterval(()=>{
        remaining--;

        if(remaining<=0){
            clearInterval(countdownTimer);
            countdownTimer=null;
            resendAvailable=true;
            resendOTP.classList.remove("disabled");
            countdown.textContent="You can resend the OTP now.";
            return;
        }

        countdown.textContent=
            `Resend available in ${remaining}s`;
    },1000);
}

/* =========================
   10. RESEND OTP
========================= */
resendOTP.addEventListener(
    "click",
    async event=>{
        event.preventDefault();

        if(
            !clientEmail||
            !resendAvailable||
            currentLoadingAction
        )return;

        setResendLoading(true);

        try{
            const response=await API_REQUEST(
                RESEND_OTP_ENDPOINT,
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        email:clientEmail
                    })
                }
            );

            const data=await getResponseData(response);

            if(!response.ok){
                showNotification(
                    "Resend Failed",
                    getServerMessage(
                        data,
                        "We could not resend the verification code. Please try again."
                    ),
                    "error"
                );

                return;
            }

            startCountdown(60);

            showNotification(
                "OTP Sent",
                getServerMessage(
                    data,
                    "A new verification code has been sent to your email."
                ),
                "success"
            );

        }catch(error){
            console.error(
                "Client email OTP resend failed:",
                error
            );

            showNotification(
                "Connection Error",
                "Unable to connect to the server. Please try again.",
                "error"
            );

        }finally{
            setResendLoading(false);
        }
    }
);

/* =========================
   11. INITIALIZE PAGE
========================= */
if(initializeEmail()){
    startCountdown(60);
}