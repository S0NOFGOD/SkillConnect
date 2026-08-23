/* =========================================================
   1. IMPORT EXPRESS
========================================================= */

const express =
    require("express");


/* =========================================================
   2. CREATE ROUTER
========================================================= */

const router =
    express.Router();


/* =========================================================
   3. IMPORT CLIENT EMAIL OTP CONTROLLER
========================================================= */

const {

    verifyClientEmailOTP,

    resendClientEmailOTP

} =
    require("../controllers/client-email-otp");


/* =========================================================
   4. VERIFY CLIENT EMAIL OTP
========================================================= */

router.post(

    "/email-otp/verify",

    verifyClientEmailOTP

);


/* =========================================================
   5. RESEND CLIENT EMAIL OTP
========================================================= */

router.post(

    "/email-otp/resend",

    resendClientEmailOTP

);


/* =========================================================
   6. EXPORT ROUTER
========================================================= */

module.exports =
    router;