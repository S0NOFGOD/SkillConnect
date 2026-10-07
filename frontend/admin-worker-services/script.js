document.addEventListener("DOMContentLoaded",()=>{
    initializeServices();
    initializeSidebar();
    initializeLogout();
    initializeNotificationModal();
});

const getElement=id=>document.getElementById(id);

const notificationOverlay=getElement("notificationOverlay");
const notificationIcon=getElement("notificationIcon");
const notificationTitle=getElement("notificationTitle");
const notificationText=getElement("notificationText");
const notificationActions=document.querySelector(".notification-actions");
const notificationButton=getElement("notificationButton");
const notificationCancelButton=getElement("notificationCancelButton");

const servicesContainer=getElement("servicesContainer");

let notificationMode="message";


function showNotification(title,text,icon="!",mode="message"){

    notificationMode=mode;

    notificationIcon.textContent=icon;

    notificationTitle.textContent=title;

    notificationText.textContent=text;

    notificationActions.innerHTML="";

    notificationActions.appendChild(notificationButton);

    notificationButton.textContent="Continue";

    notificationButton.style.display="block";

    notificationCancelButton.style.display="block";

    notificationOverlay.hidden=false;

    notificationOverlay.classList.add("active");
}


function showConnecting(){

    notificationMode="message";

    notificationIcon.textContent="⟳";

    notificationTitle.textContent="Connecting…";

    notificationText.textContent=
        "Please wait while we connect to the SkillConnect server.";

    notificationActions.innerHTML="";

    notificationButton.style.display="none";

    notificationCancelButton.style.display="none";

    notificationOverlay.hidden=false;

    notificationOverlay.classList.add("active");
}


function hideNotification(){

    notificationOverlay.classList.remove("active");

    notificationOverlay.hidden=true;
}


function initializeNotificationModal(){

    notificationButton.addEventListener("click",()=>{

        if(notificationMode==="logout"){
            return;
        }

        hideNotification();

        if(notificationMode==="auth"){
            window.location.href=
                "../admin-authentication/index.html";
        }

    });


    notificationCancelButton.addEventListener(
        "click",
        hideNotification
    );

}


function initializeServices(){

    showConnecting();

    loadServices();

}


async function loadServices(){

    try{

        const response=await API_REQUEST(
            "/api/admin-worker-services",
            {
                method:"GET"
            }
        );


        if(!response.ok){

            hideNotification();


            if(response.status===401){

                showNotification(
                    "Authentication Required",
                    "Your session has expired. Please log in again.",
                    "!",
                    "auth"
                );

                return;

            }


            showNotification(
                "Services Error",
                "Unable to load worker services. Please try again.",
                "!"
            );

            return;

        }


        const data=await response.json();


        hideNotification();


        const services=data.services??data;


        if(!Array.isArray(services)||services.length===0){

            showEmptyState();

            return;

        }


        displayServices(services);


    }catch(error){

        console.error(
            "Admin worker services request failed:",
            error
        );


        hideNotification();


        showNotification(
            "Services Error",
            "Unable to connect to the SkillConnect server. Please try again.",
            "!"
        );

    }

}


function displayServices(services){

    servicesContainer.innerHTML="";


    services.forEach(service=>{

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


        const skill=document.createElement("strong");

        skill.className="service-skill";

        skill.textContent=
            service.skill||"Service";


        const serviceInfo=document.createElement("div");

        serviceInfo.className="service-info";


        const date=document.createElement("span");

        date.className="service-date";

        date.textContent=
            formatDate(service.date);


        const approval=document.createElement("span");

        approval.className="service-approval";

        const approvalStatus=
            service.adminApproval||"in review";

        approval.textContent=
            approvalStatus;


        if(approvalStatus==="in review"){
            approval.classList.add("in-review");
        }


        if(approvalStatus==="rejected"){
            approval.classList.add("rejected");
        }


        if(approvalStatus==="approved"){
            approval.classList.add("approved");
        }


        serviceInfo.appendChild(date);

        serviceInfo.appendChild(approval);


        card.appendChild(skill);

        card.appendChild(serviceInfo);


        card.addEventListener(
            "click",
            ()=>{
                selectService(
                    service.workerId,
                    service.serviceId
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

                    selectService(
                        service.workerId,
                        service.serviceId
                    );

                }

            }
        );


        servicesContainer.appendChild(card);

    });

}


function getStatusClass(status){

    const normalized=
        String(status??"in review")
        .toLowerCase()
        .trim()
        .replace(/\s+/g,"-");


    if(normalized==="approved"){
        return "approved";
    }


    if(normalized==="rejected"){
        return "rejected";
    }


    return "in-review";

}


