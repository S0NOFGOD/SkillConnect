const crypto=require("crypto");
const jwt=require("jsonwebtoken");
const {Readable}=require("stream");
const cloudinary=require("cloudinary").v2;
const Client=require("../models/client");
const {authenticateClient}=require("./client-authentication");

cloudinary.config({
cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
api_key:process.env.CLOUDINARY_API_KEY,
api_secret:process.env.CLOUDINARY_API_SECRET
});

const normalizePhone=phone=>{
let value=String(phone||"").trim().replace(/\s+/g,"");

if(value.startsWith("+234")){
value="0"+value.slice(4);
}

if(value.startsWith("234")){
value="0"+value.slice(3);
}

return value;
};

const isValidPhone=phone=>/^0[789][01]\d{8}$/.test(phone);

const isValidFullName=fullName=>{
const parts=fullName.trim().split(/\s+/);
return parts.length===2&&parts.every(part=>part.length>=2);
};

const formatFullName=fullName=>{
return fullName
.trim()
.split(/\s+/)
.map(name=>name.charAt(0).toUpperCase()+name.slice(1).toLowerCase())
.join(" ");
};

const getProfilePhotoUrl=publicId=>{
if(!publicId)return null;

return cloudinary.url(publicId,{
secure:true
});
};

const uploadProfilePhoto=buffer=>{
return new Promise((resolve,reject)=>{
const uploadStream=cloudinary.uploader.upload_stream(
{
folder:"skillconnect/clients/profile-photos",
resource_type:"image"
},
(error,result)=>{
if(error)return reject(error);
resolve(result);
}
);

Readable.from(buffer).pipe(uploadStream);
});
};

const deleteProfilePhoto=async publicId=>{
if(!publicId)return;

try{
await cloudinary.uploader.destroy(publicId);
}catch(error){
console.error(
"Cloudinary old client profile photo deletion error:",
error
);
}
};

const getClientProfile=async(req,res)=>{
try{

const authentication=authenticateClient(req);

if(!authentication.valid){
return res.status(authentication.status).json({
success:false,
message:authentication.message
});
}

const client=await Client.findById(authentication.userId);

if(!client){
return res.status(404).json({
success:false,
message:"Client account was not found."
});
}

return res.status(200).json({
success:true,
profilePhoto:getProfilePhotoUrl(client.profilePhoto),
fullName:client.fullName||"",
phone:client.phone||"",
country:client.country||"",
state:client.state||"",
city:client.city||"",
lga:client.lga||""
});

}catch(error){
console.error("Get client profile error:",error);

return res.status(500).json({
success:false,
message:"Unable to load your profile. Please try again."
});
}
};

const updateClientProfile=async(req,res)=>{
let uploadedPhoto=null;

try{

const authentication=authenticateClient(req);

if(!authentication.valid){
return res.status(authentication.status).json({
success:false,
message:authentication.message
});
}

const client=await Client.findById(authentication.userId);

if(!client){
return res.status(404).json({
success:false,
message:"Client account was not found."
});
}

const fullName=req.body.fullName?.trim();
const phone=normalizePhone(req.body.phone);
const country=req.body.country?.trim();
const state=req.body.state?.trim();
const city=req.body.city?.trim();
const lga=req.body.lga?.trim();

if(!fullName||!isValidFullName(fullName)){
return res.status(400).json({
success:false,
message:"Please enter your first and last name."
});
}

if(!phone||!isValidPhone(phone)){
return res.status(400).json({
success:false,
message:"Please enter a valid Nigerian phone number."
});
}

if(!country){
return res.status(400).json({
success:false,
message:"Please select your country."
});
}

if(!state){
return res.status(400).json({
success:false,
message:"Please select your state."
});
}

if(!city){
return res.status(400).json({
success:false,
message:"Please select your city."
});
}

if(!lga){
return res.status(400).json({
success:false,
message:"Please select your local government area."
});
}

if(req.file){

if(req.file.size>5*1024*1024){
return res.status(400).json({
success:false,
message:"Profile photo must not exceed 5MB."
});
}

try{
uploadedPhoto=await uploadProfilePhoto(req.file.buffer);
}catch(error){
console.error(
"Client profile photo upload error:",
error
);

return res.status(500).json({
success:false,
message:"Unable to upload your profile photo. Please try again."
});
}
}

const oldProfilePhoto=client.profilePhoto;

client.fullName=formatFullName(fullName);
client.phone=phone;
client.country=country;
client.state=state;
client.city=city;
client.lga=lga;

if(uploadedPhoto){
client.profilePhoto=uploadedPhoto.public_id;
}

await client.save();

if(
uploadedPhoto&&
oldProfilePhoto&&
oldProfilePhoto!==uploadedPhoto.public_id
){
await deleteProfilePhoto(oldProfilePhoto);
}

return res.status(200).json({
success:true,
message:"Your profile was updated successfully.",
profilePhoto:getProfilePhotoUrl(client.profilePhoto),
fullName:client.fullName,
phone:client.phone,
country:client.country,
state:client.state,
city:client.city,
lga:client.lga
});

}catch(error){
console.error("Update client profile error:",error);

if(uploadedPhoto?.public_id){
await deleteProfilePhoto(uploadedPhoto.public_id);
}

return res.status(500).json({
success:false,
message:"Unable to update your profile. Please try again."
});
}
};

module.exports={
getClientProfile,
updateClientProfile
};