document.addEventListener("DOMContentLoaded",()=>{
    initializeDashboard();
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

let notificationMode="message";

function showNotification(title,text,icon="!"){
    notificationMode="message";
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
    notificationIcon.textContent="⟳";
    notificationTitle.textContent="Connecting…";
    notificationText.textContent="Please wait while we connect to the SkillConnect server.";
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
            window.location.href="../admin-authentication/index.html";
        }
    });

    notificationCancelButton.addEventListener("click",hideNotification);
}

function initializeDashboard(){
    showConnecting();
    loadDashboard();
}

async function loadDashboard(){
    try{
        const response=await API_REQUEST(
            "/api/admin-dashboard",
            {
                method:"GET"
            }
        );

        if(!response.ok){
            hideNotification();

            if(response.status===401){
                notificationMode="auth";

                showNotification(
                    "Authentication Required",
                    "Your session has expired. Please log in again.",
                    "!"
                );

                return;
            }

            showNotification(
                "Dashboard Error",
                "Unable to load dashboard data. Please try again.",
                "!"
            );

            return;
        }

        const data=await response.json();

        getElement("totalWorkers").textContent=data.totalWorkers??0;
        getElement("totalClients").textContent=data.totalClients??0;
        getElement("verifiedWorkerCount").textContent=data.verifiedWorkers??0;
        getElement("totalServices").textContent=data.totalServices??0;
        getElement("clientContact").textContent=data.totalContact??0;
        getElement("totalRatings").textContent=data.totalRating??0;

        hideNotification();

    }catch(error){
        console.error(
            "Admin dashboard request failed:",
            error
        );

        hideNotification();

        showNotification(
            "Dashboard Error",
            "Unable to connect to the SkillConnect server. Please try again.",
            "!"
        );
    }
}

function initializeSidebar(){
    const menuBtn=getElement("menuBtn");
    const closeMenuBtn=getElement("closeMenuBtn");
    const overlay=getElement("overlay");
    const sidebar=getElement("sidebar");

    const closeMenu=()=>{
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        menuBtn.setAttribute("aria-expanded","false");
    };

    menuBtn.addEventListener("click",()=>{
        sidebar.classList.add("active");
        overlay.classList.add("active");
        menuBtn.setAttribute("aria-expanded","true");
    });

    closeMenuBtn.addEventListener("click",closeMenu);
    overlay.addEventListener("click",closeMenu);

    getElement("servicesBtn").addEventListener("click",()=>{
        window.location.href="../admin-worker-services/index.html";
    });

    getElement("adminBtn").addEventListener("click",()=>{
        window.location.href="../admin-management/index.html";
    });
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
    notificationText.textContent="Are you sure you want to logout?";

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