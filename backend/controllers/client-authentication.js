/* CLIENT AUTHENTICATION CONTROLLER
   Handles client signup, login, forgot password and Google authentication.
   No middleware. No utility files. */

const bcrypt=require("bcryptjs");
const crypto=require("crypto");
const jwt=require("jsonwebtoken");
const Client=require("../models/client");

const signup=async(req,res)=>{
 try{
  const email=req.body.email?.trim().toLowerCase(),password=req.body.password;
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({success:false,message:"Please enter a valid email address."});
  if(!password||password.length<8)return res.status(400).json({success:false,message:"Password must be at least 8 characters."});
  if(await Client.findOne({email}))return res.status(409).json({success:false,message:"An account with this email already exists."});

  const passwordHash=await bcrypt.hash(password,12);
  const emailOtp=crypto.randomInt(100000,1000000).toString(),emailOtpExpires=new Date(Date.now()+10*60*1000);
  const client=await Client.create({email,passwordHash,isEmailVerified:false,profileCompleted:false,emailOtp,emailOtpExpires});

  const brevoResponse=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"Content-Type":"application/json","api-key":process.env.BREVO_API_KEY},body:JSON.stringify({sender:{email:process.env.BREVO_SENDER_EMAIL,name:process.env.BREVO_SENDER_NAME},to:[{email:client.email}],subject:"SkillConnect Email Verification Code",textContent:`Your SkillConnect verification code is ${emailOtp}. This code expires in 10 minutes.`})});
  if(!brevoResponse.ok){
   await Client.findByIdAndDelete(client._id);
   return res.status(500).json({success:false,message:"Unable to send the verification code. Please try again."});
  }
  return res.status(201).json({success:true,message:"Account created successfully. A verification code has been sent to your email.",email:client.email});
 }catch(error){
  console.error("Client signup error:",error);
  return res.status(500).json({success:false,message:"Unable to create your account. Please try again."});
 }
};


/* LOGIN */

const login=async(req,res)=>{
 try{
  const email=req.body.email?.trim().toLowerCase(),password=req.body.password;
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({success:false,message:"Please enter a valid email address."});
  if(!password||password.length<8)return res.status(400).json({success:false,message:"Password must be at least 8 characters."});

  const client=await Client.findOne({email});
  if(!client)return res.status(404).json({success:false,message:"No client account was found with this email."});
  if(client.googleId&&!client.passwordHash)return res.status(400).json({success:false,message:"This account was created with Google. Please continue with Google."});
  if(!await bcrypt.compare(password,client.passwordHash||""))return res.status(401).json({success:false,message:"Incorrect password."});

  if(!client.isEmailVerified){
   const emailOtp=crypto.randomInt(100000,1000000).toString();
   client.emailOtp=emailOtp;
   client.emailOtpExpires=new Date(Date.now()+10*60*1000);
   await client.save();

   const brevoResponse=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"Content-Type":"application/json","api-key":process.env.BREVO_API_KEY},body:JSON.stringify({sender:{email:process.env.BREVO_SENDER_EMAIL,name:process.env.BREVO_SENDER_NAME},to:[{email:client.email}],subject:"SkillConnect Email Verification Code",textContent:`Your SkillConnect verification code is ${emailOtp}. This code expires in 10 minutes.`})});
   if(!brevoResponse.ok)return res.status(500).json({success:false,message:"Unable to send the verification code. Please try again."});
   return res.status(200).json({success:true,requiresEmailVerification:true,message:"Your email is not verified. A new verification code has been sent to your email.",email:client.email});
  }

  if(!client.profileCompleted)return res.status(200).json({success:true,profileCompleted:false,message:"Please complete your client profile.",email:client.email});

  const accessToken=jwt.sign({userId:client._id.toString(),userType:"client"},process.env.ACCESS_TOKEN_SECRET,{expiresIn:process.env.ACCESS_TOKEN_EXPIRE});
  const refreshToken=jwt.sign({userId:client._id.toString(),userType:"client"},process.env.REFRESH_TOKEN_SECRET,{expiresIn:process.env.REFRESH_TOKEN_EXPIRE});
  client.refreshTokenHash=crypto.createHash("sha256").update(refreshToken).digest("hex");
  await client.save();

  res.cookie("refreshToken",refreshToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:process.env.NODE_ENV==="production"?"none":"lax",maxAge:7*24*60*60*1000});
  return res.status(200).json({success:true,message:"Login successful.",accessToken});
 }catch(error){
  console.error("Client login error:",error);
  return res.status(500).json({success:false,message:"Unable to login. Please try again."});
 }
};


/* FORGOT PASSWORD */

const forgotPassword=async(req,res)=>{
 try{
  const email=req.body.email?.trim().toLowerCase();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({success:false,message:"Please enter a valid email address."});

  const client=await Client.findOne({email});
  if(!client)return res.status(404).json({success:false,message:"No client account was found with this email."});

  const passwordResetOtp=crypto.randomInt(100000,1000000).toString();
  client.passwordResetOtp=passwordResetOtp;
  client.passwordResetOtpExpiry=new Date(Date.now()+10*60*1000);
  await client.save();

  const brevoResponse=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"Content-Type":"application/json","api-key":process.env.BREVO_API_KEY},body:JSON.stringify({sender:{email:process.env.BREVO_SENDER_EMAIL,name:process.env.BREVO_SENDER_NAME},to:[{email:client.email}],subject:"SkillConnect Password Reset Code",textContent:`Your SkillConnect password reset code is ${passwordResetOtp}. This code expires in 10 minutes.`})});
  if(!brevoResponse.ok)return res.status(500).json({success:false,message:"Unable to send the password reset code. Please try again."});

  return res.status(200).json({success:true,message:"A password reset code has been sent to your email.",email:client.email});
 }catch(error){
  console.error("Client forgot password error:",error);
  return res.status(500).json({success:false,message:"Unable to process your request. Please try again."});
 }
};


