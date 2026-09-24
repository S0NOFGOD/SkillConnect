const express=require("express");

const {
    verifyClientPasswordResetOTP,
    resendClientPasswordResetOTP
}=require("../controllers/client-password-reset-otp");

const router=express.Router();

router.post("/verify",verifyClientPasswordResetOTP);
router.post("/resend",resendClientPasswordResetOTP);

module.exports=router;