const Client=require("../models/client");

const generateOTP=()=>{
    return Math.floor(100000+Math.random()*900000).toString();
};

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
                    name:process.env.BREVO_SENDER_NAME
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

        const error=new Error(errorMessage);
        error.statusCode=500;
        throw error;
    }
};


/* VERIFY CLIENT EMAIL OTP */

const verifyClientEmailOTP=async(req,res,next)=>{
    try{
        const {email,otp}=req.body;

        if(!email||!otp){
            return res.status(400).json({
                success:false,
                message:"Email and OTP are required."
            });
        }

        const client=await Client.findOne({
            email:email.trim().toLowerCase()
        });

        if(!client){
            return res.status(404).json({
                success:false,
                message:"No client account was found with this email address."
            });
        }

        if(client.emailOtp!==otp){
            return res.status(400).json({
                success:false,
                message:"The verification code is incorrect."
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

        client.isEmailVerified=true;
        client.emailOtp=undefined;
        client.emailOtpExpires=undefined;

        await client.save();

        return res.status(200).json({
            success:true,
            message:"Your email has been successfully verified."
        });

    }catch(error){
        next(error);
    }
};


/* RESEND CLIENT EMAIL OTP */

const resendClientEmailOTP=async(req,res,next)=>{
    try{
        const {email}=req.body;

        if(!email){
            return res.status(400).json({
                success:false,
                message:"Email is required."
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

        const otp=generateOTP();
        const expiresAt=new Date(
            Date.now()+10*60*1000
        );

        client.emailOtp=otp;
        client.emailOtpExpires=expiresAt;

        await client.save();

        try{
            await sendOTPEmail(normalizedEmail,otp);
        }catch(error){
            client.emailOtp=undefined;
            client.emailOtpExpires=undefined;

            await client.save();

            throw error;
        }

        return res.status(200).json({
            success:true,
            message:"A new verification code has been sent to your email."
        });

    }catch(error){
        next(error);
    }
};


module.exports={
    verifyClientEmailOTP,
    resendClientEmailOTP
};