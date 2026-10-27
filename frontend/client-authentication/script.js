document.addEventListener("DOMContentLoaded",()=>{
    initializeTabs();
    initializePasswordToggles();
    initializeLogin();
    initializeSignup();
    initializeForgotPassword();
    initializeGoogleButtons();
    initializeNotificationModal();
    initializeForgotModal();
});

const getElement=id=>document.getElementById(id);
const CLIENT_AUTH_ENDPOINT="/api/client-authentication";
const CLIENT_GOOGLE_ENDPOINT="/api/client-authentication/google";
const CLIENT_FORGOT_PASSWORD_ENDPOINT="/api/client-authentication/forgot-password";

function setLoading(button,loading,text=""){
    if(!button)return;
    if(loading){
        if(!button.dataset.originalText)button.dataset.originalText=button.textContent;
        if(text)button.textContent=text;
        button.disabled=true;
        button.classList.add("loading");
    }else{
        button.textContent=button.dataset.originalText||button.textContent;
        button.disabled=false;
        button.classList.remove("loading");
        delete button.dataset.originalText;
    }
}

function isValidEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

let cooldownInterval=null;

function clearCooldownCountdown(){
    if(cooldownInterval){
        clearInterval(cooldownInterval);
        cooldownInterval=null;
    }
}

function cooldownMessage(data){
    if(!data.coolDownUntil)return data.message||"Please try again later.";
    return `${data.message||"Please try again later."}\nCooldown ends: ${new Date(data.coolDownUntil).toLocaleString()}`;
}

function showCooldownNotification(title,data){
    clearCooldownCountdown();

    const message=data.message||"Please try again later.";

    showNotification(title,message,"error");

    const notificationMessage=getElement("notificationMessage");
    const cooldownUntil=Date.parse(data.coolDownUntil);

    if(!data.coolDownUntil||!Number.isFinite(cooldownUntil)){
        notificationMessage.textContent=cooldownMessage(data);
        return;
    }

    function updateCountdown(){
        const remaining=Math.max(0,cooldownUntil-Date.now());

        if(remaining===0){
            notificationMessage.textContent=
                `${message}\nCooldown has expired. You can try again.`;

            clearCooldownCountdown();
            return;
        }

        const totalSeconds=Math.ceil(remaining/1000);
        const days=Math.floor(totalSeconds/86400);
        const hours=Math.floor((totalSeconds%86400)/3600);
        const minutes=Math.floor((totalSeconds%3600)/60);
        const seconds=totalSeconds%60;

        const countdown=[
            ...(days?[`${days}d`]:[]),
            ...(hours?[`${hours}h`]:[]),
            `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`
        ].join(" ");

        notificationMessage.textContent=
            `${message}\nTime remaining: ${countdown}`;
    }

    updateCountdown();
    cooldownInterval=setInterval(updateCountdown,1000);
}

let notificationCallback=null;

function showNotification(title,message,type="success",callback=null){
    const modal=getElement("notificationModal");
    getElement("notificationTitle").textContent=title;
    getElement("notificationMessage").textContent=message;
    getElement("notificationIcon").textContent=type==="error"?"!":"✓";
    notificationCallback=callback;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
}

function closeNotification(){
    clearCooldownCountdown();

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
    [
        ["toggleLoginPassword","loginPassword"],
        ["toggleSignupPassword","signupPassword"],
        ["toggleConfirmPassword","confirmPassword"]
    ].forEach(([buttonId,inputId])=>{
        getElement(buttonId).addEventListener("click",()=>{
            const input=getElement(inputId);
            const button=getElement(buttonId);
            const visible=input.type==="text";
            input.type=visible?"password":"text";
            button.textContent=visible?"Show":"Hide";
            button.setAttribute("aria-label",visible?"Show password":"Hide password");
        });
    });
}

