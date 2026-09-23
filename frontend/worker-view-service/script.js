/* =========================================================
   WORKER VIEW SERVICE
   Loads, updates and deletes the selected worker service.
========================================================= */

document.addEventListener("DOMContentLoaded",()=>{initializePage();initializeBackNavigation();initializePortfolioInputs();initializeDescriptionCounter();initializeForm();initializeModal();});

const getElement=id=>document.getElementById(id);
const VIEW_SERVICE_ENDPOINT="/api/worker/view-service";
const UPDATE_SERVICE_ENDPOINT="/api/worker/view-service";
const DELETE_SERVICE_ENDPOINT="/api/worker/view-service";

/* =========================================================
   LOCAL SKILLS
========================================================= */
const LOCAL_SKILLS=[
"Swimming Instructor","Barber","Hairdresser","Makeup Artist","Tailor","Fashion Designer",
"Plumber","Electrician","Painter","Welder","Carpenter","Bricklayer","Cleaner",
"Laundry Service","Mechanic","Auto Electrician","Phone Repair","Computer Repair",
"Graphic Designer","Web Developer","Photographer","Videographer","Caterer","Baker",
"Cook","Event Planner","Interior Decorator","AC Technician","Generator Repair",
"POP Installer","Tiler","Furniture Maker","Driver","Tutor","Fitness Trainer","Other"
];

/* =========================================================
   INITIALIZE PAGE
========================================================= */
async function initializePage(){
const accessToken=getAccessToken(),serviceId=sessionStorage.getItem("serviceId");
if(!accessToken){showNotification("error","Authentication Required","Your login session could not be found. Please log in again.","Go to Login",()=>{window.location.href="../worker-authentication/index.html";});return;}
if(!serviceId){showNotification("error","Service Not Found","The service ID could not be found. Please return to your services.","Go Back",()=>{window.location.href="../worker-services/index.html";});return;}
populateSkills();
setPageLoading(true,"Loading Service","Please wait while we load your service.");
try{
const response=await API_REQUEST(`${VIEW_SERVICE_ENDPOINT}/${encodeURIComponent(serviceId)}`,{method:"GET"}),data=await response.json();
if(!response.ok)throw new Error(data.message||"Unable to load this service.");
displayService(data.service||data);
getElement("viewServicePage").style.display="block";
}catch(error){showNotification("error","Unable To Load Service",error.message||"Something went wrong while loading your service.","Close");}
finally{setPageLoading(false);}
}

/* =========================================================
   POPULATE LOCAL SKILLS DROPDOWN
========================================================= */
function populateSkills(){
const skill=getElement("skill");
if(!skill)return;
LOCAL_SKILLS.forEach(item=>{
const option=document.createElement("option");
option.value=item;
option.textContent=item;
skill.appendChild(option);
});
}

/* =========================================================
   PAGE LOADING
========================================================= */
function setPageLoading(isLoading,title="Loading Service",message="Please wait..."){
const page=getElement("viewServicePage");
if(isLoading){page.style.display="none";showLoadingModal(title,message);}
else hideLoadingModal();
}

/* =========================================================
   LOADING MODAL
========================================================= */
function showLoadingModal(title="Loading Service",message="Please wait..."){
const overlay=getElement("notificationOverlay"),card=getElement("notificationCard"),icon=getElement("notificationIcon"),titleElement=getElement("notificationTitle"),text=getElement("notificationText"),button=getElement("notificationButton"),close=getElement("notificationCancelButton");
overlay.classList.add("active");close.style.display="none";button.style.display="none";
icon.innerHTML=`<span style="display:block;width:22px;height:22px;border:2px solid rgba(34,197,94,.3);border-top-color:#22c55e;border-radius:50%;animation:viewServiceSpin .7s linear infinite;"></span>`;
titleElement.textContent=title;text.textContent=message;card.dataset.loading="true";
if(!document.getElementById("viewServiceSpinnerStyle")){const style=document.createElement("style");style.id="viewServiceSpinnerStyle";style.textContent=`@keyframes viewServiceSpin{to{transform:rotate(360deg);}}`;document.head.appendChild(style);}
}

function hideLoadingModal(){
const card=getElement("notificationCard");
if(card.dataset.loading==="true"){getElement("notificationOverlay").classList.remove("active");card.dataset.loading="false";}
}

/* =========================================================
   BACK NAVIGATION
========================================================= */
function initializeBackNavigation(){
const backButton=getElement("backNavigation");
if(!backButton)return;
backButton.addEventListener("click",()=>{sessionStorage.removeItem("serviceId");window.location.href="../worker-services/index.html";});
}

