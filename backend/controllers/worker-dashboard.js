const jwt=require("jsonwebtoken");
const axios=require("axios");
const crypto=require("crypto");
const Worker=require("../models/worker");

const{v2:cloudinary}=require("cloudinary");
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const TERMII_API_KEY=process.env.TERMII_API_KEY;
const TERMII_BASE_URL=process.env.TERMII_BASE_URL;

const OTP_EXPIRY_MINUTES=10;
const generateOTP=()=>crypto.randomInt(100000,1000000).toString();
const createOTPExpiry=()=>new Date(Date.now()+OTP_EXPIRY_MINUTES*60*1000);
const generateOTPData=()=>{const otp=generateOTP();const expiresAt=createOTPExpiry();return{otp,expiresAt};};

const sendPhoneOtp=async(phone,otp)=>{
if(!phone)throw new Error("Phone number is required.");
if(!otp)throw new Error("OTP is required.");
if(!TERMII_API_KEY)throw new Error("TERMII_API_KEY is not configured.");
if(!TERMII_BASE_URL)throw new Error("TERMII_BASE_URL is not configured.");
const message=`Your SkillConnect verification code is ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;
const response=await axios.post(`${TERMII_BASE_URL}/api/sms/send`,{to:phone,from:"Termii",sms:message,type:"plain",channel:"dnd",api_key:TERMII_API_KEY},{headers:{"Content-Type":"application/json"}});
console.log("Termii SMS response:",response.data);
return{success:true,phone,response:response.data};
};

const authenticateAccessToken=req=>{
const authorization=req.headers.authorization;
if(!authorization||!authorization.startsWith("Bearer "))return null;
const accessToken=authorization.split(" ")[1];
if(!accessToken)return null;
try{
const decoded=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET);
if(decoded.userType!=="worker"||!decoded.userId)return null;
return decoded.userId;
}catch(error){return null;}
};

const sendAuthenticationError=res=>res.status(401).json({success:false,message:"Your authentication session is invalid or has expired. Please sign in again."});

const formatWorkerProfile=worker=>{
const totalSkills=Array.isArray(worker.skills)?worker.skills.length:0;
const skill=Array.isArray(worker.skills)&&worker.skills.length>0?worker.skills[0]:"";
return{
fullName:worker.fullName||"",
profilePhoto:worker.profilePhoto?cloudinary.url(worker.profilePhoto,{secure:true}):null,
phone:worker.phone||"",
phoneVerificationExpires:worker.phoneVerificationExpires||null,
country:worker.country||"",
state:worker.state||"",
city:worker.city||"",
lga:worker.lga||"",
totalSkills,
skill,
experience:worker.experience||"",
socialProfile:worker.socialProfile||"",
description:worker.description||""
};
};

const getWorkerDashboard=async(req,res)=>{
try{
const workerId=authenticateAccessToken(req);
if(!workerId)return sendAuthenticationError(res);
const worker=await Worker.findById(workerId);
if(!worker)return res.status(404).json({success:false,message:"Worker account not found."});
return res.status(200).json({success:true,worker:formatWorkerProfile(worker)});
}catch(error){
console.error("Get worker dashboard error:",error);
return res.status(500).json({success:false,message:"Unable to load your dashboard. Please try again."});
}
};

const verifyWorkerPhone=async(req,res)=>{
try{
const workerId=authenticateAccessToken(req);
if(!workerId)return sendAuthenticationError(res);
const worker=await Worker.findById(workerId);
if(!worker)return res.status(404).json({success:false,message:"Worker account not found."});
if(!worker.phone)return res.status(400).json({success:false,message:"Please add a phone number before verifying your profile."});
if(worker.phoneVerificationExpires&&new Date(worker.phoneVerificationExpires)>new Date())return res.status(400).json({success:false,message:"Your phone number is already verified."});
const{otp,expiresAt}=generateOTPData();
await sendPhoneOtp(worker.phone,otp);
worker.phoneOtp=otp;
worker.phoneOtpExpires=expiresAt;
await worker.save();
return res.status(200).json({success:true,message:"A verification code has been sent to your phone.",phone:worker.phone});
}catch(error){
console.error("Worker phone verification error:",error);
return res.status(500).json({success:false,message:"Unable to send your phone verification code. Please try again."});
}
};

module.exports={getWorkerDashboard,verifyWorkerPhone};