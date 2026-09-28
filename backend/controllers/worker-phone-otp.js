const jwt=require("jsonwebtoken");
const crypto=require("crypto");
const {Robase}=require("@robasedev/sdk");

const Worker=require("../models/worker");

const robase=new Robase({
    apiKey:process.env.ROBASE_API_KEY
});


/* =========================================================
   HELPERS
========================================================= */

function hashOTP(otp){
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
}


function generateOTP(){
    return crypto
        .randomInt(100000,1000000)
        .toString();
}


function getAuthenticatedWorker(req){

    const accessToken=req.cookies.accessToken;

    if(!accessToken){
        const error=new Error(
            "Authentication required."
        );

        error.statusCode=401;

        throw error;
    }

    let decoded;

    try{
        decoded=jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );
    }catch(error){
        const authError=new Error(
            "Authentication session is invalid or expired."
        );

        authError.statusCode=401;

        throw authError;
    }

    if(
        !decoded.userId||
        decoded.userType!=="worker"
    ){
        const error=new Error(
            "Invalid worker authentication."
        );

        error.statusCode=401;

        throw error;
    }

    return decoded.userId;
}


function maskPhone(phone){

    if(!phone)return "";

    const visibleStart=3;
    const visibleEnd=4;

    if(phone.length<=visibleStart+visibleEnd){
        return phone;
    }

    return `${phone.slice(0,visibleStart)}****${phone.slice(-visibleEnd)}`;
}


function formatRetryTime(date){

    return date.toLocaleString(
        "en-NG",
        {
            dateStyle:"medium",
            timeStyle:"short"
        }
    );
}


/* =========================================================
   GET WORKER PHONE
========================================================= */

const getWorkerPhone=async(req,res,next)=>{

    try{

        const workerId=getAuthenticatedWorker(req);

        const worker=await Worker.findById(workerId)
            .select("phone");

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

        return res.status(200).json({
            success:true,
            phone:maskPhone(worker.phone)
        });

    }catch(error){
        next(error);
    }
};


/* =========================================================
   VERIFY WORKER PHONE
========================================================= */

const verifyWorkerPhone=async(req,res,next)=>{

    try{

        const workerId=getAuthenticatedWorker(req);

        const {otp}=req.body;

        if(
            typeof otp!=="string"||
            !/^\d{6}$/.test(otp)
        ){
            return res.status(400).json({
                success:false,
                message:"Please enter a valid 6-digit verification code."
            });
        }

        const worker=await Worker.findById(workerId)
            .select(
                "+phoneOtpHash +phoneOtpExpires phone phoneVerificationExpires"
            );

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
            worker.phoneVerificationExpires&&
            worker.phoneVerificationExpires>new Date()
        ){
            return res.status(400).json({
                success:false,
                message:"Your phone number is already verified."
            });
        }

        if(
            !worker.phoneOtpHash||
            !worker.phoneOtpExpires
        ){
            return res.status(400).json({
                success:false,
                message:"No active verification code was found. Please request a new OTP."
            });
        }

        if(worker.phoneOtpExpires<=new Date()){

            return res.status(400).json({
                success:false,
                message:"Your verification code has expired. Please request a new OTP."
            });
        }

        const submittedOTPHash=hashOTP(otp);

        if(submittedOTPHash!==worker.phoneOtpHash){

            return res.status(400).json({
                success:false,
                message:"The verification code is incorrect."
            });
        }

        const now=new Date();

        worker.phoneVerificationExpires=
            new Date(
                now.getTime()+
                30*24*60*60*1000
            );

        // Invalidate the OTP after successful verification.
        worker.phoneOtpHash=null;
        worker.phoneOtpExpires=null;

        await worker.save();

        return res.status(200).json({
            success:true,
            message:"Your phone number has been successfully verified."
        });

    }catch(error){
        next(error);
    }
};


/* =========================================================
   RESEND WORKER PHONE OTP
========================================================= */

const resendWorkerPhoneOTP=async(req,res,next)=>{

    try{

        const workerId=getAuthenticatedWorker(req);

        const worker=await Worker.findById(workerId)
            .select(
                "+phoneOtpHash +phoneOtpExpires phone phoneOtpResendLimit phoneOtpResendLimitExpires"
            );

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

        /* Check active 24-hour resend restriction. */

        if(
            worker.phoneOtpResendLimitExpires&&
            worker.phoneOtpResendLimitExpires>now
        ){

            return res.status(429).json({
                success:false,
                message:
                    `You have reached the OTP resend limit. Please try again later at ${formatRetryTime(worker.phoneOtpResendLimitExpires)}.`
            });
        }


        /* Reset expired resend restriction. */

        if(
            worker.phoneOtpResendLimitExpires&&
            worker.phoneOtpResendLimitExpires<=now
        ){

            worker.phoneOtpResendLimit=0;
            worker.phoneOtpResendLimitExpires=null;
        }


        /* Maximum of 3 successful resends. */

        if(worker.phoneOtpResendLimit>=3){

            worker.phoneOtpResendLimitExpires=
                new Date(
                    now.getTime()+
                    24*60*60*1000
                );

            await worker.save();

            return res.status(429).json({
                success:false,
                message:
                    `You have reached the OTP resend limit. Please try again later at ${formatRetryTime(worker.phoneOtpResendLimitExpires)}.`
            });
        }


        /* Generate and hash new OTP. */

        const otp=generateOTP();

        worker.phoneOtpHash=hashOTP(otp);

        worker.phoneOtpExpires=
            new Date(
                now.getTime()+
                10*60*1000
            );

        worker.phoneOtpResendLimit+=1;

        await worker.save();


        /* Send OTP through Robase. */

        try{

            await robase.sms.send({
                phone_number:worker.phone,
                message:
                    `Your SkillConnect phone verification code is ${otp}. It expires in 10 minutes.`
            });

        }catch(error){

            // Do not consume the resend attempt if SMS sending fails.
            worker.phoneOtpHash=null;
            worker.phoneOtpExpires=null;
            worker.phoneOtpResendLimit=
                Math.max(
                    0,
                    worker.phoneOtpResendLimit-1
                );

            await worker.save();

            throw error;
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