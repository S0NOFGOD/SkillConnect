const express=require("express");

const {
    verifyClientEmailOTP,
    resendClientEmailOTP
}=require("../controllers/client-email-otp");

const router=express.Router();

router.post("/verify",verifyClientEmailOTP);
router.post("/resend",resendClientEmailOTP);

module.exports=router;