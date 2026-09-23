/* =========================================================
   1. BACKEND ENDPOINTS
========================================================= */

const SERVICES_ENDPOINT="/api/worker/services";
const LOGOUT_ENDPOINT="/api/auth/worker/logout";


/* =========================================================
   2. PAGE ELEMENTS
========================================================= */

const sidebar=document.getElementById("sidebar");
const overlay=document.getElementById("overlay");
const menuBtn=document.getElementById("menuBtn");
const closeMenuBtn=document.getElementById("closeMenuBtn");
const dashboardBtn=document.getElementById("dashboardBtn");
const viewServicesBtn=document.getElementById("viewServicesBtn");
const editProfileBtn=document.getElementById("editProfileBtn");
const logoutBtn=document.getElementById("logoutBtn");
const addServiceBtn=document.getElementById("addServiceBtn");
const servicesContainer=document.getElementById("servicesContainer");
const servicesLoading=document.getElementById("servicesLoading");
const servicesEmpty=document.getElementById("servicesEmpty");


/* =========================================================
   3. MODAL ELEMENTS
========================================================= */

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationCloseButton=document.getElementById("notificationCancelButton");
const notificationButton=document.getElementById("notificationButton");


/* =========================================================
   4. MODAL STATE
========================================================= */

let modalAction=null;
let modalKeepsOpen=false;


/* =========================================================
   5. SHOW MODAL
========================================================= */

function showModal(
    title,
    message,
    type="info",
    action=null,
    buttonText="Continue",
    keepOpen=false
){

    notificationTitle.textContent=title;
    notificationText.textContent=message;
    notificationButton.textContent=buttonText;
    notificationCard.className=`notification-card ${type}`;
    modalAction=action;
    modalKeepsOpen=keepOpen;
    notificationButton.disabled=false;
    notificationCloseButton.hidden=false;
    notificationOverlay.hidden=false;

}


/* =========================================================
   6. HIDE MODAL
========================================================= */

function hideModal(runAction=false){

    notificationOverlay.hidden=true;

    const action=modalAction;

    modalAction=null;
    modalKeepsOpen=false;

    if(runAction&&action)action();

}


/* =========================================================
   7. MODAL CLOSE
========================================================= */

function closeModal(){

    if(modalKeepsOpen&&modalAction){

        const action=modalAction;

        modalAction=null;
        modalKeepsOpen=false;

        action();

        return;
    }

    hideModal(true);

}


notificationButton.addEventListener(
    "click",
    closeModal
);


notificationCloseButton.addEventListener(
    "click",
    ()=>{

        if(notificationButton.disabled)return;

        hideModal(false);

    }
);


/* =========================================================
   8. BUTTON LOADING STATE
========================================================= */

function setLoading(button,loading){

    if(!button)return;

    if(loading){

        if(!button.dataset.originalText){
            button.dataset.originalText=button.textContent.trim();
        }

        button.disabled=true;
        button.classList.add("is-loading");
        button.textContent="Processing...";

        return;
    }

    button.disabled=false;
    button.classList.remove("is-loading");

    if(button.dataset.originalText){

        button.textContent=button.dataset.originalText;

        delete button.dataset.originalText;
    }

}


/* =========================================================
   9. AUTHENTICATION
========================================================= */

function redirectToLogin(){

    window.location.href=
        "../worker-authentication/index.html";
}


function authenticationError(message){

    removeAccessToken();

    showModal(
        "Authentication Required",
        message,
        "error",
        redirectToLogin,
        "Continue"
    );

}


function hasAccessToken(){

    const token=getAccessToken();

    if(!token){

        authenticationError(
            "Please log in to view your services."
        );

        return false;
    }

    return true;
}


/* =========================================================
   10. SERVICES LOADING STATE
========================================================= */

function setServicesLoading(loading){

    servicesLoading.hidden=!loading;

    if(loading){

        servicesContainer.innerHTML="";
        servicesEmpty.hidden=true;

    }

}


/* =========================================================
   11. LOAD SERVICES
========================================================= */

async function loadServices(){

    if(!hasAccessToken())return;

    setServicesLoading(true);

    try{

        const response=await API_REQUEST(
            SERVICES_ENDPOINT,
            {
                method:"GET"
            }
        );

        if(response.status===401)return;

        const data=await response.json();

        if(!response.ok){

            showModal(
                "Unable to Load Services",
                data.message||
                    "Unable to load your services. Please try again.",
                "error"
            );

            return;
        }

        displayServices(data.services);

    }catch(error){

        console.error(
            "Services request failed:",
            error
        );

        showModal(
            "Connection Error",
            "Unable to connect to the server. Please try again.",
            "error"
        );

    }finally{

        setServicesLoading(false);

    }

}


/* =========================================================
   12. FORMAT SERVICE DATE
========================================================= */

function formatServiceDate(dateValue){

    if(!dateValue)return"Date not provided";

    const date=new Date(dateValue);

    if(Number.isNaN(date.getTime()))
        return"Date not provided";

    const year=date.getUTCFullYear();

    const month=String(
        date.getUTCMonth()+1
    ).padStart(2,"0");

    const day=String(
        date.getUTCDate()
    ).padStart(2,"0");

    return`${year}-${month}-${day}`;

}


