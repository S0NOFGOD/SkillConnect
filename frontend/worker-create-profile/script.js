document.addEventListener("DOMContentLoaded",()=>{

const profilePage=document.getElementById("profilePage");
const form=document.getElementById("workerProfileForm");
const fullNameInput=document.getElementById("fullName");
const phoneInput=document.getElementById("phone");
const profilePhotoInput=document.getElementById("profilePhoto");
const profilePhotoPlaceholder=document.getElementById("profilePhotoPlaceholder");
const profilePhotoImage=document.getElementById("profilePhotoImage");
const countryInput=document.getElementById("country");
const stateInput=document.getElementById("state");
const cityInput=document.getElementById("city");
const lgaInput=document.getElementById("lga");
const continueBtn=document.getElementById("continueBtn");
const buttonText=continueBtn.querySelector(".button-text");

const notificationOverlay=document.getElementById("notificationOverlay");
const notificationCard=document.getElementById("notificationCard");
const notificationIcon=document.getElementById("notificationIcon");
const notificationTitle=document.getElementById("notificationTitle");
const notificationText=document.getElementById("notificationText");
const notificationButton=document.getElementById("notificationButton");

const workerEmail=sessionStorage.getItem("workerEmail");

if(!workerEmail){
showModal(
"error",
"Authentication Required",
"Your worker session could not be found. Please sign in again.",
"Go to Login",
()=>{
window.location.href="../worker-authentication/index.html";
}
);
return;
}

profilePage.hidden=false;

/* PROFILE PHOTO SELECTION */
profilePhotoInput.addEventListener("change",async()=>{
const file=profilePhotoInput.files[0];
if(!file){
profilePhotoImage.hidden=true;
profilePhotoPlaceholder.hidden=false;
profilePhotoImage.removeAttribute("src");
updateProgress();
return;
}
if(!file.type||!file.type.startsWith("image/")){
profilePhotoInput.value="";
profilePhotoImage.hidden=true;
profilePhotoPlaceholder.hidden=false;
profilePhotoImage.removeAttribute("src");
showModal("error","Invalid Profile Photo","Please select an image file.");
updateProgress();
return;
}
const imageUrl=URL.createObjectURL(file);
profilePhotoImage.src=imageUrl;
profilePhotoImage.hidden=false;
profilePhotoPlaceholder.hidden=true;
profilePhotoImage.addEventListener("load",()=>URL.revokeObjectURL(imageUrl),{once:true});
updateProgress();
});

/* COUNTRY → STATE → CITY → LGA */
countryInput.addEventListener("change",()=>{
stateInput.innerHTML='<option value="">Select State</option>';
cityInput.innerHTML='<option value="">Select City</option>';
lgaInput.innerHTML='<option value="">Select LGA</option>';

stateInput.disabled=true;
cityInput.disabled=true;
lgaInput.disabled=true;

if(countryInput.value==="Nigeria"){
getNigeriaStates().forEach(state=>{
const option=document.createElement("option");
option.value=state;
option.textContent=state;
stateInput.appendChild(option);
});
stateInput.disabled=false;
}

updateProgress();
});

stateInput.addEventListener("change",()=>{
cityInput.innerHTML='<option value="">Select City</option>';
lgaInput.innerHTML='<option value="">Select LGA</option>';

cityInput.disabled=true;
lgaInput.disabled=true;

if(stateInput.value){
getCitiesByState(stateInput.value).forEach(city=>{
const option=document.createElement("option");
option.value=city;
option.textContent=city;
cityInput.appendChild(option);
});

getLGAsByState(stateInput.value).forEach(lga=>{
const option=document.createElement("option");
option.value=lga;
option.textContent=lga;
lgaInput.appendChild(option);
});

cityInput.disabled=false;
lgaInput.disabled=false;
}

updateProgress();
});

cityInput.addEventListener("change",updateProgress);
lgaInput.addEventListener("change",updateProgress);

/* FORM FIELD CHANGES */
[fullNameInput,phoneInput].forEach(element=>{
element.addEventListener("input",updateProgress);
element.addEventListener("change",updateProgress);
});

/* SUBMIT PROFILE */
form.addEventListener("submit",async event=>{
event.preventDefault();

const validation=validateForm();

if(!validation.valid){
showModal("error","Invalid Information",validation.message);
return;
}

const phone=phoneInput.value.trim();

setLoading(true);

try{
const formData=new FormData();

formData.append("email",workerEmail);
formData.append("fullName",fullNameInput.value.trim());
formData.append("phone",phone);
formData.append("country",countryInput.value);
formData.append("state",stateInput.value);
formData.append("city",cityInput.value);
formData.append("lga",lgaInput.value);
formData.append("profilePhoto",profilePhotoInput.files[0]);

const response=await API_REQUEST("/api/worker/create-profile",{
method:"POST",
body:formData
});

let data={};
try{data=await response.json();}catch{data={};}

if(!response.ok){
showModal(
"error",
"Profile Update Failed",
data.message||"Unable to complete your profile. Please try again."
);
return;
}

sessionStorage.removeItem("workerEmail");

showModal(
"success",
"Profile Completed",
data.message||"Your worker profile has been completed successfully.",
"Continue",
()=>{
window.location.href="../worker-dashboard/index.html";
}
);

}catch(error){
console.error("Worker profile request failed:",error);

showModal(
"error",
"Connection Error",
error.message||"Unable to connect to the server. Please try again."
);
}finally{
setLoading(false);
}
});

/* NOTIFICATION BUTTON */
notificationButton.addEventListener("click",()=>closeModal());

updateProgress();

/* NORMALIZE NIGERIAN PHONE NUMBER */
function normalizePhone(value){
let phone=value.trim().replace(/\s+/g,"").replace(/-/g,"").replace(/\(/g,"").replace(/\)/g,"");

if(/^0[789]\d{9}$/.test(phone)){
phone="+234"+phone.substring(1);
}
else if(/^234[789]\d{9}$/.test(phone)){
phone="+"+phone;
}

return phone;
}

/* VALIDATE FORM */
function validateForm(){
const fullName=fullNameInput.value.trim();
const phone=phoneInput.value.trim();
const profilePhoto=profilePhotoInput.files[0];
const country=countryInput.value;
const state=stateInput.value;
const city=cityInput.value;
const lga=lgaInput.value;

if(!profilePhoto){
return{valid:false,message:"Please select a profile photo."};
}

if(!profilePhoto.type||!profilePhoto.type.startsWith("image/")){
return{valid:false,message:"Please select an image file."};
}

const nameParts=fullName.replace(/\s+/g," ").split(" ");
const namePattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

if(
nameParts.length!==2||
!namePattern.test(nameParts[0])||
!namePattern.test(nameParts[1])
){
return{
valid:false,
message:"Please enter exactly two names with a space between them, for example: Destiny Okpone."
};
}

const phoneForValidation=phone.replace(/\s+/g,"").replace(/-/g,"").replace(/\(/g,"").replace(/\)/g,"");

if(
!/^0[789]\d{9}$/.test(phoneForValidation)&&
!/^234[789]\d{9}$/.test(phoneForValidation)&&
!(/^\+234[789]\d{9}$/.test(phoneForValidation))
){
return{
valid:false,
message:"Please enter a valid Nigerian phone number."
};
}

if(!country){
return{valid:false,message:"Please select your country."};
}

if(!state){
return{valid:false,message:"Please select your state."};
}

if(!city){
return{valid:false,message:"Please select your city."};
}

if(!lga){
return{valid:false,message:"Please select your LGA."};
}

return{valid:true,message:""};
}

/* UPDATE PROFILE PROGRESS */
function updateProgress(){
const fields=[
profilePhotoInput.files.length>0,
fullNameInput.value.trim(),
phoneInput.value.trim(),
countryInput.value,
stateInput.value,
cityInput.value,
lgaInput.value
];

const completed=fields.filter(Boolean).length;
const percentage=Math.round((completed/fields.length)*100);

const progressFill=document.getElementById("progressFill");
const progressPercentage=document.getElementById("progressPercentage");

if(progressFill){
progressFill.style.width=`${percentage}%`;
}

if(progressPercentage){
progressPercentage.textContent=`${percentage}%`;
}
}

/* BUTTON LOADING STATE */
function setLoading(isLoading){
continueBtn.disabled=isLoading;
continueBtn.classList.toggle("loading",isLoading);

if(buttonText){
buttonText.textContent=isLoading?"Connecting...":"Continue";
}
}

/* SHOW NOTIFICATION MODAL */
function showModal(type,title,message,buttonLabel="Continue",onClose=null){
notificationCard.className=`notification-card ${type}`;
notificationIcon.textContent=type==="success"?"✓":type==="error"?"!":"i";
notificationTitle.textContent=title;
notificationText.textContent=message;
notificationButton.textContent=buttonLabel;

notificationButton.onclick=()=>{
closeModal();
if(onClose)onClose();
};

notificationOverlay.hidden=false;
document.body.classList.add("modal-open");
}

/* CLOSE NOTIFICATION MODAL */
function closeModal(){
notificationOverlay.hidden=true;
document.body.classList.remove("modal-open");
}

});