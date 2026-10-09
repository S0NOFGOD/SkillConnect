const getElement=id=>document.getElementById(id);

const VIEW_SERVICE_ENDPOINT="/api/worker/view-service";
const UPDATE_SERVICE_ENDPOINT="/api/worker/view-service";
const DELETE_SERVICE_ENDPOINT="/api/worker/view-service";

const LOCAL_SKILLS=[
"Swimming Instructor","Barber","Hairdresser","Makeup Artist","Tailor","Fashion Designer",
"Plumber","Electrician","Painter","Welder","Carpenter","Bricklayer","Cleaner",
"Laundry Service","Mechanic","Auto Electrician","Phone Repair","Computer Repair",
"Graphic Designer","Web Developer","Photographer","Videographer","Caterer","Baker",
"Cook","Event Planner","Interior Decorator","AC Technician","Generator Repair",
"POP Installer","Tiler","Furniture Maker","Driver","Tutor","Fitness Trainer","Other"
];

let modalCallback=null;
let modalBusy=false;
let modalConfirmation=false;
let sessionExpired=false;

document.addEventListener("DOMContentLoaded",()=>{
    initializeBackNavigation();
    initializePortfolioInputs();
    initializeDescriptionCounter();
    initializeForm();
    initializeModal();
    populateSkills();

    window.addEventListener("authSessionExpired",()=>{
        sessionExpired=true;
        modalBusy=false;

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

function populateSkills(){
    const select=getElement("skill");
    if(!select)return;

    LOCAL_SKILLS.forEach(value=>{
        const option=document.createElement("option");
        option.value=value;
        option.textContent=value;
        select.appendChild(option);
    });
}

function initializeBackNavigation(){
    getElement("backNavigation")?.addEventListener("click",()=>{
        if(modalBusy)return;

        sessionStorage.removeItem("serviceId");
        window.location.href="../worker-services/index.html";
    });
}

async function initializePage(){
    const serviceId=sessionStorage.getItem("serviceId");

    if(!serviceId){
        showNotification(
            "error",
            "Service Not Found",
            "The service ID could not be found. Please return to your services.",
            "Continue",
            ()=>window.location.href="../worker-services/index.html"
        );
        return;
    }

    showLoadingModal(
        "Connecting...",
        "Please wait while we load your service."
    );

    try{
        const response=await API_REQUEST(
            `${VIEW_SERVICE_ENDPOINT}/${encodeURIComponent(serviceId)}`,
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
        closeNotification();

    }catch(error){
        if(sessionExpired)return;

        showNotification(
            "error",
            "Unable to Load Service",
            error.message||"Something went wrong while loading your service.",
            "Continue"
        );
    }
}

function displayService(service){
    if(!service)return;

    const skill=getElement("skill");
    const experience=getElement("experience");
    const description=getElement("description");

    if(service.skill){
        const exists=Array.from(skill.options).some(
            option=>option.value===service.skill
        );

        if(!exists){
            const option=document.createElement("option");
            option.value=service.skill;
            option.textContent=service.skill;
            skill.appendChild(option);
        }

        skill.value=service.skill;
    }

    if(service.experience){
        experience.value=service.experience;
    }

    description.value=service.description||"";

    const adminApproval=getElement("adminApproval");
    const adminResponse=getElement("adminResponse");
    const adminStatusContainer=getElement("adminStatusContainer");

    const approvalStatus=String(service.adminApproval||"in review")
        .trim()
        .toLowerCase();

    const statusClass={
        "in review":"status-in-review",
        "rejected":"status-rejected",
        "approved":"status-approved"
    }[approvalStatus]||"status-in-review";

    adminApproval.textContent=
        service.adminApproval??"In Review";

    adminResponse.textContent=
        service.adminResponse??"Your service is awaiting admin review.";

    adminStatusContainer.classList.remove(
        "status-in-review",
        "status-rejected",
        "status-approved"
    );

    adminStatusContainer.classList.add(statusClass);

    displayPortfolios(service.portfolios||[]);
    updateDescriptionWordCount();
}

function displayPortfolios(portfolios=[]){
    if(!Array.isArray(portfolios))return;

    portfolios.slice(0,3).forEach((portfolio,index)=>{
        const preview=getElement(`portfolioPreview${index+1}`);
        if(!preview)return;

        const url=typeof portfolio==="string"
            ?portfolio
            :portfolio.url||portfolio.secure_url||portfolio.imageUrl||"";

        if(!url)return;

        preview.replaceChildren();

        const image=document.createElement("img");
        image.src=url;
        image.alt=`Portfolio ${index+1}`;

        preview.appendChild(image);
    });
}

function initializePortfolioInputs(){
    for(let i=1;i<=3;i++){
        const input=getElement(`portfolioPhoto${i}`);
        const preview=getElement(`portfolioPreview${i}`);

        if(!input||!preview)continue;

        input.addEventListener("change",()=>{
            const file=input.files?.[0];
            if(!file)return;

            const error=validateImage(file);

            if(error){
                input.value="";
                showNotification("error","Invalid Image",error,"Continue");
                return;
            }

            const reader=new FileReader();

            reader.onload=event=>{
                preview.replaceChildren();

                const image=document.createElement("img");
                image.src=event.target.result;
                image.alt=`Portfolio ${i}`;

                preview.appendChild(image);
            };

            reader.readAsDataURL(file);
        });
    }
}

function validateImage(file){
    const allowedTypes=["image/jpeg","image/png","image/webp"];

    if(!allowedTypes.includes(file.type)){
        return `"${file.name}" must be a JPEG, PNG, or WebP image.`;
    }

    if(file.size>5*1024*1024){
        return `"${file.name}" exceeds 5MB. Choose an image that is 5MB or smaller.`;
    }

    return "";
}

function initializeDescriptionCounter(){
    getElement("description")?.addEventListener(
        "input",
        updateDescriptionWordCount
    );

    updateDescriptionWordCount();
}

function updateDescriptionWordCount(){
    const description=getElement("description");
    const counter=getElement("descriptionWordCount");

    if(!description||!counter)return;

    const words=description.value.trim().split(/\s+/).filter(Boolean);

    counter.textContent=`${description.value.trim()?words.length:0} / 150 words`;
}

function initializeForm(){
    getElement("serviceForm")?.addEventListener("submit",event=>{
        event.preventDefault();
        confirmUpdateService();
    });

    getElement("deleteServiceBtn")?.addEventListener(
        "click",
        confirmDeleteService
    );
}

function validateService(){
    const skill=getElement("skill").value.trim();
    const experience=getElement("experience").value.trim();
    const description=getElement("description").value.trim();

    if(!skill){
        showNotification(
            "error",
            "Skill Required",
            "Please select your skill.",
            "Continue"
        );
        return false;
    }

    if(!experience){
        showNotification(
            "error",
            "Experience Required",
            "Please select your experience level.",
            "Continue"
        );
        return false;
    }

    if(!description){
        showNotification(
            "error",
            "Description Required",
            "Please describe the service you provide.",
            "Continue"
        );
        return false;
    }

    const words=description.split(/\s+/).filter(Boolean);

    if(words.length>150){
        showNotification(
            "error",
            "Description Too Long",
            "Your service description must not exceed 150 words.",
            "Continue"
        );
        return false;
    }

    for(let i=1;i<=3;i++){
        const file=getElement(`portfolioPhoto${i}`)?.files?.[0];

        if(file){
            const error=validateImage(file);

            if(error){
                showNotification(
                    "error",
                    "Invalid Portfolio Image",
                    error,
                    "Continue"
                );
                return false;
            }
        }
    }

    return true;
}

/* =========================
   UPDATE SERVICE CONFIRMATION
========================= */

function confirmUpdateService(){
    if(modalBusy||!validateService())return;

    const serviceId=sessionStorage.getItem("serviceId");

    if(!serviceId){
        showNotification(
            "error",
            "Service Not Found",
            "The service ID could not be found.",
            "Continue",
            ()=>window.location.href="../worker-services/index.html"
        );
        return;
    }

    showConfirmation(
        "Update Service?",
        "Are you sure you want to update your service details?",
        "No",
        "Yes",
        updateService
    );
}

async function updateService(){
    const serviceId=sessionStorage.getItem("serviceId");

    if(!serviceId){
        throw new Error("The service ID could not be found.");
    }

    const formData=new FormData();

    formData.append("serviceId",serviceId);
    formData.append("skill",getElement("skill").value.trim());
    formData.append("experience",getElement("experience").value.trim());
    formData.append("description",getElement("description").value.trim());

    for(let i=1;i<=3;i++){
        const file=getElement(`portfolioPhoto${i}`).files?.[0];

        if(file){
            formData.append("portfolioPhotos",file);
            formData.append("portfolioIndexes",String(i-1));
        }
    }

    const response=await API_REQUEST(
        `${UPDATE_SERVICE_ENDPOINT}/${encodeURIComponent(serviceId)}`,
        {
            method:"PUT",
            body:formData
        }
    );

    if(response.status===401){
        return{
            type:"error",
            title:"Authentication Required",
            message:"Your session has expired. Please log in again.",
            callback:redirectToLogin
        };
    }

    const data=await readResponse(response);

    if(!response.ok){
        throw new Error(data.message||"Unable to update the service.");
    }

    return{
        type:"success",
        title:"Service Updated",
        message:data.message||"Your service has been updated successfully.",
        callback:()=>window.location.reload()
    };
}

/* =========================
   DELETE SERVICE CONFIRMATION
========================= */

function confirmDeleteService(){
    if(modalBusy)return;

    const serviceId=sessionStorage.getItem("serviceId");

    if(!serviceId){
        showNotification(
            "error",
            "Service Not Found",
            "The service ID could not be found.",
            "Continue",
            ()=>window.location.href="../worker-services/index.html"
        );
        return;
    }

    showConfirmation(
        "Delete Service?",
        "Are you sure you want to delete this service and its portfolio images?",
        "No",
        "Yes",
        deleteService
    );
}

async function deleteService(){
    const serviceId=sessionStorage.getItem("serviceId");

    if(!serviceId){
        throw new Error("The service ID could not be found.");
    }

    const response=await API_REQUEST(
        `${DELETE_SERVICE_ENDPOINT}/${encodeURIComponent(serviceId)}`,
        {method:"DELETE"}
    );

    if(response.status===401){
        return{
            type:"error",
            title:"Authentication Required",
            message:"Your session has expired. Please log in again.",
            callback:redirectToLogin
        };
    }

    const data=await readResponse(response);

    if(!response.ok){
        throw new Error(data.message||"Unable to delete the service.");
    }

    sessionStorage.removeItem("serviceId");

    return{
        type:"success",
        title:"Service Deleted",
        message:data.message||"Your service has been deleted successfully.",
        callback:()=>window.location.href="../worker-services/index.html"
    };
}

/* =========================
   MODAL INITIALIZATION
========================= */

function initializeModal(){
    const actions=getElement("notificationActions");

    actions?.addEventListener("click",async event=>{
        const button=event.target.closest("button");

        if(!button||modalBusy)return;

        if(button.id==="confirmNoButton"){
            closeNotification();
            return;
        }

        if(button.id!=="notificationButton")return;

        if(modalConfirmation){
            await executeConfirmation();
            return;
        }

        const callback=modalCallback;

        modalCallback=null;
        closeNotification();

        if(typeof callback==="function"){
            callback();
        }
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
   RUN CONFIRMED REQUEST
========================= */

async function executeConfirmation(){
    if(modalBusy||typeof modalCallback!=="function")return;

    const action=modalCallback;
    const yesButton=getElement("notificationButton");
    const noButton=getElement("confirmNoButton");

    modalBusy=true;
    modalCallback=null;

    yesButton.dataset.originalText="Yes";
    yesButton.textContent="Connecting...";
    yesButton.disabled=true;

    if(noButton)noButton.disabled=true;

    try{
        const result=await action();

        // Restore Yes before displaying the result.
        yesButton.textContent="Yes";
        yesButton.disabled=false;
        delete yesButton.dataset.originalText;

        modalBusy=false;
        modalConfirmation=false;

        closeNotification();

        if(result){
            showNotification(
                result.type||"success",
                result.title||"Success",
                result.message||"Your request was completed successfully.",
                "Continue",
                result.callback||null
            );
        }

    }catch(error){
        yesButton.textContent="Yes";
        yesButton.disabled=false;
        delete yesButton.dataset.originalText;

        modalBusy=false;
        modalConfirmation=false;

        closeNotification();

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

function showNotification(
    type,
    title,
    message,
    buttonText="Continue",
    callback=null
){
    const overlay=getElement("notificationOverlay");
    const card=getElement("notificationCard");
    const icon=getElement("notificationIcon");
    const actions=getElement("notificationActions");
    const close=getElement("notificationCancelButton");

    modalCallback=callback;
    modalConfirmation=false;

    card.className=`notification-card ${type}`;
    card.dataset.loading="false";

    getElement("notificationTitle").textContent=title;
    getElement("notificationText").textContent=message;

    icon.textContent=type==="success"?"✓":type==="warning"?"!":"!";
    icon.style.color=type==="success"?"#22c55e":type==="warning"?"#f59e0b":"#ef4444";
    icon.style.background=type==="success"
        ?"rgba(34,197,94,.1)"
        :type==="warning"
            ?"rgba(245,158,11,.1)"
            :"rgba(239,68,68,.1)";

    actions.replaceChildren();

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
   SHOW NO | YES CONFIRMATION
========================= */

function showConfirmation(title,message,noText,yesText,onYes){
    if(modalBusy)return;

    const overlay=getElement("notificationOverlay");
    const card=getElement("notificationCard");
    const icon=getElement("notificationIcon");
    const actions=getElement("notificationActions");
    const close=getElement("notificationCancelButton");

    modalCallback=onYes;
    modalConfirmation=true;

    card.className="notification-card confirm";
    card.dataset.loading="false";

    getElement("notificationTitle").textContent=title;
    getElement("notificationText").textContent=message;

    icon.textContent="!";
    icon.style.color="#16a34a";
    icon.style.background="rgba(245,158,11,.12)";

    actions.replaceChildren();

    const noButton=document.createElement("button");
    noButton.type="button";
    noButton.id="confirmNoButton";
    noButton.className="cancel-button";
    noButton.textContent=noText;

    const yesButton=document.createElement("button");
    yesButton.type="button";
    yesButton.id="notificationButton";
    yesButton.className="confirm-yes-button";
    yesButton.textContent=yesText;

    actions.append(noButton,yesButton);

    close.style.display="none";

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

    modalCallback=null;
    modalConfirmation=false;

    card.className="notification-card info";
    card.dataset.loading="true";

    getElement("notificationTitle").textContent=title;
    getElement("notificationText").textContent=message;

    const icon=getElement("notificationIcon");
    icon.textContent="…";
    icon.style.color="#22c55e";
    icon.style.background="rgba(34,197,94,.1)";

    actions.replaceChildren();
    getElement("notificationCancelButton").style.display="none";

    overlay.hidden=false;
    overlay.classList.add("active");
}

/* =========================
   CLOSE MODAL
========================= */

function closeNotification(){
    if(modalBusy)return;

    const overlay=getElement("notificationOverlay");
    const card=getElement("notificationCard");

    overlay.classList.remove("active");
    overlay.hidden=true;
    card.dataset.loading="false";

    getElement("notificationCancelButton").style.display="flex";

    modalCallback=null;
    modalConfirmation=false;
}

function showSessionExpired(){
    sessionExpired=true;
    modalBusy=false;

    showNotification(
        "error",
        "Authentication Required",
        "Your session has expired. Please log in again.",
        "Continue",
        redirectToLogin
    );
}

function redirectToLogin(){
    window.location.href="../worker-authentication/index.html";
}

async function readResponse(response){
    const text=await response.text();

    if(!text)return{};

    try{
        return JSON.parse(text);
    }catch{
        throw new Error(
            "The server returned an invalid response. Please try again."
        );
    }
}