/* =========================================================
   DISPLAY SERVICE DATA
========================================================= */
function displayService(service){
const skill=getElement("skill"),experience=getElement("experience"),description=getElement("description");
if(!service)return;
if(service.skill){
const skillExists=[...skill.options].some(option=>option.value===service.skill);
if(!skillExists){const option=document.createElement("option");option.value=service.skill;option.textContent=service.skill;skill.appendChild(option);}
skill.value=service.skill;
}
if(service.experience)experience.value=service.experience;
if(service.description)description.value=service.description;else description.value="";
updateDescriptionWordCount();displayPortfolios(service.portfolios);
}

/* =========================================================
   DISPLAY PORTFOLIOS
========================================================= */
function displayPortfolios(portfolios=[]){
if(!Array.isArray(portfolios))return;
portfolios.slice(0,3).forEach((portfolio,index)=>{
const number=index+1,preview=getElement(`portfolioPreview${number}`);
if(!preview)return;
const imageUrl=typeof portfolio==="string"?portfolio:(portfolio.url||portfolio.secure_url||portfolio.imageUrl||"");
if(!imageUrl)return;
preview.innerHTML=`<img src="${escapeHtml(imageUrl)}" alt="Portfolio ${number}">`;
});
}

function escapeHtml(value){
const div=document.createElement("div");div.textContent=value;return div.innerHTML;
}

/* =========================================================
   PORTFOLIO INPUTS
========================================================= */
function initializePortfolioInputs(){
for(let i=1;i<=3;i++){
const input=getElement(`portfolioPhoto${i}`),preview=getElement(`portfolioPreview${i}`);
if(!input||!preview)continue;

preview.addEventListener("click",()=>{input.click();});

input.addEventListener("change",()=>{
const file=input.files[0];
if(!file)return;

const typeResult=validateImageType(file);

if(!typeResult.valid){
input.value="";
showNotification("error","Invalid Image",typeResult.message,"Close");
return;
}

const sizeResult=validateImageSize(file);

if(!sizeResult.valid){
input.value="";
showNotification("error","Image Too Large",sizeResult.message,"Close");
return;
}

const reader=new FileReader();

reader.onload=event=>{
preview.innerHTML=`<img src="${event.target.result}" alt="Portfolio ${i}">`;
};

reader.readAsDataURL(file);
});
}
}

function validateImageType(file){
if(!file)return{valid:true};

if(!file.type||!file.type.startsWith("image/")){
return{
valid:false,
message:`"${file.name}" is not a supported image file.`
};
}

return{valid:true};
}

function validateImageSize(file){
const maxSize=5*1024*1024;

if(file.size>maxSize){
return{
valid:false,
message:`"${file.name}" is larger than 5MB. Please choose an image that is 5MB or smaller.`
};
}

return{valid:true};
}

/* =========================================================
   DESCRIPTION WORD COUNTER
========================================================= */
function initializeDescriptionCounter(){
const description=getElement("description");if(!description)return;
description.addEventListener("input",updateDescriptionWordCount);updateDescriptionWordCount();
}

function updateDescriptionWordCount(){
const description=getElement("description"),counter=getElement("descriptionWordCount");if(!description||!counter)return;
const words=description.value.trim().split(/\s+/).filter(Boolean),count=description.value.trim()?words.length:0;
counter.textContent=`${count}/150 words`;
}

/* =========================================================
   FORM
========================================================= */
function initializeForm(){
const form=getElement("serviceForm");if(!form)return;
form.addEventListener("submit",async event=>{event.preventDefault();await updateService();});
getElement("deleteServiceBtn")?.addEventListener("click",deleteService);
}

/* =========================================================
   VALIDATE SERVICE
========================================================= */
function validateService(){
const skill=getElement("skill").value.trim(),experience=getElement("experience").value.trim(),description=getElement("description").value.trim();
if(!skill){showNotification("error","Skill Required","Please select your skill.","Close");return false;}
if(!experience){showNotification("error","Experience Required","Please select your experience level.","Close");return false;}
if(!description){showNotification("error","Description Required","Please describe the service you provide.","Close");return false;}
const words=description.split(/\s+/).filter(Boolean);
if(words.length>150){showNotification("error","Description Too Long","Your service description must not be more than 150 words.","Close");return false;}
for(let i=1;i<=3;i++){
const input=getElement(`portfolioPhoto${i}`),file=input?.files[0];

if(file){
const typeResult=validateImageType(file);
if(!typeResult.valid){
showNotification("error","Invalid Image",typeResult.message,"Close");
return false;
}

const sizeResult=validateImageSize(file);
if(!sizeResult.valid){
showNotification("error","Image Too Large",sizeResult.message,"Close");
return false;
}
}
}
return true;
}

