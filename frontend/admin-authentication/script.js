const LOGIN_URL=API_ENDPOINT("/api/admin/auth/login");


const loginForm=document.getElementById("loginForm");
const loginFullName=document.getElementById("loginFullName");
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


function showNotification(
    title,
    message,
    icon="✓",
    callback=null
){

    notificationTitle.textContent=title;

    notificationMessage.textContent=message;

    notificationIcon.textContent=icon;

    notificationModal.classList.add("show");

    notificationModal.setAttribute(
        "aria-hidden",
        "false"
    );


    notificationButton.onclick=()=>{

        closeNotificationModal();

        if(callback){
            callback();
        }

    };

}


function closeNotificationModal(){

    notificationModal.classList.remove("show");

    notificationModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


function validateLogin(){

    const fullName=loginFullName.value.trim();

    const password=loginPassword.value;


    if(!fullName){

        showNotification(
            "Validation Error",
            "Please enter your full name.",
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

        const isPassword=
            loginPassword.type==="password";


        loginPassword.type=
            isPassword
                ?"text"
                :"password";


        toggleLoginPassword.textContent=
            isPassword
                ?"Hide"
                :"Show";


        toggleLoginPassword.setAttribute(
            "aria-label",
            isPassword
                ?"Hide password"
                :"Show password"
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


        if(!validateLogin()){
            return;
        }


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

                        fullName:
                            loginFullName.value.trim(),

                        password:
                            loginPassword.value

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
                    data.message||
                    "Unable to log in. Please try again.",
                    "!"
                );


                return;

            }


            loginButton.disabled=false;

            loginButton.textContent="Login";


            showNotification(
                "Login Successful",
                data.message||
                `Welcome back, ${data.fullName||"Admin"}.`,
                "✓",
                ()=>{

                    window.location.href=
                        "../admin-dashboard/index.html";

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