function formatDate(date){

    if(!date){
        return "Date not provided";
    }


    const parsedDate=new Date(date);


    if(Number.isNaN(parsedDate.getTime())){
        return "Date not provided";
    }


    const year=parsedDate.getUTCFullYear();

    const month=String(
        parsedDate.getUTCMonth()+1
    ).padStart(2,"0");

    const day=String(
        parsedDate.getUTCDate()
    ).padStart(2,"0");


    return`${year}-${month}-${day}`;

}


function selectService(workerId,serviceId){

    sessionStorage.setItem(
        "workerId",
        workerId
    );

    sessionStorage.setItem(
        "serviceId",
        serviceId
    );


    window.location.href=
        "../admin-view-service/index.html";

}


function showEmptyState(){

    servicesContainer.innerHTML="";


    const emptyState=document.createElement("div");

    emptyState.className="empty-state";


    const title=document.createElement("h2");

    title.textContent="No Services In Review";


    const message=document.createElement("p");

    message.textContent=
        "There are currently no worker services awaiting admin approval.";


    emptyState.appendChild(title);

    emptyState.appendChild(message);


    servicesContainer.appendChild(emptyState);

}


function initializeSidebar(){

    const menuBtn=getElement("menuBtn");

    const closeMenuBtn=getElement("closeMenuBtn");

    const overlay=getElement("overlay");

    const sidebar=getElement("sidebar");


    const closeMenu=()=>{

        sidebar.classList.remove("active");

        overlay.classList.remove("active");

        menuBtn.setAttribute(
            "aria-expanded",
            "false"
        );

    };


    menuBtn.addEventListener(
        "click",
        ()=>{

            sidebar.classList.add("active");

            overlay.classList.add("active");

            menuBtn.setAttribute(
                "aria-expanded",
                "true"
            );

        }
    );


    closeMenuBtn.addEventListener(
        "click",
        closeMenu
    );


    overlay.addEventListener(
        "click",
        closeMenu
    );


    getElement("dashboardBtn").addEventListener(
        "click",
        ()=>{
            window.location.href=
                "../admin-dashboard/index.html";
        }
    );


    getElement("servicesBtn").addEventListener(
        "click",
        ()=>{
            window.location.href=
                "../admin-worker-services/index.html";
        }
    );


    getElement("adminBtn").addEventListener(
        "click",
        ()=>{
            window.location.href=
                "../admin-management/index.html";
        }
    );

}


function initializeLogout(){

    getElement("logoutBtn").addEventListener(
        "click",
        showLogoutConfirmation
    );

}


function showLogoutConfirmation(){

    notificationMode="logout";


    notificationIcon.textContent="!";

    notificationTitle.textContent="Logout";

    notificationText.textContent=
        "Are you sure you want to logout?";


    notificationActions.innerHTML="";


    const noButton=document.createElement("button");

    noButton.type="button";

    noButton.textContent="No";


    const yesButton=document.createElement("button");

    yesButton.type="button";

    yesButton.textContent="Yes";


    notificationActions.appendChild(noButton);

    notificationActions.appendChild(yesButton);


    notificationButton.style.display="none";

    notificationCancelButton.style.display="block";


    notificationOverlay.hidden=false;

    notificationOverlay.classList.add("active");


    noButton.addEventListener(
        "click",
        hideNotification
    );


    yesButton.addEventListener(
        "click",
        async()=>{

            yesButton.textContent="Connecting…";

            yesButton.disabled=true;

            noButton.disabled=true;

            notificationCancelButton.style.display="none";


            try{

                const response=await fetch(
                    API_ENDPOINT("/api/auth/logout"),
                    {
                        method:"POST",
                        credentials:"include"
                    }
                );


                if(response.ok){

                    window.location.href=
                        "../admin-authentication/index.html";

                    return;

                }


                yesButton.textContent="Yes";

                yesButton.disabled=false;

                noButton.disabled=false;

                notificationCancelButton.style.display="block";

                notificationMode="message";


                showNotification(
                    "Logout Failed",
                    "Unable to logout. Please try again.",
                    "!"
                );


            }catch(error){

                console.error(
                    "Logout request failed:",
                    error
                );


                yesButton.textContent="Yes";

                yesButton.disabled=false;

                noButton.disabled=false;

                notificationCancelButton.style.display="block";

                notificationMode="message";


                showNotification(
                    "Logout Failed",
                    "Unable to connect to the server. Please try again.",
                    "!"
                );

            }

        }
    );

}