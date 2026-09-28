document.addEventListener("DOMContentLoaded",()=>{
    const form=document.getElementById("resetForm");
    const password=document.getElementById("password");
    const confirmPassword=document.getElementById("confirmPassword");
    const passwordToggle=document.getElementById("passwordToggle");
    const confirmToggle=document.getElementById("confirmToggle");
    const changePasswordBtn=document.getElementById("changePasswordBtn");
    const buttonText=document.getElementById("buttonText");
    const buttonLoader=document.getElementById("buttonLoader");

    const authModal=document.getElementById("authModal");
    const modalOverlay=authModal.querySelector(".message-modal-overlay");
    const modalCloseBtn=document.getElementById("modalCloseBtn");
    const modalIcon=document.getElementById("modalIcon");
    const modalTitle=document.getElementById("modalTitle");
    const modalMessage=document.getElementById("modalMessage");

    const clientEmail=sessionStorage.getItem("clientEmail");

    let modalCallback=null;

    function showModal(type,title,message,onClose=null){
        modalTitle.textContent=title;
        modalMessage.textContent=message;
        modalIcon.textContent=type==="success"?"✓":"!";
        modalIcon.style.color=type==="success"?"#3b82f6":"#ef4444";
        modalIcon.style.background=type==="success"?"rgba(59,130,246,.12)":"rgba(239,68,68,.12)";
        modalCallback=onClose;
        authModal.classList.add("show");
        authModal.setAttribute("aria-hidden","false");
        modalCloseBtn.focus();
    }

    function closeModal(){
        const callback=modalCallback;
        modalCallback=null;
        authModal.classList.remove("show");
        authModal.setAttribute("aria-hidden","true");
        if(callback)callback();
    }

    modalCloseBtn.addEventListener("click",closeModal);
    modalOverlay.addEventListener("click",closeModal);

    document.addEventListener("keydown",e=>{
        if(e.key==="Escape"&&authModal.classList.contains("show"))closeModal();
    });

    if(!clientEmail){
        showModal(
            "error",
            "Session Required",
            "No client email is associated with this password change session.",
            ()=>window.location.href="../client-authentication/index.html"
        );
        return;
    }

    function togglePassword(input,button){
        const hidden=input.type==="password";
        input.type=hidden?"text":"password";
        button.textContent=hidden?"🙈":"👁";
        button.setAttribute("aria-label",hidden?"Hide password":"Show password");
    }

    passwordToggle.addEventListener("click",()=>togglePassword(password,passwordToggle));
    confirmToggle.addEventListener("click",()=>togglePassword(confirmPassword,confirmToggle));

    function setLoading(loading){
        changePasswordBtn.disabled=loading;
        password.disabled=loading;
        confirmPassword.disabled=loading;
        buttonText.hidden=loading;
        buttonLoader.hidden=!loading;
    }

    form.addEventListener("submit",async e=>{
        e.preventDefault();

        if(!password.value){
            showModal("error","Password Required","Please enter your new password.");
            return;
        }

        if(password.value.length<8){
            showModal("error","Password Too Short","Your password must be at least 8 characters.");
            return;
        }

        if(!confirmPassword.value){
            showModal("error","Confirmation Required","Please confirm your new password.");
            return;
        }

        if(password.value!==confirmPassword.value){
            showModal("error","Passwords Do Not Match","Your passwords do not match.");
            return;
        }

        setLoading(true);

        try{
            const response=await API_REQUEST(
                "/api/client-password-change",
                {
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({
                        email:clientEmail,
                        newPassword:password.value
                    })
                }
            );

            const data=await response.json();

            if(!response.ok){
                showModal(
                    "error",
                    "Password Change Failed",
                    data.message||"Unable to change your password.",
                    data.redirect?()=>window.location.href="../client-authentication/index.html":null
                );
                return;
            }

            showModal(
                "success",
                "Password Changed",
                data.message||"Your password has been changed successfully.",
                ()=>{
                    sessionStorage.removeItem("clientEmail");
                    window.location.href="../client-authentication/index.html";
                }
            );

        }catch(error){
            console.error("Password change request failed:",error);
            showModal("error","Request Failed","Please check your internet connection and try again.");
        }finally{
            setLoading(false);
        }
    });
});