/* =========================================================
   13. DISPLAY SERVICES
========================================================= */

function displayServices(services){

    servicesContainer.innerHTML="";

    if(
        !services||
        !Array.isArray(services)||
        services.length===0
    ){

        servicesEmpty.hidden=false;

        return;
    }

    servicesEmpty.hidden=true;


    /* -----------------------------------------
       DISPLAY THE MOST RECENT SERVICE FIRST
    ----------------------------------------- */

    const sortedServices=[...services].sort(
        (a,b)=>{

            const dateA=new Date(a.date).getTime();
            const dateB=new Date(b.date).getTime();

            return dateB-dateA;

        }
    );


    sortedServices.forEach(service=>{

        const card=document.createElement("article");

        card.className="service-card";

        card.setAttribute(
            "role",
            "button"
        );

        card.setAttribute(
            "tabindex",
            "0"
        );


        /* -----------------------------------------
           SERVICE SKILL
        ----------------------------------------- */

        const skill=document.createElement("strong");

        skill.className="service-skill";

        skill.textContent=
            service.skill||"Service";


        /* -----------------------------------------
           SERVICE DATE
        ----------------------------------------- */

        const date=document.createElement("span");

        date.className="service-date";

        date.textContent=
            formatServiceDate(service.date);


        /* -----------------------------------------
           ADD CONTENT TO CARD
        ----------------------------------------- */

        card.appendChild(skill);
        card.appendChild(date);


        card.addEventListener(
            "click",
            ()=>openService(service.id)
        );


        card.addEventListener(
            "keydown",
            event=>{

                if(
                    event.key==="Enter"||
                    event.key===" "
                ){

                    event.preventDefault();

                    openService(service.id);

                }

            }
        );


        servicesContainer.appendChild(card);

    });

}


/* =========================================================
   13. OPEN SERVICE DETAILS
========================================================= */

function openService(serviceId){

    if(!serviceId){

        showModal(
            "Service Error",
            "This service could not be opened.",
            "error"
        );

        return;
    }

    sessionStorage.setItem(
        "serviceId",
        serviceId
    );

    window.location.href=
        "../worker-view-service/index.html";

}


/* =========================================================
   14. ADD SERVICE
========================================================= */

addServiceBtn.addEventListener(
    "click",
    ()=>{

        window.location.href=
            "../worker-create-service/index.html";

    }
);


/* =========================================================
   15. DASHBOARD NAVIGATION
========================================================= */

dashboardBtn.addEventListener(
    "click",
    ()=>{

        window.location.href=
            "../worker-dashboard/index.html";

    }
);


viewServicesBtn.addEventListener(
    "click",
    ()=>{

        closeSidebar();

    }
);


editProfileBtn.addEventListener(
    "click",
    ()=>{

        window.location.href=
            "../worker-edit-profile/index.html";

    }
);


/* =========================================================
   16. MOBILE SIDEBAR
========================================================= */

function openSidebar(){

    sidebar.classList.add("active");
    overlay.classList.add("active");

    menuBtn.setAttribute(
        "aria-expanded",
        "true"
    );

}


function closeSidebar(){

    sidebar.classList.remove("active");
    overlay.classList.remove("active");

    menuBtn.setAttribute(
        "aria-expanded",
        "false"
    );

}


menuBtn.addEventListener(
    "click",
    openSidebar
);


closeMenuBtn.addEventListener(
    "click",
    closeSidebar
);


overlay.addEventListener(
    "click",
    closeSidebar
);


/* =========================================================
   17. LOGOUT CONFIRMATION
========================================================= */

logoutBtn.addEventListener(
    "click",
    ()=>{

        showModal(
            "Logout",
            "Are you sure you want to log out?",
            "confirm",
            logoutWorker,
            "Logout",
            true
        );

    }
);


/* =========================================================
   18. LOGOUT REQUEST
========================================================= */

async function logoutWorker(){

    setLoading(
        notificationButton,
        true
    );

    try{

        const response=await API_REQUEST(
            LOGOUT_ENDPOINT,
            {
                method:"POST"
            }
        );

        if(response.status===401){

            setLoading(
                notificationButton,
                false
            );

            hideModal(false);

            authenticationError(
                "Your session has expired. Please log in again."
            );

            return;
        }

        const data=await response.json();

        if(!response.ok){

            setLoading(
                notificationButton,
                false
            );

            showModal(
                "Logout Failed",
                data.message||
                    "Unable to log out. Please try again.",
                "error"
            );

            return;
        }

        removeAccessToken();

        setLoading(
            notificationButton,
            false
        );

        window.location.href=
            "../worker-authentication/index.html";

    }catch(error){

        console.error(
            "Logout request failed:",
            error
        );

        setLoading(
            notificationButton,
            false
        );

        hideModal(false);

        showModal(
            "Connection Error",
            "Unable to log out at this time. Please try again.",
            "error"
        );

    }

}


/* =========================================================
   19. SESSION EXPIRATION EVENT
========================================================= */

window.addEventListener(
    "authSessionExpired",
    ()=>{

        setServicesLoading(false);

        authenticationError(
            "Your session has expired. Please log in again."
        );

    }
);


/* =========================================================
   20. INITIALIZE PAGE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    ()=>{
        loadServices();
    }
);