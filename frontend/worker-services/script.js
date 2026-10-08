const SERVICES_ENDPOINT="/api/worker/services";
const LOGOUT_ENDPOINT="/api/auth/logout";

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

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");

const notificationCloseButton=document.getElementById(
"notificationCancelButton"
);

const notificationNoButton=document.getElementById(
"notificationNoButton"
);

const notificationButton=document.getElementById(
"notificationButton"
);

let modalAction=null;

function showModal(
title,
message,
type="info",
action=null,
buttonText="OK",
confirmation=false
){

notificationTitle.textContent=title;

notificationText.textContent=message;

notificationButton.textContent=buttonText;

notificationCard.className=
    `notification-card ${type}`;

modalAction=action;

notificationButton.hidden=false;

notificationCloseButton.hidden=true;

notificationNoButton.hidden=true;


if(confirmation){

    notificationNoButton.hidden=false;

    notificationCloseButton.hidden=true;

}else{

    notificationCloseButton.hidden=false;

}


notificationOverlay.hidden=false;

notificationOverlay.classList.add("active");

}

function hideModal(){

notificationOverlay.classList.remove("active");

notificationOverlay.hidden=true;

modalAction=null;

notificationButton.disabled=false;

notificationButton.classList.remove(
    "is-loading"
);

notificationNoButton.disabled=false;

notificationNoButton.hidden=true;

notificationCloseButton.hidden=false;


if(notificationButton.dataset.originalText){

    notificationButton.textContent=
        notificationButton.dataset.originalText;

    delete notificationButton.dataset.originalText;
}

}

function closeModal(){

const action=modalAction;

if(action){

    setLoading(
        notificationButton,
        true
    );

    modalAction=null;

    action();

    return;
}

hideModal();

}

notificationButton.addEventListener(
"click",
closeModal
);

notificationNoButton.addEventListener(
"click",
()=>{
hideModal();
}
);

notificationCloseButton.addEventListener(
"click",
()=>{
if(notificationButton.disabled)return;

    hideModal();
}

);

function setLoading(button,loading){

if(!button)return;


if(loading){

    if(!button.dataset.originalText){

        button.dataset.originalText=
            button.textContent.trim();

    }

    button.disabled=true;

    button.classList.add(
        "is-loading"
    );

    button.textContent=
        "Connecting...";

    return;
}


button.disabled=false;

button.classList.remove(
    "is-loading"
);


if(button.dataset.originalText){

    button.textContent=
        button.dataset.originalText;

    delete button.dataset.originalText;
}

}

function redirectToLogin(){

window.location.href=
    "../worker-authentication/index.html";

}

function authenticationError(
message=
"Your session has expired. Please log in again."
){

showModal(
    "Authentication Required",
    message,
    "error",
    redirectToLogin,
    "Continue"
);

}

function setServicesLoading(loading){

servicesLoading.hidden=!loading;

if(loading){

    servicesContainer.innerHTML="";

    servicesEmpty.hidden=true;

}

}

async function loadServices(){

setServicesLoading(true);

try{

    const response=
        await API_REQUEST(
            SERVICES_ENDPOINT,
            {
                method:"GET"
            }
        );


    if(response.status===401){

        return;
    }


    const data=
        await response.json();


    if(!response.ok){

        showModal(
            "Unable to Load Services",
            data.message||
            "Unable to load your services. Please try again.",
            "error"
        );

        return;
    }


    displayServices(
        data.services
    );


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

function formatServiceDate(dateValue){

if(!dateValue){

    return"Date not provided";

}

const date=
    new Date(dateValue);

if(Number.isNaN(date.getTime())){

    return"Date not provided";

}

const year=
    date.getUTCFullYear();

const month=
    String(
        date.getUTCMonth()+1
    ).padStart(2,"0");

const day=
    String(
        date.getUTCDate()
    ).padStart(2,"0");

return`${year}-${month}-${day}`;

}

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

const sortedServices=
    [...services].sort(
        (a,b)=>{

            const dateA=
                new Date(a.date).getTime();

            const dateB=
                new Date(b.date).getTime();

            return dateB-dateA;

        }
    );

sortedServices.forEach(
    service=>{

        const card=
            document.createElement("article");

        card.className=
            "service-card";

        card.setAttribute(
            "role",
            "button"
        );

        card.setAttribute(
            "tabindex",
            "0"
        );


        const skill=
            document.createElement("strong");

        skill.className=
            "service-skill";

        skill.textContent=
            service.skill||"Service";


        const serviceInfo=
            document.createElement("div");

        serviceInfo.className=
            "service-info";


        const date=
            document.createElement("span");

        date.className=
            "service-date";

        date.textContent=
            formatServiceDate(
                service.date
            );


        const approval=
            document.createElement("span");

        approval.className=
            "service-approval";


        const approvalStatus=
            service.adminApproval||
            "in review";

        approval.textContent=
            approvalStatus;


        if(approvalStatus==="in review"){

            approval.classList.add(
                "in-review"
            );

        }


        if(approvalStatus==="rejected"){

            approval.classList.add(
                "rejected"
            );

        }


        if(approvalStatus==="approved"){

            approval.classList.add(
                "approved"
            );

        }


        serviceInfo.appendChild(
            date
        );

        serviceInfo.appendChild(
            approval
        );

        card.appendChild(
            skill
        );

        card.appendChild(
            serviceInfo
        );


        card.addEventListener(
            "click",
            ()=>{
                openService(
                    service.id
                );
            }
        );


        card.addEventListener(
            "keydown",
            event=>{

                if(
                    event.key==="Enter"||
                    event.key===" "
                ){

                    event.preventDefault();

                    openService(
                        service.id
                    );

                }

            }
        );


        servicesContainer.appendChild(
            card
        );

    }
);

}

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

addServiceBtn.addEventListener(
"click",
()=>{
window.location.href=
    "../worker-create-service/index.html";
}
);

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

function openSidebar(){

sidebar.classList.add(
    "active"
);

overlay.classList.add(
    "active"
);

menuBtn.setAttribute(
    "aria-expanded",
    "true"
);

}

function closeSidebar(){

sidebar.classList.remove(
    "active"
);

overlay.classList.remove(
    "active"
);

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

logoutBtn.addEventListener(
"click",
showLogoutConfirmation
);

function showLogoutConfirmation(){

showModal(
    "Logout",
    "Are you sure you want to log out?",
    "confirm",
    logoutWorker,
    "Yes",
    true
);

}

async function logoutWorker(){

try{

    const response=
        await API_REQUEST(
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

        hideModal();


        showModal(
            "Authentication Required",
            "Your session has expired. Please log in again.",
            "error",
            redirectToLogin,
            "Continue"
        );

        return;
    }


    const data=
        await response.json();


    if(!response.ok){

        setLoading(
            notificationButton,
            false
        );

        hideModal();


        showModal(
            "Logout Failed",
            data.message||
            "Unable to log out. Please try again.",
            "error"
        );

        return;
    }


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


    hideModal();


    showModal(
        "Connection Error",
        "Unable to log out at this time. Please try again.",
        "error"
    );

}

}

window.addEventListener(
"authSessionExpired",
()=>{

    setServicesLoading(false);

    hideModal();

    authenticationError();

}
);

document.addEventListener(
"DOMContentLoaded",
()=>{
loadServices();
}
);