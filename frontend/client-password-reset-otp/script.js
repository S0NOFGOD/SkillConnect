const clientEmail=sessionStorage.getItem("clientEmail");
const clientEmailDisplay=document.getElementById("clientEmailDisplay");
const otpForm=document.getElementById("otpForm");
const otpInputs=document.querySelectorAll(".otp-input");
const verifyButton=document.getElementById("verifyButton");
const resendOTP=document.getElementById("resendOTP");
const countdown=document.getElementById("countdown");
const messageModal=document.getElementById("messageModal");
const messageModalOverlay=document.getElementById("messageModalOverlay");
const closeMessageModal=document.getElementById("closeMessageModal");
const continueButton=document.getElementById("continueButton");
const modalIcon=document.getElementById("modalIcon");
const messageModalTitle=document.getElementById("messageModalTitle");
const messageModalText=document.getElementById("messageModalText");

let countdownTimer=null;
let pendingRedirect=null;

function showMessage(type,title,message,redirect=null){
    pendingRedirect=redirect;
    messageModal.classList.remove("error","success");
    messageModal.classList.add(type);
    modalIcon.textContent=type==="success"?"✓":"!";
    messageModalTitle.textContent=title;
    messageModalText.textContent=message;
    messageModal.classList.add("show");
    messageModal.setAttribute("aria-hidden","false");
}

function closeModal(){
    messageModal.classList.remove("show");
    messageModal.setAttribute("aria-hidden","true");

    if(pendingRedirect){
        const redirect=pendingRedirect;
        pendingRedirect=null;
        window.location.href=redirect;
    }
}

closeMessageModal.addEventListener("click",closeModal);
continueButton.addEventListener("click",closeModal);
messageModalOverlay.addEventListener("click",closeModal);

document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&messageModal.classList.contains("show"))closeModal();
});

if(!clientEmail){
    showMessage("error","Email Required","Your client email could not be found. Please enter your email again.","../client-authentication/index.html");
}else{
    clientEmailDisplay.textContent=clientEmail;
    startCountdown();
}

otpInputs.forEach((input,index)=>{
    input.addEventListener("input",event=>{
        const value=event.target.value.replace(/\D/g,"").slice(0,1);
        event.target.value=value;
        if(value&&index<otpInputs.length-1)otpInputs[index+1].focus();
    });

    input.addEventListener("keydown",event=>{
        if(event.key==="Backspace"&&!input.value&&index>0)otpInputs[index-1].focus();
    });

    input.addEventListener("paste",event=>{
        event.preventDefault();
        const pasted=(event.clipboardData||window.clipboardData).getData("text").replace(/\D/g,"").slice(0,6);
        pasted.split("").forEach((digit,i)=>{
            if(otpInputs[i])otpInputs[i].value=digit;
        });
        if(pasted.length)otpInputs[Math.min(pasted.length,otpInputs.length)-1].focus();
    });
});

function getOTP(){
    return Array.from(otpInputs).map(input=>input.value).join("");
}

function setLoading(button,loading,text){
    if(loading){
        button.disabled=true;
        button.innerHTML=`<span class="loading-spinner"></span>`;
    }else{
        button.disabled=false;
        button.innerHTML=`<span class="btn-text">${text}</span>`;
    }
}

otpForm.addEventListener("submit",async event=>{
    event.preventDefault();

    if(!clientEmail)return;

    const otp=getOTP();

    if(!/^\d{6}$/.test(otp)){
        showMessage("error","Invalid OTP","Please enter the complete 6-digit verification code.");
        return;
    }

    setLoading(verifyButton,true);

    try{
        const response=await fetch(API_ENDPOINT("/api/client-password-reset-otp/verify"),{
            method:"POST",
            credentials:"include",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({email:clientEmail,otp})
        });

        let data={};

        try{
            data=await response.json();
        }catch(error){
            data={};
        }

        if(!response.ok){
            setLoading(verifyButton,false,"Verify OTP");
            showMessage("error","Verification Failed",data.message||"The verification code could not be verified.");
            return;
        }

        setLoading(verifyButton,false,"Verify OTP");

        showMessage(
            "success",
            "OTP Verified",
            data.message||"Your password reset code has been verified.",
            "../client-password-change/index.html"
        );

    }catch(error){
        console.error("Client OTP verification failed:",error);
        setLoading(verifyButton,false,"Verify OTP");
        showMessage("error","Connection Error","Unable to connect to the server. Please try again.");
    }
});

function startCountdown(){
    clearInterval(countdownTimer);

    let seconds=60;

    resendOTP.classList.add("disabled");
    resendOTP.textContent="Resend OTP";

    countdown.textContent=`Resend available in ${seconds}s`;

    countdownTimer=setInterval(()=>{
        seconds--;

        if(seconds<=0){
            clearInterval(countdownTimer);
            countdown.textContent="You can resend the code now.";
            resendOTP.classList.remove("disabled");
            return;
        }

        countdown.textContent=`Resend available in ${seconds}s`;
    },1000);
}

resendOTP.addEventListener("click",async event=>{
    event.preventDefault();

    if(resendOTP.classList.contains("disabled")||!clientEmail)return;

    resendOTP.classList.add("disabled");
    resendOTP.innerHTML=`<span class="loading-spinner"></span> Resending...`;

    try{
        const response=await fetch(API_ENDPOINT("/api/client-password-reset-otp/resend"),{
            method:"POST",
            credentials:"include",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({email:clientEmail})
        });

        let data={};

        try{
            data=await response.json();
        }catch(error){
            data={};
        }

        resendOTP.textContent="Resend OTP";

        if(!response.ok){
            resendOTP.classList.remove("disabled");

            showMessage(
                "error",
                "Resend Failed",
                data.message||"The password reset code could not be resent."
            );

            return;
        }

        showMessage(
            "success",
            "OTP Sent",
            data.message||"A new password reset code has been sent to your email address."
        );

        startCountdown();

    }catch(error){
        console.error("Client OTP resend failed:",error);

        resendOTP.textContent="Resend OTP";
        resendOTP.classList.remove("disabled");

        showMessage(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please try again."
        );
    }
});