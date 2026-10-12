"use strict";

const crypto=require("crypto");
const {Robase}=require("@robasedev/sdk");
const Worker=require("../models/worker");

const robase=new Robase({
    apiKey:process.env.ROBASE_API_KEY
});

const OTP_EXPIRY_MS=10*60*1000;
const COOLDOWN_MS=24*60*60*1000;
const MAX_RESENDS=5;
const VERIFICATION_VALIDITY_MS=30*24*60*60*1000;

const hashOTP=otp=>
    crypto.createHash("sha256").update(otp).digest("hex");

const generateOTP=()=>
    crypto.randomInt(100000,1000000).toString();

const maskPhone=phone=>{
    if(!phone)return "";
    if(phone.length<=7)return phone;
    return `${phone.slice(0,3)}****${phone.slice(-4)}`;
};

const sendSMS=async(phone,otp)=>{
    if(!process.env.ROBASE_API_KEY){
        throw new Error("Robase SMS configuration is missing.");
    }

    await robase.sms.send({
        phone_number:phone,
        message:`Your SkillConnect phone verification code is ${otp}. It expires in 10 minutes.`
    });
};

const getWorker=async(req)=>{
    if(!req.workerId){
        const error=new Error("Worker authentication required.");
        error.statusCode=401;
        throw error;
    }

    const worker=await Worker.findById(req.workerId).select(
        "+phoneOtpHash +phoneOtpExpires phone phoneVerificationExpires phoneOtpResendCount coolDownUntil"
    );

    return worker;
};

/* GET WORKER PHONE */

const getWorkerPhone=async(req,res,next)=>{
    try{
        const worker=await getWorker(req);

        if(!worker){
            return res.status(404).json({
                success:false,
                message:"Worker account was not found."
            });
        }

        if(!worker.phone){
            return res.status(400).json({
                success:false,
                message:"No phone number is associated with your account."
            });
        }

        if(
            worker.phoneVerificationExpires &&
            worker.phoneVerificationExpires>new Date()
        ){
            return res.status(200).json({
                success:true,
                verified:true,
                phone:maskPhone(worker.phone)
            });
        }

        return res.status(200).json({
            success:true,
            verified:false,
            phone:maskPhone(worker.phone)
        });
    }catch(error){
        next(error);
    }
};

/* VERIFY WORKER PHONE */

const verifyWorkerPhone=async(req,res,next)=>{
    try{
        const {otp}=req.body;

        if(typeof otp!=="string"||!/^\d{6}$/.test(otp)){
            return res.status(400).json({
                success:false,
                message:"Please enter a valid 6-digit verification code."
            });
        }

        const worker=await getWorker(req);

        if(!worker){
            return res.status(404).json({
                success:false,
                message:"Worker account was not found."
            });
        }

        if(!worker.phone){
            return res.status(400).json({
                success:false,
                message:"No phone number is associated with your account."
            });
        }

        const now=new Date();

        if(
            worker.phoneVerificationExpires &&
            worker.phoneVerificationExpires>now
        ){
            return res.status(400).json({
                success:false,
                message:"Your phone number is already verified."
            });
        }

        if(!worker.phoneOtpHash||!worker.phoneOtpExpires){
            return res.status(400).json({
                success:false,
                message:"No active verification code was found. Please request a new OTP."
            });
        }

        if(worker.phoneOtpExpires<=now){
            return res.status(400).json({
                success:false,
                message:"Your verification code has expired. Please request a new OTP."
            });
        }

        const submittedHash=Buffer.from(hashOTP(otp),"hex");
        const storedHash=Buffer.from(worker.phoneOtpHash,"hex");

        if(
            submittedHash.length!==storedHash.length||
            !crypto.timingSafeEqual(submittedHash,storedHash)
        ){
            return res.status(400).json({
                success:false,
                message:"The verification code is incorrect."
            });
        }

        worker.phoneVerificationExpires=new Date(
            now.getTime()+VERIFICATION_VALIDITY_MS
        );

        worker.phoneOtpHash=null;
        worker.phoneOtpExpires=null;
        worker.phoneOtpResendCount=0;
        worker.coolDownUntil=null;

        await worker.save();

        return res.status(200).json({
            success:true,
            message:"Your phone number has been successfully verified."
        });
    }catch(error){
        next(error);
    }
};

/* RESEND WORKER PHONE OTP */

const resendWorkerPhoneOTP=async(req,res,next)=>{
    try{
        const worker=await getWorker(req);

        if(!worker){
            return res.status(404).json({
                success:false,
                message:"Worker account was not found."
            });
        }

        if(!worker.phone){
            return res.status(400).json({
                success:false,
                message:"No phone number is associated with your account."
            });
        }

        const now=new Date();

        if(
            worker.phoneVerificationExpires &&
            worker.phoneVerificationExpires>now
        ){
            return res.status(400).json({
                success:false,
                message:"Your phone number is already verified."
            });
        }

        /* Enforce an active 24-hour cooldown. */

        if(worker.coolDownUntil&&worker.coolDownUntil>now){
            return res.status(429).json({
                success:false,
                message:"You have reached the OTP resend limit. Please try again after the cooldown.",
                cooldownUntil:worker.coolDownUntil.toISOString()
            });
        }

        /* Clear an expired cooldown. */

        if(worker.coolDownUntil&&worker.coolDownUntil<=now){
            worker.coolDownUntil=null;
            worker.phoneOtpResendCount=0;
        }

        /* Five successful resends are allowed per cooldown period. */

        if((worker.phoneOtpResendCount||0)>=MAX_RESENDS){
            worker.phoneOtpResendCount=0;
            worker.coolDownUntil=new Date(now.getTime()+COOLDOWN_MS);

            await worker.save();

            return res.status(429).json({
                success:false,
                message:"You have reached the OTP resend limit. Please try again after 24 hours.",
                cooldownUntil:worker.coolDownUntil.toISOString()
            });
        }

        const otp=generateOTP();
        const previousHash=worker.phoneOtpHash;
        const previousExpiry=worker.phoneOtpExpires;
        const previousCount=worker.phoneOtpResendCount||0;

        worker.phoneOtpHash=hashOTP(otp);
        worker.phoneOtpExpires=new Date(now.getTime()+OTP_EXPIRY_MS);
        worker.phoneOtpResendCount=previousCount+1;

        await worker.save();

        try{
            await sendSMS(worker.phone,otp);
        }catch(smsError){
            worker.phoneOtpHash=previousHash;
            worker.phoneOtpExpires=previousExpiry;
            worker.phoneOtpResendCount=previousCount;

            await worker.save();
            throw smsError;
        }

        return res.status(200).json({
            success:true,
            message:"A new verification code has been sent to your phone."
        });
    }catch(error){
        next(error);
    }
};

module.exports={
    getWorkerPhone,
    verifyWorkerPhone,
    resendWorkerPhoneOTP
};