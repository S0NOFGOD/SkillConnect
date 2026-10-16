"use strict";

const Client=require("../models/client");
const crypto=require("crypto");

const OTP_EXPIRY_MS=10*60*1000;
const MAX_RESENDS=4;
const COOLDOWN_MS=24*60*60*1000;

const hashOTP=otp=>
    crypto.createHash("sha256").update(otp).digest("hex");

const generateOTP=()=>
    crypto.randomInt(100000,1000000).toString();

const sendOTPEmail=async(email,otp)=>{
    const response=await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
            method:"POST",
            headers:{
                "accept":"application/json",
                "api-key":process.env.BREVO_API_KEY,
                "content-type":"application/json"
            },
            body:JSON.stringify({
                sender:{
                    email:process.env.BREVO_SENDER_EMAIL,
                    name:process.env.BREVO_SENDER_NAME||"SkillConnect"
                },
                to:[{email}],
                subject:"SkillConnect Email Verification OTP",
                htmlContent:`
                    <div style="font-family:Arial,sans-serif;line-height:1.6">
                        <h2>SkillConnect Email Verification</h2>
                        <p>Your verification code is:</p>
                        <h1 style="letter-spacing:6px">${otp}</h1>
                        <p>This code expires in 10 minutes.</p>
                        <p>If you did not request this code, you can ignore this email.</p>
                    </div>
                `
            })
        }
    );

    if(!response.ok){
        let errorMessage="Failed to send verification email.";

        try{
            const data=await response.json();
            errorMessage=data.message||errorMessage;
        }catch(error){}

        const emailError=new Error(errorMessage);
        emailError.statusCode=500;

        throw emailError;
    }
};

const verifyClientEmailOTP=async(req,res,next)=>{
    try{
        const{email,otp}=req.body;

        if(
            typeof email!=="string"||
            typeof otp!=="string"||
            !email.trim()||
            !/^\d{6}$/.test(otp)
        ){
            return res.status(400).json({
                success:false,
                message:"Please provide a valid email address and 6-digit OTP."
            });
        }

        const normalizedEmail=email.trim().toLowerCase();

        const client=await Client.findOne({
            email:normalizedEmail
        });

        if(!client){
            return res.status(404).json({
                success:false,
                message:"No client account was found with this email address."
            });
        }

        if(
            !client.emailOtpExpires||
            client.emailOtpExpires.getTime()<Date.now()
        ){
            return res.status(400).json({
                success:false,
                message:"The verification code has expired. Please request a new OTP."
            });
        }

        if(
            !client.emailOtpHash||
            client.emailOtpHash!==hashOTP(otp)
        ){
            return res.status(400).json({
                success:false,
                message:"The verification code is incorrect."
            });
        }

        client.emailOtpHash=null;
        client.emailOtpExpires=null;
        client.emailVerified=true;

        await client.save();

        return res.status(200).json({
            success:true,
            message:"Your email has been successfully verified."
        });

    }catch(error){
        next(error);
    }
};

const resendClientEmailOTP=async(req,res,next)=>{
    try{
        const{email}=req.body;

        if(
            typeof email!=="string"||
            !email.trim()
        ){
            return res.status(400).json({
                success:false,
                message:"A valid email address is required."
            });
        }

        const normalizedEmail=email.trim().toLowerCase();

        const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailPattern.test(normalizedEmail)){
            return res.status(400).json({
                success:false,
                message:"Please provide a valid email address."
            });
        }

        const client=await Client.findOne({
            email:normalizedEmail
        });

        if(!client){
            return res.status(404).json({
                success:false,
                message:"No client account was found with this email address."
            });
        }

        if(client.emailVerified){
            return res.status(400).json({
                success:false,
                message:"This email address has already been verified."
            });
        }

        if(!client.emailOtpResendAttempts){
            client.emailOtpResendAttempts={
                emailOtpResendCount:0,
                coolDownUntil:null
            };
        }

        const attempts=client.emailOtpResendAttempts;
        const now=Date.now();

        if(
            attempts.coolDownUntil&&
            new Date(attempts.coolDownUntil).getTime()>now
        ){
            return res.status(429).json({
                success:false,
                message:"You have reached the maximum number of resend attempts.",
                coolDownUntil:new Date(attempts.coolDownUntil).toISOString()
            });
        }

        if(
            attempts.coolDownUntil&&
            new Date(attempts.coolDownUntil).getTime()<=now
        ){
            attempts.coolDownUntil=null;
            attempts.emailOtpResendCount=0;
        }

        if(attempts.emailOtpResendCount>=MAX_RESENDS){
            attempts.coolDownUntil=new Date(now+COOLDOWN_MS);

            await client.save();

            return res.status(429).json({
                success:false,
                message:"You have reached the maximum number of resend attempts.",
                coolDownUntil:attempts.coolDownUntil.toISOString()
            });
        }

        attempts.emailOtpResendCount+=1;

        await client.save();

        const otp=generateOTP();

        await sendOTPEmail(normalizedEmail,otp);

        client.emailOtpHash=hashOTP(otp);
        client.emailOtpExpires=new Date(Date.now()+OTP_EXPIRY_MS);

        await client.save();

        return res.status(200).json({
            success:true,
            message:"Verification code has been sent to your email."
        });

    }catch(error){
        next(error);
    }
};

module.exports={
    verifyClientEmailOTP,
    resendClientEmailOTP
};