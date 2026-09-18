/* 1. IMPORTS */
const axios=require("axios");

const{TERMII_API_KEY,TERMII_BASE_URL}=
    require("../config/termii");

/* 2. SEND PHONE OTP */
const sendPhoneOtp=async(phone,otp)=>{

    /* Validate phone number */
    if(!phone){
        throw new Error("Phone number is required.");
    }

    /* Validate OTP */
    if(!otp){
        throw new Error("OTP is required.");
    }

    /* Validate Termii API key */
    if(!TERMII_API_KEY){
        throw new Error("TERMII_API_KEY is not configured.");
    }

    /* Validate Termii base URL */
    if(!TERMII_BASE_URL){
        throw new Error("TERMII_BASE_URL is not configured.");
    }

    /* Create SMS message */
    const message=
        `Your SkillConnect verification code is ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;

    /* Send SMS through Termii */
    const response=await axios.post(
        `${TERMII_BASE_URL}/api/sms/send`,
        {
            to:phone,
            from:"Termii",
            sms:message,
            type:"plain",
            channel:"dnd",
            api_key:TERMII_API_KEY
        },
        {
            headers:{
                "Content-Type":"application/json"
            }
        }
    );

    /* Log Termii response */
    console.log("Termii SMS response:",response.data);

    /* Return success */
    return{
        success:true,
        phone:phone,
        response:response.data
    };
};

/* 3. EXPORT */
module.exports=sendPhoneOtp;