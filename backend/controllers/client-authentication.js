"use strict";

const bcrypt=require("bcryptjs");
const crypto=require("crypto");
const jwt=require("jsonwebtoken");
const Client=require("../models/client");
const {BrevoClient}=require("@getbrevo/brevo");

const OTP_EXPIRY_MINUTES=10;
const MAX_RESENDS=4;
const EMAIL_COOLDOWN_MS=30*24*60*60*1000;
const RESET_COOLDOWN_MS=24*60*60*1000;

const generateOTP=()=>crypto.randomInt(100000,1000000).toString();
const hashOTP=otp=>crypto.createHash("sha256").update(otp).digest("hex");
const hashToken=token=>crypto.createHash("sha256").update(token).digest("hex");
const createOTPExpiry=()=>new Date(Date.now()+OTP_EXPIRY_MINUTES*60*1000);
const isValidEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sendOTPEmail=async(email,otp,subject,textContent)=>{
    const brevo=new BrevoClient({apiKey:process.env.BREVO_API_KEY});
    await brevo.transactionalEmails.sendTransacEmail({
        sender:{
            email:process.env.BREVO_SENDER_EMAIL,
            name:process.env.BREVO_SENDER_NAME
        },
        to:[{email}],
        subject,
        textContent
    });
};

const createTokens=async client=>{
    const accessToken=jwt.sign(
        {userId:client._id.toString(),userType:"client"},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:process.env.ACCESS_TOKEN_EXPIRE}
    );

    const refreshToken=jwt.sign(
        {userId:client._id.toString(),userType:"client"},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRE}
    );

    client.refreshTokenHash=hashToken(refreshToken);
    await client.save();

    return {accessToken,refreshToken};
};

const setAuthCookies=(res,accessToken,refreshToken)=>{
    const production=process.env.NODE_ENV==="production";

    res.cookie("accessToken",accessToken,{
        httpOnly:true,secure:production,
        sameSite:production?"none":"lax",
        maxAge:15*60*1000
    });

    res.cookie("refreshToken",refreshToken,{
        httpOnly:true,secure:production,
        sameSite:production?"none":"lax",
        maxAge:7*24*60*60*1000
    });
};

const authenticateClient=req=>{
    const accessToken=req.cookies?.accessToken;

    if(!accessToken)return {
        valid:false,status:401,message:"Authentication required."
    };

    try{
        const decoded=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET);

        if(decoded.userType!=="client")return {
            valid:false,status:403,message:"Client authentication required."
        };

        return {valid:true,userId:decoded.userId};
    }catch(error){
        return {valid:false,status:401,message:"Authentication required."};
    }
};

/* SIGNUP */

const signup=async(req,res)=>{
    try{
        const email=req.body.email?.trim().toLowerCase();
        const {password,confirmPassword,termsAccepted}=req.body;

        if(!email||!isValidEmail(email))return res.status(400).json({
            success:false,message:"Please enter a valid email address."
        });

        if(typeof password!=="string"||password.length<8)return res.status(400).json({
            success:false,message:"Password must be at least 8 characters."
        });

        if(typeof confirmPassword!=="string"||!confirmPassword)return res.status(400).json({
            success:false,message:"Please confirm your password."
        });

        if(password!==confirmPassword)return res.status(400).json({
            success:false,message:"Passwords do not match."
        });

        if(termsAccepted!==true)return res.status(400).json({
            success:false,message:"You must agree to the Terms and Privacy Policy."
        });

        if(await Client.findOne({email}))return res.status(409).json({
            success:false,message:"An account with this email already exists."
        });

        const passwordHash=await bcrypt.hash(password,12);
        const otp=generateOTP();

        const client=await Client.create({
            email,passwordHash,accountType:"password",
            emailVerified:false,profileCompleted:false,
            emailOtpHash:hashOTP(otp),emailOtpExpires:createOTPExpiry()
        });

        try{
            await sendOTPEmail(
                email,otp,"SkillConnect Email Verification Code",
                `Your SkillConnect verification code is ${otp}. This code expires in 10 minutes.`
            );
        }catch(error){
            await Client.findByIdAndDelete(client._id);
            console.error("Client signup email error:",error);
            return res.status(500).json({
                success:false,message:"Unable to send the verification code. Please try again."
            });
        }

        return res.status(201).json({
            success:true,
            message:"Account created successfully. A verification code has been sent to your email.",
            email:client.email
        });
    }catch(error){
        console.error("Client signup error:",error);
        return res.status(500).json({
            success:false,message:"Unable to create your account. Please try again."
        });
    }
};

/* LOGIN */

