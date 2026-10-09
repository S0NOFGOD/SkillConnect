const getElement=id=>document.getElementById(id);

const VIEW_SERVICE_ENDPOINT="/api/admin-view-service";
const APPROVE_SERVICE_ENDPOINT="/api/admin-view-service";
const REJECT_SERVICE_ENDPOINT="/api/admin-view-service";

let modalCallback=null;
let modalBusy=false;
let modalConfirmation=false;
let sessionExpired=false;
let pageLoading=true;

document.addEventListener("DOMContentLoaded",()=>{
    initializeBackNavigation();
    initializeForm();
    initializeModal();

    window.addEventListener("authSessionExpired",()=>{
        sessionExpired=true;
        modalBusy=false;
        modalConfirmation=false;

        showNotification(
            "error",
            "Authentication Required",
            "Your session has expired. Please log in again.",
            "Continue",
            redirectToLogin
        );
    });

    initializePage();
});

/* =========================
   BACK NAVIGATION
========================= */

function initializeBackNavigation(){
    getElement("backNavigation")?.addEventListener("click",()=>{
        if(modalBusy)return;
        window.location.href="../admin-worker-services/index.html";
    });
}

/* =========================
   LOAD SERVICE
========================= */

async function initializePage(){
    const workerId=sessionStorage.getItem("workerId");
    const serviceId=sessionStorage.getItem("serviceId");

    if(!workerId||!serviceId){
        pageLoading=false;

        showNotification(
            "error",
            "Service Not Found",
            "The worker ID or service ID could not be found. Please return to Admin Services.",
            "Continue",
            ()=>window.location.href="../admin-worker-services/index.html"
        );

        return;
    }

    pageLoading=true;

    showLoadingModal(
        "Connecting...",
        "Please wait while we load the service."
    );

    try{
        const response=await API_REQUEST(
            `${VIEW_SERVICE_ENDPOINT}/${encodeURIComponent(serviceId)}?workerId=${encodeURIComponent(workerId)}`,
            {method:"GET"}
        );

        if(response.status===401){
            if(!sessionExpired)showSessionExpired();
            return;
        }

        const data=await readResponse(response);

        if(!response.ok){
            throw new Error(data.message||"Unable to load this service.");
        }

        if(sessionExpired)return;

        displayService(data.service||data);

        getElement("viewServicePage").hidden=false;

        closeNotification(true);

    }catch(error){
        if(sessionExpired)return;

        showNotification(
            "error",
            "Unable to Load Service",
            error.message||"Something went wrong while loading the service.",
            "Continue"
        );

    }finally{
        pageLoading=false;
    }
}

/* =========================
   DISPLAY SERVICE
========================= */

function displayService(service){
    if(!service)return;

    getElement("skill").value=service.skill||"";
    getElement("experience").value=service.experience||"";
    getElement("description").value=service.description||"";

    const date=service.date||service.createdAt||service.updatedAt;

    getElement("serviceDate").value=date?formatDate(date):"Not available";

    displayPortfolios(service.portfolios||[]);
}

function formatDate(value){
    const date=new Date(value);

    if(Number.isNaN(date.getTime()))return String(value);

    return new Intl.DateTimeFormat("en-NG",{
        day:"numeric",
        month:"long",
        year:"numeric"
    }).format(date);
}

/* =========================
   DISPLAY PORTFOLIOS
========================= */

function displayPortfolios(portfolios=[]){
    if(!Array.isArray(portfolios))portfolios=[];

    for(let i=1;i<=3;i++){
        const preview=getElement(`portfolioPreview${i}`);

        preview.replaceChildren();

        const portfolio=portfolios[i-1];

        const url=typeof portfolio==="string"
            ?portfolio
            :portfolio?.url||portfolio?.secure_url||portfolio?.imageUrl||"";

        if(!url){
            const number=document.createElement("span");
            number.className="portfolio-placeholder";
            number.textContent=String(i);

            const label=document.createElement("span");
            label.className="portfolio-add-text";
            label.textContent="No Image";

            preview.append(number,label);
            continue;
        }

        const image=document.createElement("img");

        image.src=url;
        image.alt=`Portfolio ${i}`;
        image.loading="lazy";

        image.addEventListener("error",()=>{
            preview.replaceChildren();

            const label=document.createElement("span");
            label.className="portfolio-add-text";
            label.textContent="Image unavailable";

            preview.appendChild(label);
        });

        preview.appendChild(image);
    }
}

