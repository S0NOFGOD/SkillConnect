/* =========================================================
   IMPORT EXPRESS
========================================================= */

const express =
    require("express");


/* =========================================================
   CREATE ROUTER
========================================================= */

const router =
    express.Router();


/* =========================================================
   IMPORT WORKER EMAIL OTP CONTROLLER
========================================================= */

/*
    The controller contains the actual business logic
    for email OTP verification and resending.
*/

const workerEmailOTPController =
    require("../controllers/worker-email-otp");


/* =========================================================
   VERIFY EMAIL OTP
========================================================= */

router.post(

    "/verify",

    workerEmailOTPController.verifyEmailOTP

);


/* =========================================================
   RESEND EMAIL OTP
========================================================= */

router.post(

    "/resend",

    workerEmailOTPController.resendEmailOTP

);


/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports =
    router;