const login=async(req,res)=>{
    try{
        const email=req.body.email?.trim().toLowerCase();
        const password=req.body.password;

        if(!email||!isValidEmail(email))return res.status(400).json({
            success:false,message:"Please enter a valid email address."
        });

        if(typeof password!=="string"||!password)return res.status(400).json({
            success:false,message:"Please enter your password."
        });

        const client=await Client.findOne({email}).select("+passwordHash");

        if(!client)return res.status(404).json({
            success:false,message:"No client account was found with this email."
        });

        if(client.accountType==="googleId")return res.status(400).json({
            success:false,message:"This account was created with Google. Please continue with Google."
        });

        if(!await bcrypt.compare(password,client.passwordHash||""))return res.status(401).json({
            success:false,message:"Incorrect password."
        });

        /* EMAIL VERIFICATION AND RESEND COOLDOWN */

        if(!client.emailVerified){
            const attempts=client.emailOtpResendAttempts;
            const now=Date.now();

            if(attempts.coolDownUntil&&attempts.coolDownUntil.getTime()>now){
                return res.status(429).json({
                    success:false,
                    message:"Email verification is temporarily locked.",
                    coolDownUntil:attempts.coolDownUntil
                });
            }

            if(attempts.coolDownUntil&&attempts.coolDownUntil.getTime()<=now){
                attempts.coolDownUntil=null;
                attempts.emailOtpResendCount=0;
            }

            if(attempts.emailOtpResendCount>=MAX_RESENDS){
                attempts.emailOtpResendCount=0;
                attempts.coolDownUntil=new Date(now+EMAIL_COOLDOWN_MS);
                await client.save();

                return res.status(429).json({
                    success:false,
                    message:"Email verification is locked for 30 days because the resend limit was reached.",
                    coolDownUntil:attempts.coolDownUntil
                });
            }

            const otp=generateOTP();
            attempts.emailOtpResendCount+=1;
            client.emailOtpHash=hashOTP(otp);
            client.emailOtpExpires=createOTPExpiry();
            await client.save();

            try{
                await sendOTPEmail(
                    email,otp,"SkillConnect Email Verification Code",
                    `Your SkillConnect verification code is ${otp}. This code expires in 10 minutes.`
                );
            }catch(error){
                console.error("Client verification email error:",error);
                return res.status(500).json({
                    success:false,message:"Unable to send the verification code. Please try again."
                });
            }

            return res.status(200).json({
                success:true,requiresEmailVerification:true,
                message:"Your email is not verified. A new verification code has been sent to your email.",
                email:client.email
            });
        }

        if(!client.profileCompleted)return res.status(200).json({
            success:true,profileCompleted:false,
            message:"Please complete your client profile.",
            email:client.email
        });

        const {accessToken,refreshToken}=await createTokens(client);
        setAuthCookies(res,accessToken,refreshToken);

        return res.status(200).json({
            success:true,profileCompleted:true,
            message:`Welcome back, ${client.fullName||"Client"}!`,
            fullName:client.fullName,email:client.email
        });
    }catch(error){
        console.error("Client login error:",error);
        return res.status(500).json({
            success:false,message:"Unable to login. Please try again."
        });
    }
};

/* FORGOT PASSWORD: REQUEST RESET OTP */

const forgotPassword=async(req,res)=>{
    try{
        const email=req.body.email?.trim().toLowerCase();

        if(!email||!isValidEmail(email))return res.status(400).json({
            success:false,message:"Please enter a valid email address."
        });

        const client=await Client.findOne({email});

        if(!client)return res.status(404).json({
            success:false,message:"No client account was found with this email."
        });

        const attempts=client.passwordResetOtpResendAttempts;
        const now=Date.now();

        if(attempts.coolDownUntil&&attempts.coolDownUntil.getTime()>now){
            return res.status(429).json({
                success:false,
                message:"Password reset requests are temporarily locked.",
                coolDownUntil:attempts.coolDownUntil
            });
        }

        if(attempts.coolDownUntil&&attempts.coolDownUntil.getTime()<=now){
            attempts.coolDownUntil=null;
            attempts.passwordResetOtpResendCount=0;
        }

        if(attempts.passwordResetOtpResendCount>=MAX_RESENDS){
            attempts.passwordResetOtpResendCount=0;
            attempts.coolDownUntil=new Date(now+RESET_COOLDOWN_MS);
            await client.save();

            return res.status(429).json({
                success:false,
                message:"Password reset requests are locked for 24 hours because the resend limit was reached.",
                coolDownUntil:attempts.coolDownUntil
            });
        }

        const otp=generateOTP();
        attempts.passwordResetOtpResendCount+=1;
        client.passwordResetOtpHash=hashOTP(otp);
        client.passwordResetOtpExpires=createOTPExpiry();
        await client.save();

        try{
            await sendOTPEmail(
                email,otp,"SkillConnect Password Reset Code",
                `Your SkillConnect password reset code is ${otp}. This code expires in 10 minutes.`
            );
        }catch(error){
            console.error("Client password reset email error:",error);
            return res.status(500).json({
                success:false,message:"Unable to send the password reset code. Please try again."
            });
        }

        return res.status(200).json({
            success:true,
            message:"A password reset code has been sent to your email.",
            email:client.email
        });
    }catch(error){
        console.error("Client forgot password error:",error);
        return res.status(500).json({
            success:false,message:"Unable to process your request. Please try again."
        });
    }
};

/* START GOOGLE AUTHENTICATION */

