const express=require("express");

const {
    getWorkerPhone,
    verifyWorkerPhone,
    resendWorkerPhoneOTP
}=require("../controllers/worker-phone-otp");

const router=express.Router();

router.get(
    "/phone-otp",
    getWorkerPhone
);

router.post(
    "/verify-phone",
    verifyWorkerPhone
);

router.post(
    "/resend-phone-otp",
    resendWorkerPhoneOTP
);

module.exports=router;