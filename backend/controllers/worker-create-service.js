/* =========================================================
   WORKER CREATE SERVICE CONTROLLER
========================================================= */

/* 1. IMPORTS */
const{Readable}=require("stream");
const jwt=require("jsonwebtoken");
const Worker=require("../models/worker");
const cloudinary=require("../config/cloudinary");

/* 2. CONSTANTS */
const MAX_PORTFOLIO_IMAGE_SIZE=5*1024*1024;
const MAX_PORTFOLIO_IMAGES=3;
const MAX_DESCRIPTION_WORDS=300;

/* 3. LOCAL SKILLS */
const LOCAL_SKILLS=[
"Swimming Instructor","Barber","Hairdresser","Makeup Artist","Tailor",
"Fashion Designer","Plumber","Electrician","Painter","Welder","Carpenter",
"Bricklayer","Cleaner","Laundry Service","Mechanic","Auto Electrician",
"Phone Repair","Computer Repair","Graphic Designer","Web Developer",
"Photographer","Videographer","Caterer","Baker","Cook","Event Planner",
"Interior Decorator","AC Technician","Generator Repair","POP Installer",
"Tiler","Furniture Maker","Driver","Tutor","Fitness Trainer","Other"
];

/* 4. EXPERIENCE OPTIONS */
const EXPERIENCE_OPTIONS=[
"Less than 1 year","1 year","2 years","3 years","4 years","5 years+"
];

/* 5. WORD COUNTER */
function countWords(text){
if(!text||!text.trim())return 0;
return text.trim().split(/\s+/).length;
}

/* 6. CLOUDINARY UPLOAD */
function uploadImageToCloudinary(fileBuffer,workerId){
return new Promise((resolve,reject)=>{
const uploadStream=cloudinary.uploader.upload_stream(
{
folder:`skillconnect/workers/${workerId}/services`,
resource_type:"image"
},
(error,result)=>{
if(error){
reject(error);
return;
}
if(!result||!result.public_id){
reject(new Error("Cloudinary did not return a public_id."));
return;
}
resolve({public_id:result.public_id});
}
);
Readable.from(fileBuffer).pipe(uploadStream);
});
}

/* 7. DELETE CLOUDINARY IMAGE */
async function deleteCloudinaryImages(publicIds){
if(!Array.isArray(publicIds)||publicIds.length===0)return;

for(const publicId of publicIds){
try{
await cloudinary.uploader.destroy(
publicId,
{resource_type:"image"}
);
}catch(error){
console.error("Cloudinary cleanup failed:",error);
}
}
}

