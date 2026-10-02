document.addEventListener("DOMContentLoaded",()=>{

const menuBtn=document.getElementById("menuBtn");
const closeMenuBtn=document.getElementById("closeMenuBtn");
const sidebar=document.getElementById("sidebar");
const overlay=document.getElementById("overlay");
const dashboardBtn=document.getElementById("dashboardBtn");
const findWorkersBtn=document.getElementById("findWorkersBtn");
const editProfileBtn=document.getElementById("editProfileBtn");
const logoutBtn=document.getElementById("logoutBtn");
const changeLocationBtn=document.getElementById("changeLocationBtn");
const skillFilter=document.getElementById("skillFilter");
const workersContainer=document.getElementById("workersContainer");
const workersLoading=document.getElementById("workersLoading");
const workersEmpty=document.getElementById("workersEmpty");
const notificationOverlay=document.getElementById("notificationOverlay");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationButton=document.getElementById("notificationButton");
const notificationCancelButtonMobile=document.getElementById("notificationCancelButtonMobile");

let workers=[];
let notificationAction=null;

const closeSidebar=()=>{
sidebar.classList.remove("open");
overlay.classList.remove("active");
menuBtn.setAttribute("aria-expanded","false");
};

const openSidebar=()=>{
sidebar.classList.add("open");
overlay.classList.add("active");
menuBtn.setAttribute("aria-expanded","true");
};

menuBtn.addEventListener("click",()=>sidebar.classList.contains("open")?closeSidebar():openSidebar());
closeMenuBtn.addEventListener("click",closeSidebar);
overlay.addEventListener("click",closeSidebar);

dashboardBtn.addEventListener("click",()=>location.href="../client-dashboard/index.html");
findWorkersBtn.addEventListener("click",()=>location.href="../client-worker-search/index.html");
editProfileBtn.addEventListener("click",()=>location.href="../client-edit-profile/index.html");
changeLocationBtn.addEventListener("click",()=>location.href="../client-edit-profile/index.html");

const showNotification=(title,message,type="info",action=null)=>{
notificationTitle.textContent=title;
notificationText.textContent=message;
notificationIcon.textContent=type==="error"?"!":type==="success"?"✓":"i";
notificationAction=action;
notificationButton.textContent="Continue";
notificationOverlay.hidden=false;
};

const closeNotification=()=>{
notificationOverlay.hidden=true;
const action=notificationAction;
notificationAction=null;
if(action)action();
};

window.addEventListener("authSessionExpired",()=>{
showNotification(
"Authentication Required",
"Your session has expired. Please log in again.",
"error",
()=>location.href="../client-authentication/index.html"
);
});

const renderWorkers=(list)=>{

workersContainer.innerHTML="";

list=list.filter(worker=>{
return Array.isArray(worker.services)&&
worker.services.some(service=>service.skill&&String(service.skill).trim());
});

if(!list.length){
workersContainer.hidden=true;
workersEmpty.hidden=false;
return;
}

workersEmpty.hidden=true;
workersContainer.hidden=false;

const selectedSkill=skillFilter.value.toLowerCase();

list.forEach(worker=>{

const matchingService=selectedSkill
?worker.services.find(service=>
service.skill&&
String(service.skill).toLowerCase()===selectedSkill
)
:worker.services.find(service=>
service.skill&&
String(service.skill).trim()
);

if(!matchingService)return;

const name=worker.fullName||"Worker";

const initials=name
.split(" ")
.map(x=>x[0])
.join("")
.slice(0,2)
.toUpperCase();

const skill=matchingService.skill;

const serviceId=matchingService.serviceId;

const location=[
worker.lga,
worker.city
].filter(Boolean).join(", ")||"Location unavailable";

const isVerified=
worker.phoneVerificationExpires&&
new Date(worker.phoneVerificationExpires)>new Date();

const card=document.createElement("div");
card.className="worker-card";

card.addEventListener("click",()=>{

sessionStorage.setItem(
"workerId",
worker.workerId
);

sessionStorage.setItem(
"serviceId",
serviceId
);

window.location.href="../client-worker-details/index.html";

});

const info=document.createElement("div");
info.className="worker-info";

const workerName=document.createElement("div");
workerName.className="worker-name";
workerName.textContent=name;

const details=document.createElement("div");
details.className="worker-details";

const skillElement=document.createElement("span");
skillElement.className="worker-skill";
skillElement.textContent=skill;

const divider=document.createElement("span");
divider.className="worker-divider";
divider.textContent="|";

details.append(
skillElement
);

if(isVerified){

const verifiedElement=document.createElement("span");
verifiedElement.className="worker-skill";
verifiedElement.textContent="Verified";

details.append(
divider,
verifiedElement
);

const locationDivider=document.createElement("span");
locationDivider.className="worker-divider";
locationDivider.textContent="|";

details.append(locationDivider);

}else{

details.append(divider);

}

const locationElement=document.createElement("span");
locationElement.className="worker-location";
locationElement.textContent=location;

details.append(locationElement);

info.append(
workerName,
details
);

if(worker.profilePhoto){

const photo=document.createElement("img");

photo.className="worker-photo";
photo.src=worker.profilePhoto;
photo.alt=name;

photo.onerror=()=>{
photo.remove();

const placeholder=document.createElement("div");
placeholder.className="worker-photo-placeholder";
placeholder.textContent=initials;

card.appendChild(placeholder);
};

card.appendChild(info);
card.appendChild(photo);

}else{

const placeholder=document.createElement("div");

placeholder.className="worker-photo-placeholder";
placeholder.textContent=initials;

card.appendChild(info);
card.appendChild(placeholder);

}

workersContainer.appendChild(card);

});

if(!workersContainer.children.length){
workersContainer.hidden=true;
workersEmpty.hidden=false;
}

};

const loadSkills=()=>{

const skills=[
...new Set(
workers.flatMap(worker=>{

if(Array.isArray(worker.services)){
return worker.services
.map(service=>service.skill)
.filter(Boolean);
}

return worker.skill?[worker.skill]:[];

})
)
].sort();

skillFilter.innerHTML='<option value="">All Skills</option>';

skills.forEach(skill=>{

const option=document.createElement("option");

option.value=skill;
option.textContent=skill;

skillFilter.appendChild(option);

});

};

skillFilter.addEventListener("change",()=>{

const selected=skillFilter.value.toLowerCase();

if(!selected){
renderWorkers(workers);
return;
}

renderWorkers(
workers.filter(worker=>{

const skills=Array.isArray(worker.services)
?worker.services
.map(service=>service.skill)
.filter(Boolean)
:worker.skill
?[worker.skill]
:[];

return skills.some(
skill=>String(skill).toLowerCase()===selected
);

})
);

});

const loadWorkers=async()=>{

workersLoading.hidden=false;
workersContainer.hidden=true;
workersEmpty.hidden=true;

try{

const response=await API_REQUEST(
"/api/client/worker-search",
{method:"GET"}
);

workersLoading.hidden=true;

if(!response.ok){

let message="Unable to find workers. Please try again.";

try{

const data=await response.json();

message=data.message||message;

}catch{}

showNotification(
"Search Error",
message,
"error"
);

return;

}

const data=await response.json();

workers=data.workers||[];

loadSkills();

renderWorkers(workers);

}catch(error){

console.error("Worker search error:",error);

workersLoading.hidden=true;

showNotification(
"Connection Error",
"Unable to connect to the server. Please try again.",
"error"
);

}

};

logoutBtn.addEventListener("click",()=>{

closeSidebar();

notificationButton.onclick=null;
notificationCancelButtonMobile.onclick=null;

showNotification(
"Logout",
"Are you sure you want to logout?",
"info"
);

notificationButton.textContent="Yes";
notificationCancelButtonMobile.textContent="No";

notificationButton.disabled=false;
notificationCancelButtonMobile.disabled=false;

notificationAction=null;

notificationButton.onclick=async()=>{

notificationButton.disabled=true;
notificationCancelButtonMobile.disabled=true;

notificationButton.textContent="Logging out…";

try{

const response=await API_REQUEST(
"/api/auth/logout",
{method:"POST"}
);

if(response.ok){

notificationOverlay.hidden=true;

location.href="../client-authentication/index.html";

return;

}

let message="Logout failed. Please try again.";

try{

const data=await response.json();

message=data.message||message;

}catch{}

notificationButton.disabled=false;
notificationCancelButtonMobile.disabled=false;

notificationButton.textContent="Yes";
notificationCancelButtonMobile.textContent="No";

showNotification(
"Logout Error",
message,
"error"
);

}catch{

notificationButton.disabled=false;
notificationCancelButtonMobile.disabled=false;

notificationButton.textContent="Yes";
notificationCancelButtonMobile.textContent="No";

showNotification(
"Connection Error",
"Unable to connect to the server. Please try again.",
"error"
);

}

};

notificationCancelButtonMobile.onclick=()=>{

notificationOverlay.hidden=true;

notificationButton.disabled=false;
notificationCancelButtonMobile.disabled=false;

notificationButton.textContent="Continue";
notificationCancelButtonMobile.textContent="No";

notificationAction=null;

};

});

loadWorkers();

});