/* GOOGLE AUTHENTICATION */

const googleAuthentication=async(req,res)=>{
 try{
  const googleUrl=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  ["client_id","redirect_uri","response_type","scope","access_type","prompt"].forEach((key,i)=>googleUrl.searchParams.set(key,[process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_CALLBACK_URL,"code","openid email","offline","select_account"][i]));
  return res.redirect(googleUrl.toString());
 }catch(error){
  console.error("Client Google authentication error:",error);
  return res.redirect(`${process.env.FRONTEND_URL}/client-google-redirect/index.html?error=${encodeURIComponent("Unable to start Google authentication.")}`);
 }
};


/* GOOGLE CALLBACK */

const googleCallback=async(req,res)=>{
 try{
  const code=req.query.code;
  const redirect=message=>res.redirect(`${process.env.FRONTEND_URL}/client-google-redirect/index.html?error=${encodeURIComponent(message)}`);
  const codeRedirect=code=>res.redirect(`${process.env.FRONTEND_URL}/client-google-redirect/index.html?code=${encodeURIComponent(code)}`);

  if(req.query.error)return redirect("Google authentication was cancelled or failed.");
  if(!code)return redirect("Google authentication code was not received.");

  const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:process.env.GOOGLE_CLIENT_CALLBACK_URL,grant_type:"authorization_code"})});
  const tokenData=await tokenResponse.json();

  if(!tokenResponse.ok||!tokenData.access_token)return redirect("Unable to complete Google authentication.");

  const userResponse=await fetch("https://www.googleapis.com/oauth2/v2/userinfo",{headers:{Authorization:`Bearer ${tokenData.access_token}`}});
  const googleUser=await userResponse.json();

  if(!userResponse.ok||!googleUser.email||!googleUser.id)return redirect("Unable to retrieve your Google account information.");

  const email=googleUser.email.trim().toLowerCase(),googleId=googleUser.id;
  let client=await Client.findOne({email});

  if(!client){
   client=await Client.create({email,googleId,isEmailVerified:true,profileCompleted:false});
   const exchangeCode=`${Date.now()}.${crypto.randomBytes(32).toString("hex")}`;
   client.exchangeCode=exchangeCode;
   await client.save();
   return codeRedirect(exchangeCode);
  }

  if(client.passwordHash&&!client.googleId)return redirect("An account with this email already exists. Please login with your email and password.");

  if(client.googleId){
   const exchangeCode=`${Date.now()}.${crypto.randomBytes(32).toString("hex")}`;
   client.exchangeCode=exchangeCode;
   await client.save();
   return codeRedirect(exchangeCode);
  }

  return redirect("Unable to process this Google account.");
 }catch(error){
  console.error("Client Google callback error:",error);
  return res.redirect(`${process.env.FRONTEND_URL}/client-google-redirect/index.html?error=${encodeURIComponent("Google authentication failed. Please try again.")}`);
 }
};


/* GOOGLE EXCHANGE CODE */

const googleExchange=async(req,res)=>{
 try{
  const exchangeCode=req.body.exchangeCode;
  if(!exchangeCode)return res.status(400).json({success:false,message:"Google exchange code is required."});

  const client=await Client.findOne({exchangeCode});
  if(!client)return res.status(400).json({success:false,message:"The Google exchange code is invalid or has already been used."});

  const timestamp=Number(exchangeCode.split(".")[0]),fiveMinutes=5*60*1000;
  if(!timestamp||Date.now()-timestamp>fiveMinutes){
   client.exchangeCode=undefined;
   await client.save();
   return res.status(400).json({success:false,message:"The Google exchange code has expired. Please try again."});
  }

  client.exchangeCode=undefined;

  if(!client.profileCompleted){
   await client.save();
   return res.status(200).json({success:true,message:"Google authentication successful. Please complete your client profile.",email:client.email,profileCompleted:false});
  }

  const accessToken=jwt.sign({userId:client._id.toString(),userType:"client"},process.env.ACCESS_TOKEN_SECRET,{expiresIn:process.env.ACCESS_TOKEN_EXPIRE});
  const refreshToken=jwt.sign({userId:client._id.toString(),userType:"client"},process.env.REFRESH_TOKEN_SECRET,{expiresIn:process.env.REFRESH_TOKEN_EXPIRE});
  client.refreshTokenHash=await bcrypt.hash(refreshToken,12);
  await client.save();

  res.cookie("refreshToken",refreshToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:process.env.NODE_ENV==="production"?"none":"lax",maxAge:7*24*60*60*1000});
  return res.status(200).json({success:true,message:"Google login successful.",email:client.email,accessToken});
 }catch(error){
  console.error("Client Google exchange error:",error);
  return res.status(500).json({success:false,message:"Unable to complete Google authentication. Please try again."});
 }
};


module.exports={signup,login,forgotPassword,googleAuthentication,googleCallback,googleExchange};