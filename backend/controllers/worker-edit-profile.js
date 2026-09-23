const jwt=require("jsonwebtoken");
const Worker=require("../models/worker");

const{v2:cloudinary}=require("cloudinary");
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const authenticate=async(req)=>{
const header=req.headers.authorization||"";
if(!header.startsWith("Bearer "))return null;
const token=header.split(" ")[1];
try{
const decoded=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
if(decoded.userType!=="worker"||!decoded.userId)return null;
return await Worker.findById(decoded.userId);
}catch(error){return null;}
};

const getPhotoUrl=publicId=>{
if(!publicId)return null;
return cloudinary.url(publicId,{secure:true});
};

const normalizePhone=phone=>{
let value=String(phone||"").trim().replace(/[\s()-]/g,"");
if(value.startsWith("234"))value=`+${value}`;
if(value.startsWith("0")&&value.length===11)value=`+234${value.slice(1)}`;
return value;
};

const isValidPhone=phone=>/^\+234\d{10}$/.test(phone);

const validateProfile=({
fullName,
phone,
country,
state,
city,
lga
})=>{
if(!fullName||fullName.length<2||fullName.length>100)return"Please provide a valid full name.";
if(!isValidPhone(phone))return"Please provide a valid Nigerian phone number.";
if(!country)return"Country is required.";
if(!state)return"State is required.";
if(!city)return"City is required.";
if(!lga)return"LGA is required.";
return null;
};

const workerResponse=worker=>({
fullName:worker.fullName,
profilePhoto:getPhotoUrl(worker.profilePhoto),
phone:worker.phone,
phoneVerificationExpires:worker.phoneVerificationExpires,
email:worker.email,
country:worker.country,
state:worker.state,
city:worker.city,
lga:worker.lga,
skills:worker.skills,
services:worker.services,
experience:worker.experience,
socialProfile:worker.socialProfile,
description:worker.description
});

const getProfile=async(req,res)=>{
try{
const worker=await authenticate(req);
if(!worker){
return res.status(401).json({
success:false,
message:"Your authentication session has expired. Please log in again."
});
}
return res.status(200).json({
success:true,
worker:workerResponse(worker)
});
}catch(error){
console.error("Get worker edit profile error:",error);
return res.status(500).json({
success:false,
message:"Unable to load your profile."
});
}
};

const updateProfile=async(req,res)=>{
try{
const worker=await authenticate(req);
if(!worker){
return res.status(401).json({
success:false,
message:"Your authentication session has expired. Please log in again."
});
}

const fullName=String(req.body.fullName||"").trim();
const phone=normalizePhone(req.body.phone);
const country=String(req.body.country||"").trim();
const state=String(req.body.state||"").trim();
const city=String(req.body.city||"").trim();
const lga=String(req.body.lga||"").trim();

const validationError=validateProfile({
fullName,
phone,
country,
state,
city,
lga
});

if(validationError){
return res.status(400).json({
success:false,
message:validationError
});
}

const phoneChanged=worker.phone!==phone;

if(phoneChanged){
const existingWorker=await Worker.findOne({
phone,
_id:{$ne:worker._id}
});
if(existingWorker){
return res.status(409).json({
success:false,
message:"This phone number is already registered."
});
}
}

let newPhotoPublicId=worker.profilePhoto;
let uploadedNewPhoto=false;

if(req.file){
if(req.file.size>5*1024*1024){
return res.status(400).json({
success:false,
message:"Profile photo must not exceed 5MB."
});
}

try{
const uploadResult=await new Promise((resolve,reject)=>{
const stream=cloudinary.uploader.upload_stream(
{
folder:"skillconnect/workers/profile-photos"
},
(error,result)=>{
if(error)return reject(error);
resolve(result);
}
);
stream.end(req.file.buffer);
});

newPhotoPublicId=uploadResult.public_id;
uploadedNewPhoto=true;
}catch(error){
console.error("Cloudinary upload error:",error);
return res.status(502).json({
success:false,
message:"Unable to upload your profile photo."
});
}
}

const oldPhotoPublicId=worker.profilePhoto;

worker.fullName=fullName;
worker.phone=phone;
worker.country=country;
worker.state=state;
worker.city=city;
worker.lga=lga;

if(uploadedNewPhoto){
worker.profilePhoto=newPhotoPublicId;
}

if(phoneChanged){
worker.phoneVerificationExpires=null;
}

await worker.save();

if(
uploadedNewPhoto&&
oldPhotoPublicId&&
oldPhotoPublicId!==newPhotoPublicId
){
try{
await cloudinary.uploader.destroy(oldPhotoPublicId);
}catch(error){
console.error(
"Old Cloudinary photo deletion error:",
error
);
}
}

return res.status(200).json({
success:true,
message:"Your profile was updated successfully.",
worker:workerResponse(worker)
});

}catch(error){
console.error("Update worker profile error:",error);
return res.status(500).json({
success:false,
message:"Unable to update your profile."
});
}
};

module.exports={
getProfile,
updateProfile
};