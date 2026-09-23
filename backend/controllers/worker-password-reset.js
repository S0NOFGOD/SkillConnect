/* =========================================================
   SKILLCONNECT — CONTROLLER — WORKER PASSWORD RESET OTP
========================================================= */

const crypto=require("crypto");
const https=require("https");
const Worker=require("../models/worker");

const BREVO_API_KEY=process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL=process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME=process.env.BREVO_SENDER_NAME||"SkillConnect";
const BREVO_SMS_SENDER_NAME=process.env.BREVO_SMS_SENDER_NAME;

const OTP_EXPIRY_MINUTES=10;
const generateOTP=()=>crypto.randomInt(100000,1000000).toString();
const createOTPExpiry=()=>new Date(Date.now()+OTP_EXPIRY_MINUTES*60*1000);
const generateOTPData=()=>{const otp=generateOTP();const expiresAt=createOTPExpiry();return{otp,expiresAt};};

const sendEmail=async({to,subject,htmlContent})=>{
if(!to)throw new Error("Recipient email is required.");
if(!subject)throw new Error("Email subject is required.");
if(!htmlContent)throw new Error("Email HTML content is required.");
if(!BREVO_API_KEY)throw new Error("BREVO_API_KEY is not configured.");
if(!BREVO_SENDER_EMAIL)throw new Error("BREVO_SENDER_EMAIL is not configured.");
const data=JSON.stringify({sender:{name:BREVO_SENDER_NAME,email:BREVO_SENDER_EMAIL},to:[{email:to}],subject,htmlContent});
return new Promise((resolve,reject)=>{
const request=https.request({hostname:"api.brevo.com",path:"/v3/smtp/email",method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(data),"api-key":BREVO_API_KEY}},response=>{
let responseData="";
response.on("data",chunk=>responseData+=chunk);
response.on("end",()=>{
if(response.statusCode>=200&&response.statusCode<300)return resolve({success:true,data:responseData});
reject(new Error(`Brevo email error (${response.statusCode}): ${responseData}`));
});
});
request.on("error",error=>reject(error));
request.write(data);
request.end();
});
};

const sendOTPEmail=async({email,otp,type})=>{
if(!email)throw new Error("Recipient email is required.");
if(!otp)throw new Error("OTP is required.");
let subject,title,message;
if(type==="email-verification"){
subject="Verify Your SkillConnect Account";
title="Verify Your Email";
message="Use the verification code below to verify your SkillConnect account.";
}else if(type==="password-reset"){
subject="SkillConnect Password Reset";
title="Reset Your Password";
message="Use the code below to verify your password reset request.";
}else throw new Error("Invalid OTP email type.");
const htmlContent=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;"><h2>${title}</h2><p>${message}</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;margin:20px 0;background:#f5f5f5;border-radius:8px;">${otp}</div><p>This code expires in 10 minutes.</p><p>If you did not request this code, you can safely ignore this email.</p><p>— SkillConnect</p></div>`;
return sendEmail({to:email,subject,htmlContent});
};

/* 2. VERIFY PASSWORD RESET OTP */
const verifyPasswordResetOTP=async(req,res)=>{
try{
const{email,otp}=req.body;
if(!email||!otp)return res.status(400).json({success:false,message:"Email and OTP are required."});
const normalizedEmail=email.trim().toLowerCase();
const normalizedOTP=otp.trim();
if(!/^\d{6}$/.test(normalizedOTP))return res.status(400).json({success:false,message:"OTP must be a 6-digit code."});
const worker=await Worker.findOne({email:normalizedEmail}).select("+passwordResetOtp +passwordResetOtpExpires");
if(!worker)return res.status(404).json({success:false,message:"Worker account not found."});
if(!worker.passwordResetOtp)return res.status(400).json({success:false,message:"No active password reset code found. Please request a new code."});
if(worker.passwordResetOtp!==normalizedOTP)return res.status(400).json({success:false,message:"Invalid password reset code."});
if(!worker.passwordResetOtpExpires)return res.status(400).json({success:false,message:"Password reset code has expired. Please request a new code."});
if(new Date()>worker.passwordResetOtpExpires){
worker.passwordResetOtp=null;
worker.passwordResetOtpExpires=null;
await worker.save();
return res.status(400).json({success:false,message:"Password reset code has expired. Please request a new code."});
}
const resetAuthorization=crypto.randomBytes(32).toString("hex");
const resetAuthorizationExpires=new Date(Date.now()+10*60*1000);
worker.passwordResetVerified=true;
worker.passwordResetVerifiedAt=new Date();
worker.resetAuthorization=resetAuthorization;
worker.resetAuthorizationExpires=resetAuthorizationExpires;
worker.passwordResetOtp=null;
worker.passwordResetOtpExpires=null;
await worker.save();
return res.status(200).json({success:true,message:"Password reset code verified successfully.",resetAuthorization,redirect:"../worker-password-change/index.html"});
}catch(error){
console.error("Worker password reset OTP verification error:",error);
return res.status(500).json({success:false,message:"An error occurred while verifying the password reset code."});
}
};

/* 3. RESEND PASSWORD RESET OTP */
const resendPasswordResetOTP=async(req,res)=>{
try{
const{email}=req.body;
if(!email)return res.status(400).json({success:false,message:"Email is required."});
const normalizedEmail=email.trim().toLowerCase();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))return res.status(400).json({success:false,message:"Please provide a valid email address."});
const worker=await Worker.findOne({email:normalizedEmail});
if(!worker)return res.status(200).json({success:true,message:"If an account exists with this email, a password reset code has been sent."});
const{otp,expiresAt}=generateOTPData();
worker.passwordResetOtp=otp;
worker.passwordResetOtpExpires=expiresAt;
worker.passwordResetVerified=false;
worker.passwordResetVerifiedAt=null;
worker.resetAuthorization=null;
worker.resetAuthorizationExpires=null;
await worker.save();
try{
await sendOTPEmail({email:worker.email,otp,type:"password-reset"});
}catch(emailError){
worker.passwordResetOtp=null;
worker.passwordResetOtpExpires=null;
await worker.save();
throw emailError;
}
return res.status(200).json({success:true,message:"A new password reset code has been sent to your email."});
}catch(error){
console.error("Worker resend password reset OTP error:",error);
return res.status(500).json({success:false,message:"An error occurred while sending the password reset code."});
}
};

module.exports={verifyPasswordResetOTP,resendPasswordResetOTP};