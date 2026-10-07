const bcrypt=require("bcrypt");
const crypto=require("crypto");
const https=require("https");
const jwt=require("jsonwebtoken");
const Worker=require("../models/worker");

const BREVO_API_KEY=process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL=process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME=process.env.BREVO_SENDER_NAME||"SkillConnect";
const OTP_EXPIRY_MINUTES=10;

const generateOTP=()=>crypto.randomInt(100000,1000000).toString();
const hashOTP=otp=>crypto.createHash("sha256").update(otp).digest("hex");
const createOTPExpiry=()=>new Date(Date.now()+OTP_EXPIRY_MINUTES*60*1000);
const generateOTPData=()=>{const otp=generateOTP();return{otp,expiresAt:createOTPExpiry()};};
const generateGoogleExchangeCode=()=>crypto.randomBytes(32).toString("hex");

const sendEmail=async({to,subject,htmlContent})=>{
if(!to||!subject||!htmlContent)throw new Error("Email data is required.");
if(!BREVO_API_KEY||!BREVO_SENDER_EMAIL)throw new Error("Brevo configuration is missing.");

const data=JSON.stringify({
sender:{name:BREVO_SENDER_NAME,email:BREVO_SENDER_EMAIL},
to:[{email:to}],
subject,
htmlContent
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
}},response=>{
let responseData="";
response.on("data",chunk=>responseData+=chunk);
response.on("end",()=>{
if(response.statusCode>=200&&response.statusCode<300)return resolve({success:true,data:responseData});
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
}else throw new Error("Invalid OTP email type.");

const htmlContent=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;"><h2>${title}</h2><p>${message}</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;margin:20px 0;background:#f5f5f5;border-radius:8px;">${otp}</div><p>This code expires in 10 minutes.</p><p>If you did not request this code, you can safely ignore this email.</p><p>— SkillConnect</p></div>`;

return sendEmail({to:email,subject,htmlContent});
};

const generateAccessToken=({userId,userType})=>jwt.sign(
{userId,userType},
process.env.ACCESS_TOKEN_SECRET,
{expiresIn:process.env.ACCESS_TOKEN_EXPIRE||"15m"}
);

const generateRefreshToken=({userId,userType})=>jwt.sign(
{userId,userType},
process.env.REFRESH_TOKEN_SECRET,
{expiresIn:process.env.REFRESH_TOKEN_EXPIRE||"7d"}
);

const hashRefreshToken=token=>crypto.createHash("sha256").update(token).digest("hex");

const generateTokens=async({userId,userType})=>{
const accessToken=generateAccessToken({userId,userType});
const refreshToken=generateRefreshToken({userId,userType});
const refreshTokenHash=hashRefreshToken(refreshToken);

await Worker.findByIdAndUpdate(userId,{refreshTokenHash});

return{accessToken,refreshToken};
};

const setAuthCookies=(res,accessToken,refreshToken)=>{
const production=process.env.NODE_ENV==="production";

res.cookie("accessToken",accessToken,{
httpOnly:true,
secure:production,
sameSite:production?"none":"lax",
maxAge:15*60*1000,
path:"/"
});

res.cookie("refreshToken",refreshToken,{
httpOnly:true,
secure:production,
sameSite:production?"none":"lax",
maxAge:7*24*60*60*1000,
path:"/"
});
};

const authenticateWorker=req=>{
const accessToken=req.cookies?.accessToken;

if(!accessToken)return{valid:false,status:401,message:"Authentication required."};

try{
const decoded=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET);

if(decoded.userType!=="worker")
return{valid:false,status:403,message:"Worker authentication required."};

return{valid:true,userId:decoded.userId};
}catch(error){
return{valid:false,status:401,message:"Authentication required."};
}
};

/* SIGN UP */

const signupWorker=async(req,res)=>{
try{
const{email,password,confirmPassword,termsAccepted}=req.body;

if(!email||!password||!confirmPassword||termsAccepted===undefined)
return res.status(400).json({success:false,message:"Email, password, confirm password, and terms and privacy agreement are required."});

const normalizedEmail=email.trim().toLowerCase();

if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
return res.status(400).json({success:false,message:"Please enter a valid email address."});

if(password.length<8)
return res.status(400).json({success:false,message:"Password must be at least 8 characters."});

if(password!==confirmPassword)
return res.status(400).json({success:false,message:"Passwords do not match."});

if(termsAccepted!==true)
return res.status(400).json({success:false,message:"You must agree to the Terms and Privacy Policy."});

const existingWorker=await Worker.findOne({email:normalizedEmail});

if(existingWorker)
return res.status(400).json({success:false,message:"An account with this email already exists."});

const passwordHash=await bcrypt.hash(password,10);

const worker=await Worker.create({
email:normalizedEmail,
passwordHash,
accountType:"password",
emailVerified:false,
profileCompleted:false
});

const{otp,expiresAt}=generateOTPData();

await sendOTPEmail({
email:worker.email,
otp,
type:"email-verification"
});

worker.emailOtpHash=hashOTP(otp);
worker.emailOtpExpires=expiresAt;

await worker.save();

return res.status(201).json({
success:true,
message:"Worker account created successfully. A verification code has been sent to your email.",
email:worker.email,
nextStep:"email-verification"
});

}catch(error){
console.error("Worker signup error:",error);
return res.status(500).json({success:false,message:"An error occurred while creating your worker account."});
}
};

/* LOGIN */

const loginWorker=async(req,res)=>{
try{
const{email,password}=req.body;

if(!email||!password)
return res.status(400).json({success:false,message:"Email and password are required."});

const normalizedEmail=email.trim().toLowerCase();

const worker=await Worker.findOne({email:normalizedEmail}).select("+passwordHash");

if(!worker)
return res.status(401).json({success:false,message:"Invalid email or password."});

if(worker.accountType==="googleId")
return res.status(400).json({
success:false,
message:"This account uses Google authentication. Please continue with Google."
});

const passwordMatch=await bcrypt.compare(password,worker.passwordHash);

if(!passwordMatch)
return res.status(401).json({success:false,message:"Invalid email or password."});

if(!worker.emailVerified){
const{otp,expiresAt}=generateOTPData();

await sendOTPEmail({
email:worker.email,
otp,
type:"email-verification"
});

worker.emailOtpHash=hashOTP(otp);
worker.emailOtpExpires=expiresAt;

await worker.save();

return res.status(200).json({
success:true,
message:"A new verification code has been sent to your email.",
email:worker.email,
nextStep:"email-verification"
});
}

if(!worker.profileCompleted)
return res.status(200).json({
success:true,
message:"Please complete your worker profile.",
email:worker.email,
nextStep:"profile"
});

const{accessToken,refreshToken}=await generateTokens({
userId:worker._id,
userType:"worker"
});

setAuthCookies(res,accessToken,refreshToken);

return res.status(200).json({
success:true,
message:`Welcome back, ${worker.fullName}.`,
email:worker.email,
fullName:worker.fullName,
nextStep:"authenticated"
});

}catch(error){
console.error("Worker login error:",error);
return res.status(500).json({success:false,message:"An error occurred while logging in."});
}
};

/* FORGOT PASSWORD */

const forgotPassword=async(req,res)=>{
try{
const{email}=req.body;

if(!email)
return res.status(400).json({success:false,message:"Email is required."});

const normalizedEmail=email.trim().toLowerCase();

const worker=await Worker.findOne({email:normalizedEmail});

if(!worker)
return res.status(404).json({
success:false,
message:"No worker account was found with this email address."
});

if(worker.accountType==="googleId")
return res.status(400).json({
success:false,
message:"This account uses Google authentication. Please continue with Google."
});

const{otp,expiresAt}=generateOTPData();

await sendOTPEmail({
email:worker.email,
otp,
type:"password-reset"
});

worker.passwordResetOtpHash=hashOTP(otp);
worker.passwordResetOtpExpires=expiresAt;
worker.passwordResetVerified=false;
worker.passwordResetVerifiedAt=null;
worker.resetAuthorizationExpires=null;

await worker.save();

return res.status(200).json({
success:true,
email:worker.email,
message:"Verification code has been sent to your email."
});

}catch(error){
console.error("Worker forgot password error:",error);
return res.status(500).json({
success:false,
message:"An error occurred while processing your password reset request."
});
}
};

/* GOOGLE START */

const googleAuthentication=async(req,res)=>{
try{
const googleUrl=new URL("https://accounts.google.com/o/oauth2/v2/auth");

googleUrl.searchParams.set("client_id",process.env.GOOGLE_CLIENT_ID);
googleUrl.searchParams.set("redirect_uri",process.env.GOOGLE_CALLBACK_URL);
googleUrl.searchParams.set("response_type","code");
googleUrl.searchParams.set("scope","openid email profile");
googleUrl.searchParams.set("access_type","offline");
googleUrl.searchParams.set("prompt","select_account");

return res.redirect(googleUrl.toString());

}catch(error){
console.error("Worker Google authentication error:",error);
return res.redirect(`${process.env.FRONTEND_URL}/worker-google-redirect/index.html?error=${encodeURIComponent("Unable to start Google authentication.")}`);
}
};

/* GOOGLE CALLBACK */

const googleCallback=async(req,res)=>{
try{
const code=req.query.code;

const errorRedirect=message=>res.redirect(
`${process.env.FRONTEND_URL}/worker-google-redirect/index.html?error=${encodeURIComponent(message)}`
);

const codeRedirect=code=>res.redirect(
`${process.env.FRONTEND_URL}/worker-google-redirect/index.html?code=${encodeURIComponent(code)}`
);

if(req.query.error)
return errorRedirect("Google authentication was cancelled or failed.");

if(!code)
return errorRedirect("Google authentication code was not received.");

const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{
method:"POST",
headers:{"Content-Type":"application/x-www-form-urlencoded"},
body:new URLSearchParams({
code,
client_id:process.env.GOOGLE_CLIENT_ID,
client_secret:process.env.GOOGLE_CLIENT_SECRET,
redirect_uri:process.env.GOOGLE_CALLBACK_URL,
grant_type:"authorization_code"
})
});

const tokenData=await tokenResponse.json();

if(!tokenResponse.ok||!tokenData.access_token)
return errorRedirect("Unable to complete Google authentication.");

const userResponse=await fetch("https://www.googleapis.com/oauth2/v2/userinfo",{
headers:{Authorization:`Bearer ${tokenData.access_token}`}
});

const googleUser=await userResponse.json();

if(!userResponse.ok||!googleUser.email||!googleUser.id)
return errorRedirect("Unable to retrieve your Google account information.");

const googleEmail=googleUser.email.trim().toLowerCase();
const googleId=String(googleUser.id);

let worker=await Worker.findOne({email:googleEmail}).select("+googleExchangeCode");

if(worker&&worker.accountType==="password")
return errorRedirect("password-account");

if(!worker){
worker=await Worker.create({
email:googleEmail,
googleId,
accountType:"googleId",
emailVerified:true,
profileCompleted:false
});
}else{
worker.googleId=googleId;
}

const exchangeCode=generateGoogleExchangeCode();

worker.googleExchangeCode=exchangeCode;

await worker.save();

return codeRedirect(exchangeCode);

}catch(error){
console.error("Worker Google callback error:",error);
return res.redirect(`${process.env.FRONTEND_URL}/worker-google-redirect/index.html?error=google-authentication-failed`);
}
};

/* GOOGLE EXCHANGE */

const exchangeGoogleCode=async(req,res)=>{
try{
const{code}=req.body;

if(!code)
return res.status(400).json({success:false,message:"Google exchange code is required."});

const worker=await Worker.findOne({
googleExchangeCode:code
}).select("+googleExchangeCode +refreshTokenHash");

if(!worker)
return res.status(401).json({success:false,message:"Invalid Google exchange code."});

worker.googleExchangeCode=null;

if(worker.accountType==="password"){
await worker.save();

return res.status(400).json({
success:false,
message:"This account uses password authentication. Please log in with your password.",
nextStep:"login-required"
});
}

if(!worker.profileCompleted){
await worker.save();

return res.status(200).json({
success:true,
message:"Google authentication successful. Please complete your worker profile.",
email:worker.email,
nextStep:"profile"
});
}

const{accessToken,refreshToken}=await generateTokens({
userId:worker._id,
userType:"worker"
});

await worker.save();

setAuthCookies(res,accessToken,refreshToken);

return res.status(200).json({
success:true,
message:`Welcome back, ${worker.fullName}.`,
email:worker.email,
fullName:worker.fullName,
nextStep:"authenticated"
});

}catch(error){
console.error("Worker Google exchange error:",error);
return res.status(500).json({
success:false,
message:"An error occurred while completing Google authentication."
});
}
};

module.exports={
signupWorker,
loginWorker,
forgotPassword,
googleAuthentication,
googleCallback,
exchangeGoogleCode,
authenticateWorker
};