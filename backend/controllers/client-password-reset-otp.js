const Client=require("../models/client");
const {BrevoClient}=require("@getbrevo/brevo");

const sendOTPEmail=async(email,otp)=>{
    const brevo=new BrevoClient({
        apiKey:process.env.BREVO_API_KEY
    });

    await brevo.transactionalEmails.sendTransacEmail({
        sender:{
            email:process.env.BREVO_SENDER_EMAIL,
            name:process.env.BREVO_SENDER_NAME
        },
        to:[{email}],
        subject:"SkillConnect Password Reset OTP",
        htmlContent:`
            <div style="font-family:Arial,sans-serif">
                <h2>SkillConnect Password Reset</h2>
                <p>Your password reset verification code is:</p>
                <h1>${otp}</h1>
                <p>This code expires in 10 minutes.</p>
                <p>If you did not request a password reset, you can ignore this email.</p>
            </div>
        `
    });
};

const verifyClientPasswordResetOTP=async(req,res)=>{
    try{
        const {email,otp}=req.body;

        if(!email||!otp){
            return res.status(400).json({
                success:false,
                message:"Email and OTP are required."
            });
        }

        const client=await Client.findOne({
            email:email.toLowerCase().trim()
        });

        if(!client){
            return res.status(404).json({
                success:false,
                message:"Client account not found."
            });
        }

        if(!client.passwordResetOtp){
            return res.status(400).json({
                success:false,
                message:"No password reset OTP is available. Please request a new code."
            });
        }

        if(client.passwordResetOtp!==String(otp)){
            return res.status(400).json({
                success:false,
                message:"Invalid password reset OTP."
            });
        }

        if(
            !client.passwordResetOtpExpires||
            client.passwordResetOtpExpires.getTime()<Date.now()
        ){
            return res.status(400).json({
                success:false,
                message:"The password reset OTP has expired. Please request a new code."
            });
        }

        client.passwordResetOtp=undefined;
        client.passwordResetOtpExpires=undefined;

        client.resetAuthorizationExpires=new Date(
            Date.now()+10*60*1000
        );

        await client.save();

        return res.status(200).json({
            success:true,
            message:"Password reset OTP verified successfully."
        });

    }catch(error){
        console.error(
            "Client password reset OTP verification error:",
            error
        );

        return res.status(500).json({
            success:false,
            message:"Unable to verify password reset OTP."
        });
    }
};

const resendClientPasswordResetOTP=async(req,res)=>{
    try{
        const {email}=req.body;

        if(!email){
            return res.status(400).json({
                success:false,
                message:"Email is required."
            });
        }

        const client=await Client.findOne({
            email:email.toLowerCase().trim()
        });

        if(!client){
            return res.status(404).json({
                success:false,
                message:"Client account not found."
            });
        }

        const otp=String(
            Math.floor(100000+Math.random()*900000)
        );

        client.passwordResetOtp=otp;

        client.passwordResetOtpExpires=new Date(
            Date.now()+10*60*1000
        );

        await client.save();

        await sendOTPEmail(client.email,otp);

        return res.status(200).json({
            success:true,
            message:"A new password reset OTP has been sent to your email address."
        });

    }catch(error){
        console.error(
            "Client password reset OTP resend error:",
            error
        );

        return res.status(500).json({
            success:false,
            message:"Unable to resend password reset OTP."
        });
    }
};

module.exports={
    verifyClientPasswordResetOTP,
    resendClientPasswordResetOTP
};