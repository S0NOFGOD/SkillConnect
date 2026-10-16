"use strict";

const crypto=require("crypto");
const https=require("https");
const Worker=require("../models/worker");

const BREVO_API_KEY=process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL=process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME=process.env.BREVO_SENDER_NAME||"SkillConnect";

const OTP_EXPIRY_MINUTES=10;
const MAX_RESENDS=4;
const COOLDOWN_MS=24*60*60*1000;

const generateOTP=()=>crypto.randomInt(100000,1000000).toString();
const hashOTP=otp=>crypto.createHash("sha256").update(otp).digest("hex");
const createOTPExpiry=()=>new Date(Date.now()+OTP_EXPIRY_MINUTES*60*1000);

const sendEmail=async({to,subject,htmlContent})=>{
if(!to||!subject||!htmlContent)throw new Error("Recipient, subject and email content are required.");
if(!BREVO_API_KEY||!BREVO_SENDER_EMAIL)throw new Error("Brevo email configuration is missing.");

const data=JSON.stringify({
    sender:{name:BREVO_SENDER_NAME,email:BREVO_SENDER_EMAIL},
    to:[{email:to}],subject,htmlContent
});

return new Promise((resolve,reject)=>{
    const request=https.request({
        hostname:"api.brevo.com",
        path:"/v3/smtp/email",
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Content-Length":Buffer.byteLength(data),
            "api-key":BREVO_API_KEY
        }
    },response=>{
        let responseData="";
        response.on("data",chunk=>responseData+=chunk);
        response.on("end",()=>{
            if(response.statusCode>=200&&response.statusCode<300)
                return resolve({success:true,data:responseData});
            reject(new Error(`Brevo email error (${response.statusCode}): ${responseData}`));
        });
    });

    request.on("error",reject);
    request.write(data);
    request.end();
});

};

const sendOTPEmail=async({email,otp,type})=>{
let subject,title,message;

if(type==="email-verification"){
    subject="Verify Your SkillConnect Account";
    title="Verify Your Email";
    message="Use the verification code below to verify your SkillConnect account.";
}else if(type==="password-reset"){
    subject="SkillConnect Password Reset";
    title="Reset Your Password";
    message="Use the code below to verify your password reset request.";
}else{
    throw new Error("Invalid OTP email type.");
}

const htmlContent=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#333"><h2>${title}</h2><p>${message}</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;margin:20px 0;background:#f5f5f5;border-radius:8px">${otp}</div><p>This code expires in 10 minutes.</p><p>If you did not request this code, you can safely ignore this email.</p><p>— SkillConnect</p></div>`;

return sendEmail({to:email,subject,htmlContent});

};

/* VERIFY EMAIL OTP */
const verifyEmailOTP=async(req,res)=>{
try{
const {email,otp}=req.body||{};

    if(typeof email!=="string"||!email.trim()||
       typeof otp!=="string"||!otp.trim()){
        return res.status(400).json({success:false,message:"Email and OTP are required."});
    }

    const normalizedEmail=email.trim().toLowerCase();
    const normalizedOTP=otp.trim();

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
        return res.status(400).json({success:false,message:"Please provide a valid email address."});

    if(!/^\d{6}$/.test(normalizedOTP))
        return res.status(400).json({success:false,message:"OTP must be a 6-digit code."});

    const worker=await Worker.findOne({email:normalizedEmail})
        .select("+emailOtpHash +emailOtpExpires");

    if(!worker)
        return res.status(404).json({success:false,message:"Worker account not found."});

    if(!worker.emailOtpExpires||Date.now()>worker.emailOtpExpires.getTime()){
        worker.emailOtpHash=null;
        worker.emailOtpExpires=null;
        await worker.save();

        return res.status(400).json({
            success:false,
            message:"Verification code has expired. Please request a new code."
        });
    }

    if(!worker.emailOtpHash||hashOTP(normalizedOTP)!==worker.emailOtpHash)
        return res.status(400).json({success:false,message:"Invalid verification code."});

    worker.emailOtpHash=null;
    worker.emailOtpExpires=null;
    worker.emailVerified=true;

    await worker.save();

    return res.status(200).json({
        success:true,
        message:"Email verified successfully.",
        email:worker.email,
        nextStep:worker.profileCompleted?"authenticated":"profile"
    });
}catch(error){
    console.error("Worker email OTP verification error:",error);
    return res.status(500).json({
        success:false,
        message:"An error occurred while verifying your email."
    });
}

};

/* RESEND EMAIL OTP */
const resendEmailOTP=async(req,res)=>{
try{
const {email}=req.body||{};

    if(typeof email!=="string"||!email.trim())
        return res.status(400).json({success:false,message:"Email is required."});

    const normalizedEmail=email.trim().toLowerCase();

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
        return res.status(400).json({success:false,message:"Please provide a valid email address."});

    const worker=await Worker.findOne({email:normalizedEmail});

    if(!worker)
        return res.status(404).json({success:false,message:"Worker account not found."});

    if(worker.emailVerified)
        return res.status(400).json({success:false,message:"Your email is already verified. Please continue to your profile."});

    const attempts=worker.emailOtpResendAttempts;
    const now=Date.now();

    if(attempts?.coolDownUntil){
        const cooldownTime=new Date(attempts.coolDownUntil).getTime();

        if(cooldownTime>now){
            return res.status(429).json({
                success:false,
                message:"You have reached the maximum of resend attempts.",
                coolDownUntil:attempts.coolDownUntil
            });
        }

        attempts.coolDownUntil=null;
        attempts.emailOtpResendCount=0;
    }

    if((attempts?.emailOtpResendCount||0)>=MAX_RESENDS){
        attempts.coolDownUntil=new Date(now+COOLDOWN_MS);
        await worker.save();

        return res.status(429).json({
            success:false,
            message:"You have reached the maximum of resend attempts.",
            coolDownUntil:attempts.coolDownUntil
        });
    }

    attempts.emailOtpResendCount=(attempts.emailOtpResendCount||0)+1;
    await worker.save();

    const otp=generateOTP();

    await sendOTPEmail({
        email:worker.email,
        otp,
        type:"email-verification"
    });

    worker.emailOtpHash=hashOTP(otp);
    worker.emailOtpExpires=createOTPExpiry();

    await worker.save();

    return res.status(200).json({
        success:true,
        message:"Verification code has been sent to your email.",
        email:worker.email,
        nextStep:"email-verification"
    });
}catch(error){
    console.error("Worker resend email OTP error:",error);
    return res.status(500).json({
        success:false,
        message:"An error occurred while sending the verification code."
    });
}

};

module.exports={verifyEmailOTP,resendEmailOTP};