const googleAuthentication=async(req,res)=>{
    try{
        if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_CALLBACK_URL){
            throw new Error("Google OAuth configuration is missing.");
        }

        const googleUrl=new URL("https://accounts.google.com/o/oauth2/v2/auth");

        [
            ["client_id",process.env.GOOGLE_CLIENT_ID],
            ["redirect_uri",process.env.GOOGLE_CLIENT_CALLBACK_URL],
            ["response_type","code"],
            ["scope","openid email"],
            ["access_type","online"],
            ["prompt","select_account"]
        ].forEach(([key,value])=>googleUrl.searchParams.set(key,value));

        return res.redirect(googleUrl.toString());
    }catch(error){
        console.error("Client Google authentication error:",error);
        return res.redirect(
            `${process.env.FRONTEND_URL}/client-google-redirect/index.html?error=${encodeURIComponent("Unable to start Google authentication.")}`
        );
    }
};

/* GOOGLE CALLBACK */

const googleCallback=async(req,res)=>{
    const frontendRedirect=message=>res.redirect(
        `${process.env.FRONTEND_URL}/client-google-redirect/index.html?error=${encodeURIComponent(message)}`
    );

    const codeRedirect=code=>res.redirect(
        `${process.env.FRONTEND_URL}/client-google-redirect/index.html?code=${encodeURIComponent(code)}`
    );

    try{
        if(req.query.error)return frontendRedirect("Google authentication was cancelled or failed.");
        if(!req.query.code)return frontendRedirect("Google authentication code was not received.");

        const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{
            method:"POST",
            headers:{"Content-Type":"application/x-www-form-urlencoded"},
            body:new URLSearchParams({
                code:req.query.code,
                client_id:process.env.GOOGLE_CLIENT_ID,
                client_secret:process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri:process.env.GOOGLE_CLIENT_CALLBACK_URL,
                grant_type:"authorization_code"
            })
        });

        const tokenData=await tokenResponse.json();

        if(!tokenResponse.ok||!tokenData.access_token){
            return frontendRedirect("Unable to complete Google authentication.");
        }

        const userResponse=await fetch("https://www.googleapis.com/oauth2/v2/userinfo",{
            headers:{Authorization:`Bearer ${tokenData.access_token}`}
        });

        const googleUser=await userResponse.json();

        if(!userResponse.ok||!googleUser.email||!googleUser.id||googleUser.verified_email===false){
            return frontendRedirect("Unable to verify your Google account information.");
        }

        const email=googleUser.email.trim().toLowerCase();
        const googleId=googleUser.id;
        let client=await Client.findOne({email});

        if(!client){
            client=await Client.create({
                email,googleId,accountType:"googleId",
                emailVerified:true,profileCompleted:false
            });
        }else{
            if(client.accountType==="password"||client.passwordHash){
                return frontendRedirect(
                    "An account with this email already exists. Please login with your email and password."
                );
            }

            if(client.accountType!=="googleId"||client.googleId!==googleId){
                return frontendRedirect("Unable to verify this Google account.");
            }
        }

        const exchangeCode=`${Date.now()}.${crypto.randomBytes(32).toString("hex")}`;
        client.exchangeCode=exchangeCode;
        await client.save();

        return codeRedirect(exchangeCode);
    }catch(error){
        console.error("Client Google callback error:",error);
        return frontendRedirect("Google authentication failed. Please try again.");
    }
};

/* GOOGLE EXCHANGE: ONE-TIME CODE */

const googleExchange=async(req,res)=>{
    try{
        const exchangeCode=req.body.exchangeCode;

        if(typeof exchangeCode!=="string"||!exchangeCode){
            return res.status(400).json({
                success:false,message:"Google exchange code is required."
            });
        }

        /* Atomically consume the code so it cannot be reused. */
        const client=await Client.findOneAndUpdate(
            {exchangeCode},
            {$set:{exchangeCode:null}},
            {new:true}
        );

        if(!client)return res.status(400).json({
            success:false,
            message:"The Google exchange code is invalid or has already been used."
        });

        const timestamp=Number(exchangeCode.split(".")[0]);
        const age=Date.now()-timestamp;

        if(!Number.isFinite(timestamp)||timestamp<=0||age<0||age>5*60*1000){
            return res.status(400).json({
                success:false,message:"The Google exchange code has expired. Please try again."
            });
        }

        if(client.accountType!=="googleId"||!client.googleId){
            return res.status(400).json({
                success:false,message:"This account is not configured for Google authentication."
            });
        }

        if(!client.profileCompleted){
            return res.status(200).json({
                success:true,
                message:"Google authentication successful. Please complete your client profile.",
                email:client.email,profileCompleted:false
            });
        }

        const {accessToken,refreshToken}=await createTokens(client);
        setAuthCookies(res,accessToken,refreshToken);

        return res.status(200).json({
            success:true,
            message:`Welcome back, ${client.fullName||"Client"}!`,
            fullName:client.fullName,email:client.email,
            profileCompleted:true
        });
    }catch(error){
        console.error("Client Google exchange error:",error);
        return res.status(500).json({
            success:false,message:"Unable to complete Google authentication. Please try again."
        });
    }
};

module.exports={
    signup,
    login,
    forgotPassword,
    googleAuthentication,
    googleCallback,
    googleExchange,
    authenticateClient
};