/* =========================================================
   UPDATE SERVICE
========================================================= */
async function updateService(){
if(!validateService())return;
const serviceId=sessionStorage.getItem("serviceId"),accessToken=getAccessToken();
if(!accessToken){showNotification("error","Authentication Required","Your login session has expired. Please log in again.","Go to Login",()=>{window.location.href="../worker-authentication/index.html";});return;}
if(!serviceId){showNotification("error","Service Not Found","The service ID could not be found.","Go Back",()=>{window.location.href="../worker-services/index.html";});return;}

showLoadingModal("Updating Service","Please wait while your service is being updated.");

try{
const formData=new FormData();
formData.append("skill",getElement("skill").value.trim());
formData.append("experience",getElement("experience").value.trim());
formData.append("description",getElement("description").value.trim());
for(let i=1;i<=3;i++){const input=getElement(`portfolioPhoto${i}`),file=input?.files[0];if(file)formData.append(`portfolioPhoto${i}`,file);}
const response=await API_REQUEST(`${UPDATE_SERVICE_ENDPOINT}/${encodeURIComponent(serviceId)}`,{method:"PUT",body:formData}),data=await response.json();
if(!response.ok)throw new Error(data.message||"Unable to update the service.");
hideLoadingModal();
showNotification("success","Service Updated",data.message||"Your service has been updated successfully.","Close");
}catch(error){
hideLoadingModal();
showNotification("error","Update Failed",error.message||"Something went wrong while updating your service.","Close");
}
}

/* =========================================================
   DELETE SERVICE
========================================================= */
async function deleteService(){
const serviceId=sessionStorage.getItem("serviceId"),accessToken=getAccessToken();
if(!accessToken){showNotification("error","Authentication Required","Your login session has expired. Please log in again.","Go to Login",()=>{window.location.href="../worker-authentication/index.html";});return;}
if(!serviceId){showNotification("error","Service Not Found","The service ID could not be found.","Go Back",()=>{window.location.href="../worker-services/index.html";});return;}

showNotification("warning","Delete Service?","This service and its portfolio images will be permanently deleted.","Delete",async()=>{
showLoadingModal("Deleting Service","Please wait while your service is being deleted.");
try{
const response=await API_REQUEST(`${DELETE_SERVICE_ENDPOINT}/${encodeURIComponent(serviceId)}`,{method:"DELETE"}),data=await response.json();
if(!response.ok)throw new Error(data.message||"Unable to delete the service.");
hideLoadingModal();
showNotification("success","Service Deleted",data.message||"Your service has been deleted successfully.","Continue",()=>{sessionStorage.removeItem("serviceId");window.location.href="../worker-services/index.html";});
}catch(error){
hideLoadingModal();
showNotification("error","Delete Failed",error.message||"Something went wrong while deleting your service.","Close");
}
});
}

/* =========================================================
   MODAL
========================================================= */
function initializeModal(){
const overlay=getElement("notificationOverlay"),closeButton=getElement("notificationCancelButton");
if(!overlay||!closeButton)return;
closeButton.addEventListener("click",()=>{if(getElement("notificationCard").dataset.loading==="true")return;closeNotification();});
}

function showNotification(type,title,message,buttonText="Close",callback=null){
const overlay=getElement("notificationOverlay"),card=getElement("notificationCard"),icon=getElement("notificationIcon"),titleElement=getElement("notificationTitle"),textElement=getElement("notificationText"),button=getElement("notificationButton"),closeButton=getElement("notificationCancelButton");
button.onclick=null;overlay.classList.add("active");card.dataset.loading="false";closeButton.style.display="flex";button.style.display="block";titleElement.textContent=title;textElement.textContent=message;button.textContent=buttonText;
if(type==="success"){icon.textContent="✓";icon.style.color="#22c55e";icon.style.background="rgba(34,197,94,.1)";}
else if(type==="warning"){icon.textContent="!";icon.style.color="#f59e0b";icon.style.background="rgba(245,158,11,.1)";}
else{icon.textContent="!";icon.style.color="#ef4444";icon.style.background="rgba(239,68,68,.1)";}
button.onclick=()=>{closeNotification();if(typeof callback==="function")callback();};
}

function closeNotification(){
const overlay=getElement("notificationOverlay"),card=getElement("notificationCard");
if(card.dataset.loading==="true")return;
overlay.classList.remove("active");card.dataset.loading="false";
}