/* =========================
   INITIALIZE BUTTONS
========================= */

function initializeForm(){
    getElement("serviceForm")?.addEventListener("submit",event=>{
        event.preventDefault();
    });

    getElement("approveServiceBtn")?.addEventListener("click",()=>{
        confirmDecision("approve");
    });

    getElement("rejectServiceBtn")?.addEventListener("click",()=>{
        confirmDecision("reject");
    });
}

/* =========================
   OPEN ADMIN RESPONSE MODAL
========================= */

function confirmDecision(action){
    if(modalBusy||sessionExpired||pageLoading)return;

    const workerId=sessionStorage.getItem("workerId");
    const serviceId=sessionStorage.getItem("serviceId");

    if(!workerId||!serviceId){
        showNotification(
            "error",
            "Service Not Found",
            "The worker ID or service ID could not be found.",
            "Continue",
            ()=>window.location.href="../admin-worker-services/index.html"
        );

        return;
    }

    showResponseModal(action);
}

function showResponseModal(action){
    const overlay=getElement("notificationOverlay");
    const card=getElement("notificationCard");
    const icon=getElement("notificationIcon");
    const actions=getElement("notificationActions");
    const close=getElement("notificationCancelButton");

    modalCallback=()=>submitDecision(action);
    modalConfirmation=true;

    card.className="notification-card confirm";

    getElement("notificationTitle").textContent="Admin Response / Reason";

    getElement("notificationText").textContent=
        action==="approve"
            ?"Enter your response before approving this service."
            :"Enter the reason for rejecting this service.";

    icon.textContent=action==="approve"?"✓":"!";
    icon.style.color=action==="approve"?"#a855f7":"#ef4444";
    icon.style.background=action==="approve"
        ?"rgba(168,85,247,.12)"
        :"rgba(239,68,68,.1)";

    actions.replaceChildren();
    actions.style.flexWrap="wrap";

    const responseInput=document.createElement("textarea");

    responseInput.id="decisionResponseInput";
    responseInput.className="modal-response-input";
    responseInput.placeholder="Enter admin response / reason...";
    responseInput.maxLength=1000;
    responseInput.rows=4;
    responseInput.required=true;
    responseInput.setAttribute("aria-label","Admin response or reason");

    actions.appendChild(responseInput);

    const sendButton=document.createElement("button");

    sendButton.type="button";
    sendButton.id="notificationButton";
    sendButton.textContent="Send";
    sendButton.className=action==="reject"
        ?"confirm-reject-button"
        :"confirm-yes-button";

    actions.appendChild(sendButton);

    close.style.display="flex";

    overlay.hidden=false;
    overlay.classList.add("active");

    responseInput.focus();
}

/* =========================
   SEND APPROVAL / REJECTION
========================= */

async function submitDecision(action){
    const workerId=sessionStorage.getItem("workerId");
    const serviceId=sessionStorage.getItem("serviceId");

    const adminResponse=
        getElement("decisionResponseInput")?.value.trim()||"";

    if(!adminResponse){
        throw new Error("Please enter your admin response or reason.");
    }

    if(!workerId||!serviceId){
        throw new Error("The worker ID or service ID could not be found.");
    }

    const endpoint=action==="approve"
        ?APPROVE_SERVICE_ENDPOINT
        :REJECT_SERVICE_ENDPOINT;

    const response=await API_REQUEST(
        `${endpoint}/${encodeURIComponent(serviceId)}/${action}`,
        {
            method:"PUT",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                workerId,
                serviceId,
                adminResponse
            })
        }
    );

    if(response.status===401){
        showSessionExpired();
        return null;
    }

    const data=await readResponse(response);

    if(!response.ok){
        throw new Error(data.message||`Unable to ${action} this service.`);
    }

    return{
        type:"success",
        title:action==="approve"?"Service Approved":"Service Rejected",
        message:data.message||(action==="approve"
            ?"Service approved successfully."
            :"Service rejected successfully.")
    };
}

/* =========================
   INITIALIZE MODAL
========================= */