/* 8. CREATE WORKER SERVICE */
async function createWorkerService(req,res){
const uploadedPublicIds=[];

try{

/* 8.1 AUTHENTICATE ACCESS TOKEN */
const authorization=req.headers.authorization;

if(!authorization||!authorization.startsWith("Bearer ")){
return res.status(401).json({
success:false,
message:"Authentication required. Please log in again."
});
}

const accessToken=authorization.split(" ")[1];

if(!accessToken){
return res.status(401).json({
success:false,
message:"Authentication required. Please log in again."
});
}

/* 8.2 VERIFY ACCESS TOKEN */
let decodedToken;

try{
decodedToken=jwt.verify(
accessToken,
process.env.ACCESS_TOKEN_SECRET
);
}catch(error){
return res.status(401).json({
success:false,
message:"Your access token is invalid or expired."
});
}

/* 8.3 VERIFY WORKER TOKEN */
const workerId=decodedToken.userId||decodedToken.id;

if(decodedToken.userType!=="worker"||!workerId){
return res.status(403).json({
success:false,
message:"You are not authorized to create a service."
});
}

/* 8.4 FIND WORKER */
const worker=await Worker.findById(workerId);

if(!worker){
return res.status(404).json({
success:false,
message:"Worker account could not be found."
});
}

/* 8.5 CHECK ACCOUNT STATUS */
if(worker.accountStatus!=="active"){
return res.status(403).json({
success:false,
message:"Your worker account is not active."
});
}

/* 8.6 READ SERVICE DATA */
const skill=typeof req.body.skill==="string"
?req.body.skill.trim()
:"";

const experience=typeof req.body.experience==="string"
?req.body.experience.trim()
:"";

const description=typeof req.body.description==="string"
?req.body.description.trim()
:"";

/* 8.7 VALIDATE SKILL */
if(!skill){
return res.status(400).json({
success:false,
message:"Please select a skill."
});
}

if(!LOCAL_SKILLS.includes(skill)){
return res.status(400).json({
success:false,
message:"The selected skill is not valid."
});
}

/* 8.8 CHECK IF SKILL ALREADY EXISTS */
const skillAlreadyExists=
Array.isArray(worker.services)&&
worker.services.some(service=>
typeof service.skill==="string"&&
service.skill.trim().toLowerCase()===skill.toLowerCase()
);

if(skillAlreadyExists){
return res.status(400).json({
success:false,
message:`You already have a service for ${skill}.`
});
}

/* 8.9 VALIDATE EXPERIENCE */
if(!experience){
return res.status(400).json({
success:false,
message:"Please select your experience."
});
}

if(!EXPERIENCE_OPTIONS.includes(experience)){
return res.status(400).json({
success:false,
message:"The selected experience is not valid."
});
}

/* 8.10 VALIDATE DESCRIPTION */
if(!description){
return res.status(400).json({
success:false,
message:"Please enter a service description."
});
}

const descriptionWordCount=countWords(description);

if(descriptionWordCount>MAX_DESCRIPTION_WORDS){
return res.status(400).json({
success:false,
message:"The service description cannot exceed 300 words."
});
}

/* 8.11 VALIDATE PORTFOLIO IMAGES */
const portfolioFiles=Array.isArray(req.files)?req.files:[];

if(portfolioFiles.length===0){
return res.status(400).json({
success:false,
message:"Please upload at least one portfolio image."
});
}

if(portfolioFiles.length>MAX_PORTFOLIO_IMAGES){
return res.status(400).json({
success:false,
message:"You can upload a maximum of 3 portfolio images."
});
}

/* 8.12 VALIDATE EACH IMAGE */
for(const file of portfolioFiles){

if(!file.mimetype||!file.mimetype.startsWith("image/")){
return res.status(400).json({
success:false,
message:"Only image files can be uploaded."
});
}

if(file.size>MAX_PORTFOLIO_IMAGE_SIZE){
return res.status(400).json({
success:false,
message:"Each portfolio image must not be larger than 5 MB."
});
}

if(!file.buffer||!Buffer.isBuffer(file.buffer)){
return res.status(400).json({
success:false,
message:"One or more portfolio images could not be processed."
});
}
}

/* 8.13 CREATE NEXT SERVICE ID */
let nextServiceId=1;

if(Array.isArray(worker.services)&&worker.services.length>0){
const highestServiceId=worker.services.reduce(
(highest,service)=>{
const serviceId=Number(service.id);

if(Number.isFinite(serviceId)&&serviceId>highest)
return serviceId;

return highest;
},
0
);

nextServiceId=highestServiceId+1;
}

/* 8.14 UPLOAD PORTFOLIO IMAGES */
const portfolioPublicIds=[];

for(const file of portfolioFiles){

const uploadedImage=
await uploadImageToCloudinary(
file.buffer,
worker._id.toString()
);

portfolioPublicIds.push(uploadedImage.public_id);
uploadedPublicIds.push(uploadedImage.public_id);
}

/* 8.15 CREATE SERVICE OBJECT */
const newService={
id:nextServiceId,
skill,
experience,
description,
portfolios:portfolioPublicIds,
date:new Date()
};

/* 8.16 SAVE SERVICE */
worker.services.push(newService);

/* 8.17 UPDATE WORKER SKILLS */
if(!Array.isArray(worker.skills)){
worker.skills=[];
}

const hasSkill=worker.skills.some(
existingSkill=>
existingSkill.trim().toLowerCase()===skill.toLowerCase()
);

if(!hasSkill){
worker.skills.push(skill);
}

/* 8.18 SAVE WORKER */
await worker.save();

/* 8.19 SUCCESS RESPONSE */
return res.status(201).json({
success:true,
message:"Service added successfully.",
service:{
id:newService.id,
skill:newService.skill,
experience:newService.experience,
description:newService.description,
portfolios:newService.portfolios,
date:newService.date
}
});

}catch(error){

/* 8.20 CLEAN UP CLOUDINARY UPLOADS */
await deleteCloudinaryImages(
uploadedPublicIds
);

console.error(
"Create worker service error:",
error
);

return res.status(500).json({
success:false,
message:"An error occurred while creating your service. Please try again."
});
}
}

/* 9. EXPORT CONTROLLER */
module.exports={
createWorkerService
};