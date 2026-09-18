/* 1. IMPORT DEPENDENCIES */
const crypto=require("crypto");

/* 2. OTP CONFIGURATION */
const OTP_EXPIRY_MINUTES=10;

/* 3. GENERATE OTP */
const generateOTP=()=>{
return crypto.randomInt(100000,1000000).toString();
};

/* 4. GENERATE OTP EXPIRATION */
const createOTPExpiry=()=>{
return new Date(Date.now()+OTP_EXPIRY_MINUTES*60*1000);
};

/* 5. GENERATE OTP DATA */
const generateOTPData=()=>{
const otp=generateOTP();
const expiresAt=createOTPExpiry();
return{otp,expiresAt};
};

/* 6. EXPORT */
module.exports={
generateOTP,
createOTPExpiry,
generateOTPData
};