function initializeModal(){
    getElement("notificationActions")?.addEventListener("click",async event=>{
        const button=event.target.closest("button");

        if(!button||modalBusy)return;

        if(button.id!=="notificationButton")return;

        if(modalConfirmation){
            await executeConfirmation();
            return;
        }

        const callback=modalCallback;

        modalCallback=null;
        closeNotification();

        if(typeof callback==="function")callback();
    });

    getElement("notificationCancelButton")?.addEventListener("click",()=>{
        if(modalBusy)return;
        closeNotification();
    });

    getElement("notificationOverlay")?.addEventListener("click",event=>{
        if(
            event.target===getElement("notificationOverlay")&&
            !modalBusy
        ){
            closeNotification();
        }
    });
}

/* =========================
   EXECUTE REQUEST
========================= */

async function executeConfirmation(){
    if(modalBusy||typeof modalCallback!=="function")return;

    const action=modalCallback;
    const sendButton=getElement("notificationButton");

    modalBusy=true;
    modalCallback=null;

    sendButton.textContent="Connecting...";
    sendButton.disabled=true;

    try{
        const result=await action();

        if(sessionExpired)return;

        if(!result)return;

        modalConfirmation=false;

        closeNotification(true);

        showNotification(
            result.type||"success",
            result.title||"Success",
            result.message||"Your request was completed successfully.",
            "Continue"
        );

    }catch(error){
        if(sessionExpired)return;

        modalConfirmation=false;

        closeNotification(true);

        showNotification(
            "error",
            "Request Failed",
            error.message||"Something went wrong. Please try again.",
            "Continue"
        );

    }finally{
        modalBusy=false;
    }
}

/* =========================
   SHOW NOTIFICATION
========================= */

function showNotification(type,title,message,buttonText="Continue",callback=null){
    const overlay=getElement("notificationOverlay");
    const card=getElement("notificationCard");
    const icon=getElement("notificationIcon");
    const actions=getElement("notificationActions");
    const close=getElement("notificationCancelButton");

    modalCallback=callback;
    modalConfirmation=false;

    card.className=`notification-card ${type}`;

    getElement("notificationTitle").textContent=title;
    getElement("notificationText").textContent=message;

    icon.textContent=type==="success"?"✓":"!";

    icon.style.color=type==="success"
        ?" #22c55e"
        :type==="warning"
            ?" #f59e0b"
            :" #ef4444";

    icon.style.background=type==="success"
        ?"rgba(34,197,94,.1)"
        :type==="warning"
            ?"rgba(245,158,11,.1)"
            :"rgba(239,68,68,.1)";

    actions.replaceChildren();
    actions.style.flexWrap="nowrap";

    const button=document.createElement("button");

    button.type="button";
    button.id="notificationButton";
    button.textContent=buttonText;

    actions.appendChild(button);

    close.style.display=callback?"none":"flex";

    overlay.hidden=false;
    overlay.classList.add("active");
}

/* =========================
   LOADING MODAL
========================= */

function showLoadingModal(title,message){
    const overlay=getElement("notificationOverlay");
    const card=getElement("notificationCard");
    const actions=getElement("notificationActions");
    const icon=getElement("notificationIcon");

    modalCallback=null;
    modalConfirmation=false;

    card.className="notification-card info";

    getElement("notificationTitle").textContent=title;
    getElement("notificationText").textContent=message;

    icon.textContent="…";
    icon.style.color="#a855f7";
    icon.style.background="rgba(168,85,247,.12)";

    actions.replaceChildren();

    getElement("notificationCancelButton").style.display="none";

    overlay.hidden=false;
    overlay.classList.add("active");
}

/* =========================
   CLOSE MODAL
========================= */

function closeNotification(force=false){
    if(modalBusy&&!force)return;

    const overlay=getElement("notificationOverlay");

    overlay.classList.remove("active");
    overlay.hidden=true;

    getElement("notificationCancelButton").style.display="flex";

    modalCallback=null;
    modalConfirmation=false;
}

/* =========================
   SESSION EXPIRED
========================= */

function showSessionExpired(){
    sessionExpired=true;
    modalBusy=false;
    modalConfirmation=false;

    showNotification(
        "error",
        "Authentication Required",
        "Your session has expired. Please log in again.",
        "Continue",
        redirectToLogin
    );
}

function redirectToLogin(){
    window.location.href="../admin-authentication/index.html";
}

/* =========================
   READ SERVER RESPONSE
========================= */

async function readResponse(response){
    const text=await response.text();

    if(!text)return{};

    try{
        return JSON.parse(text);
    }catch{
        throw new Error("The server returned an invalid response. Please try again.");
    }
}