function initializeLogin(){
    getElement("loginForm").addEventListener("submit",async event=>{
        event.preventDefault();

        const email=getElement("loginEmail").value.trim().toLowerCase();
        const password=getElement("loginPassword").value;
        const button=getElement("loginButton");

        if(!email)return showNotification("Email Required","Please enter your email address.","error");
        if(!isValidEmail(email))return showNotification("Invalid Email","Please enter a valid email address.","error");
        if(!password)return showNotification("Password Required","Please enter your password.","error");

        setLoading(button,true,"Logging in…");

        try{
            const response=await API_REQUEST(`${CLIENT_AUTH_ENDPOINT}/login`,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({email,password})
            });

            const data=await response.json().catch(()=>({}));
            setLoading(button,false);

            if(!response.ok){
                if(data.coolDownUntil){
                    return showCooldownNotification("Login Failed",data);
                }

                return showNotification("Login Failed",cooldownMessage(data),"error");
            }

            if(data.requiresEmailVerification){
                sessionStorage.setItem("clientEmail",data.email||email);
                return showNotification(
                    "Verify Your Email",
                    data.message||"A verification code has been sent to your email.",
                    "success",
                    ()=>{location.href="../client-email-otp/index.html";}
                );
            }

            if(data.profileCompleted===false){
                sessionStorage.setItem("clientEmail",data.email||email);
                return showNotification(
                    "Complete Your Profile",
                    data.message||"Please complete your client profile.",
                    "success",
                    ()=>{location.href="../client-create-profile/index.html";}
                );
            }

            if(data.profileCompleted===true||data.fullName){
                return showNotification(
                    "Login Successful",
                    data.message||`Welcome back, ${data.fullName||"Client"}!`,
                    "success",
                    ()=>{location.href="../client-workers-search/index.html";}
                );
            }

            return showNotification("Login Failed","The server returned an incomplete response.","error");
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

        const email=getElement("signupEmail").value.trim().toLowerCase();
        const password=getElement("signupPassword").value;
        const confirmPassword=getElement("confirmPassword").value;
        const termsAccepted=getElement("termsCheckbox").checked;
        const button=getElement("signupButton");

        if(!email)return showNotification("Email Required","Please enter your email address.","error");
        if(!isValidEmail(email))return showNotification("Invalid Email","Please enter a valid email address.","error");
        if(!password)return showNotification("Password Required","Please enter your password.","error");
        if(password.length<8)return showNotification("Password Too Short","Password must be at least 8 characters.","error");
        if(!confirmPassword)return showNotification("Confirm Password Required","Please confirm your password.","error");
        if(password!==confirmPassword)return showNotification("Passwords Do Not Match","Please make sure both passwords match.","error");
        if(!termsAccepted)return showNotification("Agreement Required","You must agree to the Terms and Privacy Policy.","error");

        setLoading(button,true,"Creating…");

        try{
            const response=await API_REQUEST(`${CLIENT_AUTH_ENDPOINT}/signup`,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({email,password,confirmPassword,termsAccepted})
            });

            const data=await response.json().catch(()=>({}));
            setLoading(button,false);

            if(!response.ok){
                return showNotification("Account Creation Failed",data.message||"Unable to create your account. Please try again.","error");
            }

            sessionStorage.setItem("clientEmail",data.email||email);

            return showNotification(
                "Account Created",
                data.message||"A verification code has been sent to your email.",
                "success",
                ()=>{location.href="../client-email-otp/index.html";}
            );
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

        const email=getElement("resetEmail").value.trim().toLowerCase();
        const button=getElement("forgotButton");

        if(!email)return showNotification("Email Required","Please enter your email address.","error");
        if(!isValidEmail(email))return showNotification("Invalid Email","Please enter a valid email address.","error");

        setLoading(button,true,"Connecting…");

        try{
            const response=await API_REQUEST(CLIENT_FORGOT_PASSWORD_ENDPOINT,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({email})
            });

            const data=await response.json().catch(()=>({}));
            setLoading(button,false);

            if(!response.ok){
                if(data.coolDownUntil){
                    closeForgotModal();
                    return showCooldownNotification("Request Failed",data);
                }

                return showNotification("Request Failed",cooldownMessage(data),"error");
            }

            closeForgotModal();
            sessionStorage.setItem("clientEmail",data.email||email);

            return showNotification(
                "Verification Code Sent",
                data.message||"A password reset code has been sent to your email.",
                "success",
                ()=>{location.href="../client-password-reset-otp/index.html";}
            );
        }catch(error){
            console.error("Client password reset request failed:",error);
            setLoading(button,false);
            closeForgotModal();
            showNotification("Connection Error","Unable to connect to the server. Please try again.","error");
        }
    });
}

function initializeGoogleButtons(){
    ["googleLoginButton","googleSignupButton"].forEach(id=>{
        const button=getElement(id);
        if(button)button.addEventListener("click",()=>startGoogleAuthentication(button));
    });
}

function startGoogleAuthentication(button){
    setLoading(button,true,"Connecting…");
    window.location.href=API_ENDPOINT(CLIENT_GOOGLE_ENDPOINT);
}

document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    const forgotModal=getElement("forgotModal");
    if(forgotModal.classList.contains("show"))closeForgotModal();
});