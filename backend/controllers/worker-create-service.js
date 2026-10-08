const{Readable}=require("stream");
const sharp=require("sharp");
const Worker=require("../models/worker");

const{v2:cloudinary}=require("cloudinary");

cloudinary.config({
cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
api_key:process.env.CLOUDINARY_API_KEY,
api_secret:process.env.CLOUDINARY_API_SECRET
});

const MAX_PORTFOLIO_IMAGE_SIZE=510241024;
const MAX_PORTFOLIO_IMAGES=3;
const MAX_DESCRIPTION_WORDS=150;

const LOCAL_SKILLS=[
"Swimming Instructor","Barber","Hairdresser","Makeup Artist","Tailor",
"Fashion Designer","Plumber","Electrician","Painter","Welder","Carpenter",
"Bricklayer","Cleaner","Laundry Service","Mechanic","Auto Electrician",
"Phone Repair","Computer Repair","Graphic Designer","Web Developer",
"Photographer","Videographer","Caterer","Baker","Cook","Event Planner",
"Interior Decorator","AC Technician","Generator Repair","POP Installer",
"Tiler","Furniture Maker","Driver","Tutor","Fitness Trainer","Other"
];

const EXPERIENCE_OPTIONS=[
"Less than 1 year","1 year","2 years","3 years","4 years","5 years+"
];

function countWords(text){
if(!text||!text.trim())return 0;
return text.trim().split(/\s+/).length;
}

async function convertAndCompressImage(fileBuffer){
let quality=80;
let outputBuffer;

while(quality>=20){

outputBuffer=await sharp(fileBuffer)
.jpeg({
quality,
mozjpeg:true
})
.toBuffer();

if(outputBuffer.length<=MAX_PORTFOLIO_IMAGE_SIZE)
return outputBuffer;

quality-=10;
}

throw new Error(
"Portfolio image could not be compressed to 5 MB or less."
);
}

function uploadImageToCloudinary(fileBuffer,workerId){
return new Promise((resolve,reject)=>{
const uploadStream=cloudinary.uploader.upload_stream(
{
folder:"skillconnect/workers/${workerId}/services",
resource_type:"image",
format:"jpg"
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

resolve({
public_id:result.public_id
});
}
);

Readable.from(fileBuffer).pipe(uploadStream);
});
}

async function deleteCloudinaryImages(publicIds){
if(!Array.isArray(publicIds)||publicIds.length===0)return;

for(const publicId of publicIds){
try{
await cloudinary.uploader.destroy(
publicId,
{resource_type:"image"}
);
}catch(error){
console.error(
"Cloudinary cleanup failed:",
error
);
}
}
}

async function createWorkerService(req,res){

const uploadedPublicIds=[];

try{

const workerId=req.workerId;

if(!workerId)
return res.status(401).json({
success:false,
message:"Authentication required. Please log in again."
});

const worker=await Worker.findById(workerId);

if(!worker)
return res.status(404).json({
success:false,
message:"Worker account could not be found."
});

const skill=typeof req.body.skill==="string"
?req.body.skill.trim()
:"";

const experience=typeof req.body.experience==="string"
?req.body.experience.trim()
:"";

const description=typeof req.body.description==="string"
?req.body.description.trim()
:"";

if(!skill)
return res.status(400).json({
success:false,
message:"Please select a skill."
});

if(!LOCAL_SKILLS.includes(skill))
return res.status(400).json({
success:false,
message:"The selected skill is not valid."
});

if(!experience)
return res.status(400).json({
success:false,
message:"Please select your experience."
});

if(!EXPERIENCE_OPTIONS.includes(experience))
return res.status(400).json({
success:false,
message:"The selected experience is not valid."
});

if(!description)
return res.status(400).json({
success:false,
message:"Please enter a service description."
});

const descriptionWordCount=
countWords(description);

if(descriptionWordCount>MAX_DESCRIPTION_WORDS)
return res.status(400).json({
success:false,
message:"The service description cannot exceed 150 words."
});

const skillAlreadyExists=
Array.isArray(worker.services)&&
worker.services.some(
service=>
typeof service.skill==="string"&&
service.skill.trim().toLowerCase()===
skill.toLowerCase()
);

if(skillAlreadyExists)
return res.status(400).json({
success:false,
message:"You already have a service for ${skill}."
});

const portfolioFiles=
Array.isArray(req.files)?req.files:[];

if(portfolioFiles.length===0)
return res.status(400).json({
success:false,
message:"Please upload at least one portfolio image."
});

if(portfolioFiles.length>MAX_PORTFOLIO_IMAGES)
return res.status(400).json({
success:false,
message:"You can upload a maximum of 3 portfolio images."
});

for(const file of portfolioFiles){

if(!file.mimetype||
!file.mimetype.startsWith("image/"))
return res.status(400).json({
success:false,
message:"Only image files can be uploaded."
});

if(!file.buffer||
!Buffer.isBuffer(file.buffer))
return res.status(400).json({
success:false,
message:"One or more portfolio images could not be processed."
});
}

let nextServiceId=1;

if(
Array.isArray(worker.services)&&
worker.services.length>0
){

const highestServiceId=
worker.services.reduce(
(highest,service)=>{

const serviceId=Number(
service.id
);

if(
Number.isFinite(serviceId)&&
serviceId>highest
)
return serviceId;

return highest;
},
0
);

nextServiceId=
highestServiceId+1;
}

const portfolioPublicIds=[];

for(const file of portfolioFiles){

const compressedImage=
await convertAndCompressImage(
file.buffer
);

const uploadedImage=
await uploadImageToCloudinary(
compressedImage,
worker._id.toString()
);

portfolioPublicIds.push(
uploadedImage.public_id
);

uploadedPublicIds.push(
uploadedImage.public_id
);
}

const newService={
id:nextServiceId,
skill,
experience,
description,
portfolios:portfolioPublicIds,
date:new Date(),
adminApproval:"in review",
adminResponse:"It may take up to 24 hours for admin update"
};

worker.services.push(
newService
);

if(!Array.isArray(worker.skills))
worker.skills=[];

const hasSkill=
worker.skills.some(
existingSkill=>
existingSkill.trim().toLowerCase()===
skill.toLowerCase()
);

if(!hasSkill)
worker.skills.push(skill);

await worker.save();

return res.status(201).json({
success:true,
message:"Service added successfully."
});

}catch(error){

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

module.exports={
createWorkerService
};