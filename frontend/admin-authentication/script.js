const LOGIN_URL=API_ENDPOINT("/api/admin/auth/login");

const loginForm=document.getElementById("loginForm");
const loginEmail=document.getElementById("loginEmail");
const loginPassword=document.getElementById("loginPassword");
const loginButton=document.getElementById("loginButton");
const toggleLoginPassword=document.getElementById("toggleLoginPassword");

const notificationModal=document.getElementById("notificationModal");
const notificationOverlay=document.getElementById("notificationOverlay");
const closeNotification=document.getElementById("closeNotification");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationMessage=document.getElementById("notificationMessage");
const notificationButton=document.getElementById("notificationButton");

function showNotification(title,message,icon="✓",callback=null){
    notificationTitle.textContent=title;
    notificationMessage.textContent=message;
    notificationIcon.textContent=icon;
    notificationModal.classList.add("show");
    notificationModal.setAttribute("aria-hidden","false");

    notificationButton.onclick=()=>{
        closeNotificationModal();
        if(callback)callback();
    };
}

function closeNotificationModal(){
    notificationModal.classList.remove("show");
    notificationModal.setAttribute("aria-hidden","true");
}

function validateEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLogin(){
    const email=loginEmail.value.trim();
    const password=loginPassword.value;

    if(!email){
        showNotification(
            "Validation Error",
            "Please enter your email address.",
            "!"
        );
        return false;
    }

    if(!validateEmail(email)){
        showNotification(
            "Validation Error",
            "Please enter a valid email address.",
            "!"
        );
        return false;
    }

    if(!password){
        showNotification(
            "Validation Error",
            "Please enter your password.",
            "!"
        );
        return false;
    }

    return true;
}

toggleLoginPassword.addEventListener(
    "click",
    ()=>{
        const isPassword=loginPassword.type==="password";

        loginPassword.type=isPassword?"text":"password";
        toggleLoginPassword.textContent=isPassword?"Hide":"Show";
        toggleLoginPassword.setAttribute(
            "aria-label",
            isPassword?"Hide password":"Show password"
        );
    }
);

closeNotification.addEventListener(
    "click",
    ()=>{
        closeNotificationModal();
    }
);

notificationOverlay.addEventListener(
    "click",
    ()=>{
        closeNotificationModal();
    }
);

loginForm.addEventListener(
    "submit",
    async event=>{
        event.preventDefault();

        if(!validateLogin())return;

        loginButton.disabled=true;
        loginButton.textContent="Connecting...";

        try{

            const response=await fetch(
                LOGIN_URL,
                {
                    method:"POST",
                    credentials:"include",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        email:loginEmail.value.trim(),
                        password:loginPassword.value
                    })
                }
            );

            let data={};

            try{
                data=await response.json();
            }catch(error){
                data={};
            }

            if(!response.ok){

                loginButton.disabled=false;
                loginButton.textContent="Login";

                showNotification(
                    "Login Failed",
                    data.message||"Unable to log in. Please try again.",
                    "!"
                );

                return;
            }

            loginButton.disabled=false;
            loginButton.textContent="Login";

            showNotification(
                "Login Successful",
                data.message||"Welcome back, Admin.",
                "✓",
                ()=>{
                    window.location.href="../admin-dashboard/index.html";
                }
            );

        }catch(error){

            console.error(
                "Admin login request failed:",
                error
            );

            loginButton.disabled=false;
            loginButton.textContent="Login";

            showNotification(
                "Connection Error",
                "Unable to connect to the server. Please try again.",
                "!"
            );
        }
    }
);