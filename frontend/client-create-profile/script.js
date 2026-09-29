document.addEventListener("DOMContentLoaded",()=>{

const profilePage=document.getElementById("profilePage");
const form=document.getElementById("clientProfileForm");
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

const MAX_IMAGE_DIMENSION=1920;
const MAX_COMPRESSED_IMAGE_SIZE=5*1024*1024;
const clientEmail=sessionStorage.getItem("clientEmail");

if(!clientEmail){

showModal(
"error",
"Authentication Required",
"Your client session could not be found. Please sign in again.",
"Go to Login",
()=>window.location.href="../client-authentication/index.html"
);

return;

}

profilePage.hidden=false;


/* PROFILE PHOTO */

profilePhotoInput.addEventListener("change",()=>{

const file=profilePhotoInput.files[0];

if(!file){

profilePhotoImage.hidden=true;
profilePhotoPlaceholder.hidden=false;
profilePhotoImage.removeAttribute("src");
updateProgress();
return;

}

if(!["image/jpeg","image/png","image/webp"].includes(file.type)){

profilePhotoInput.value="";
profilePhotoImage.hidden=true;
profilePhotoPlaceholder.hidden=false;
profilePhotoImage.removeAttribute("src");

showModal(
"error",
"Invalid Profile Photo",
"Please select a JPG, PNG, or WebP image."
);

updateProgress();
return;

}

const imageUrl=URL.createObjectURL(file);

profilePhotoImage.src=imageUrl;
profilePhotoImage.hidden=false;
profilePhotoPlaceholder.hidden=true;

profilePhotoImage.addEventListener(
"load",
()=>URL.revokeObjectURL(imageUrl),
{once:true}
);

updateProgress();

});


/* LOCATION */

function resetLocationFields(){

stateInput.innerHTML='<option value="">Select State</option>';
cityInput.innerHTML='<option value="">Select City</option>';
lgaInput.innerHTML='<option value="">Select LGA</option>';

stateInput.disabled=true;
cityInput.disabled=true;
lgaInput.disabled=true;

}

function populateStates(){

stateInput.innerHTML='<option value="">Select State</option>';
cityInput.innerHTML='<option value="">Select City</option>';
lgaInput.innerHTML='<option value="">Select LGA</option>';

cityInput.disabled=true;
lgaInput.disabled=true;

if(countryInput.value!=="Nigeria"){

stateInput.disabled=true;
return;

}

getNigeriaStates().forEach(state=>{

const option=document.createElement("option");

option.value=state;
option.textContent=state;

stateInput.appendChild(option);

});

stateInput.disabled=false;

}

function populateStateLocations(){

cityInput.innerHTML='<option value="">Select City</option>';
lgaInput.innerHTML='<option value="">Select LGA</option>';

cityInput.disabled=true;
lgaInput.disabled=true;

if(!stateInput.value)return;

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

countryInput.addEventListener("change",()=>{

populateStates();
updateProgress();

});

stateInput.addEventListener("change",()=>{

populateStateLocations();
updateProgress();

});


/* FIELD CHANGES */

[
fullNameInput,
phoneInput,
countryInput,
stateInput,
cityInput,
lgaInput
].forEach(element=>{

element.addEventListener("input",updateProgress);
element.addEventListener("change",updateProgress);

});


/* SUBMIT */

form.addEventListener("submit",async event=>{

event.preventDefault();

const validation=validateForm();

if(!validation.valid){

showModal(
"error",
"Invalid Information",
validation.message
);

return;

}

setLoading(true);

try{

const compressedPhoto=await compressImage(
profilePhotoInput.files[0]
);

const normalizedFullName=
normalizeFullName(fullNameInput.value);

const phone=
normalizePhone(phoneInput.value);

fullNameInput.value=normalizedFullName;
phoneInput.value=phone;

const formData=new FormData();

formData.append("email",clientEmail);
formData.append("fullName",normalizedFullName);
formData.append("phone",phone);
formData.append("country",countryInput.value);
formData.append("state",stateInput.value);
formData.append("city",cityInput.value);
formData.append("lga",lgaInput.value);
formData.append("profilePhoto",compressedPhoto);

const response=await API_REQUEST(
"/api/client-create-profile",
{
method:"POST",
body:formData
}
);

let data={};

try{
data=await response.json();
}catch{
data={};
}

if(!response.ok){

showModal(
"error",
"Profile Update Failed",
data.message||
"Unable to complete your profile. Please try again."
);

return;

}

sessionStorage.removeItem("clientEmail");

showModal(
"success",
"Profile Completed",
data.message||
"Your client profile has been completed successfully.",
"Continue",
()=>window.location.href="../client-dashboard/index.html"
);

}catch(error){

console.error(
"Client profile request failed:",
error
);

showModal(
"error",
"Connection Error",
error.message||
"Unable to connect to the server. Please try again."
);

}finally{

setLoading(false);

}

});


/* MODAL */

notificationButton.addEventListener(
"click",
()=>closeModal()
);

populateStates();
updateProgress();


/* PHONE NORMALIZATION */

function normalizePhone(value){

let phone=value
.trim()
.replace(/\s+/g,"")
.replace(/-/g,"")
.replace(/\(/g,"")
.replace(/\)/g,"");

if(/^0[789]\d{9}$/.test(phone)){
phone="+234"+phone.substring(1);
}else if(/^234[789]\d{9}$/.test(phone)){
phone="+"+phone;
}

return phone;

}


/* NAME NORMALIZATION */

function normalizeNamePart(name){

return name
.toLowerCase()
.split(/([-'])/)
.map(part=>{

if(part==="-"||part==="'")return part;

return part.charAt(0).toUpperCase()+part.slice(1);

})
.join("");

}

function normalizeFullName(value){

const fullName=String(value||"")
.trim()
.replace(/\s+/g," ");

const nameParts=fullName.split(" ");

if(nameParts.length!==2)return null;

const namePattern=
/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

if(
!namePattern.test(nameParts[0])||
!namePattern.test(nameParts[1])
)return null;

return nameParts
.map(normalizeNamePart)
.join(" ");

}


/* IMAGE CONVERSION + COMPRESSION */

function compressImage(file){

return new Promise((resolve,reject)=>{

const image=new Image();
const objectUrl=URL.createObjectURL(file);

image.onload=()=>{

URL.revokeObjectURL(objectUrl);

let width=image.width;
let height=image.height;

if(
width>MAX_IMAGE_DIMENSION||
height>MAX_IMAGE_DIMENSION
){

if(width>height){

height=Math.round(
height*(MAX_IMAGE_DIMENSION/width)
);

width=MAX_IMAGE_DIMENSION;

}else{

width=Math.round(
width*(MAX_IMAGE_DIMENSION/height)
);

height=MAX_IMAGE_DIMENSION;

}

}

const canvas=document.createElement("canvas");

canvas.width=width;
canvas.height=height;

const context=canvas.getContext("2d");

if(!context){

reject(
new Error(
"The selected image could not be processed."
)
);

return;

}

context.drawImage(
image,
0,
0,
width,
height
);

let quality=0.8;

const compress=()=>{

canvas.toBlob(blob=>{

if(!blob){

reject(
new Error(
"The selected image could not be compressed."
)
);

return;

}

if(blob.size<=MAX_COMPRESSED_IMAGE_SIZE){

resolve(
new File(
[blob],
`${file.name.replace(/\.[^/.]+$/,"")}.jpg`,
{type:"image/jpeg"}
)
);

return;

}

if(quality>0.1){

quality=Math.max(0.1,quality-0.1);

compress();

return;

}

width=Math.floor(width*0.85);
height=Math.floor(height*0.85);

if(width<320||height<320){

reject(
new Error(
"The selected image could not be compressed below 5 MB."
)
);

return;

}

canvas.width=width;
canvas.height=height;

context.drawImage(
image,
0,
0,
width,
height
);

quality=0.8;

compress();

},"image/jpeg",quality);

};

compress();

};

image.onerror=()=>{

URL.revokeObjectURL(objectUrl);

reject(
new Error(
"The selected image could not be processed."
)
);

};

image.src=objectUrl;

});

}


/* VALIDATION */

function validateForm(){

const fullName=fullNameInput.value.trim();
const phone=normalizePhone(phoneInput.value);
const profilePhoto=profilePhotoInput.files[0];
const country=countryInput.value;
const state=stateInput.value;
const city=cityInput.value;
const lga=lgaInput.value;

if(!profilePhoto){

return{
valid:false,
message:"Please select a profile photo."
};

}

if(!["image/jpeg","image/png","image/webp"].includes(profilePhoto.type)){

return{
valid:false,
message:"Please select a JPG, PNG, or WebP image."
};

}

const normalizedFullName=
normalizeFullName(fullName);

if(!normalizedFullName){

return{
valid:false,
message:
"Please enter exactly two names with a space between them, for example: Destiny Okpone."
};

}

if(!/^\+234[789]\d{9}$/.test(phone)){

return{
valid:false,
message:
"Please enter a valid Nigerian phone number."
};

}

if(!country){

return{
valid:false,
message:"Please select your country."
};

}

if(!state){

return{
valid:false,
message:"Please select your state."
};

}

if(!city){

return{
valid:false,
message:"Please select your city."
};

}

if(!lga){

return{
valid:false,
message:"Please select your LGA."
};

}

return{
valid:true,
message:""
};

}


/* PROGRESS */

function updateProgress(){

const fields=[
profilePhotoInput.files.length>0,
fullNameInput.value.trim(),
normalizePhone(phoneInput.value),
countryInput.value,
stateInput.value,
cityInput.value,
lgaInput.value
];

const completed=fields.filter(Boolean).length;
const percentage=Math.round(
(completed/fields.length)*100
);

const progressFill=
document.getElementById("progressFill");

const progressPercentage=
document.getElementById("progressPercentage");

if(progressFill)
progressFill.style.width=`${percentage}%`;

if(progressPercentage)
progressPercentage.textContent=`${percentage}%`;

}


/* LOADING */

function setLoading(isLoading){

continueBtn.disabled=isLoading;

continueBtn.classList.toggle(
"loading",
isLoading
);

if(buttonText){

buttonText.textContent=
isLoading
?"Saving Profile..."
:"Complete Profile";

}

}


/* SHOW MODAL */

function showModal(
type,
title,
message,
buttonLabel="Close",
onClose=null
){

notificationCard.className=
`notification-card ${type}`;

notificationIcon.textContent=
type==="success"
?"✓"
:type==="error"
?"!"
:"i";

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


/* CLOSE MODAL */

function closeModal(){

notificationOverlay.hidden=true;

document.body.classList.remove(
"modal-open"
);

}

});