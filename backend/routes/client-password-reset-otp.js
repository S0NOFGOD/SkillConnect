/* =========================================================
   1. IMPORT EXPRESS
========================================================= */

/*
   Express Router allows us to create
   separate route files for different
   parts of the application.
*/

const express =
    require("express");



/* =========================================================
   2. CREATE ROUTER
========================================================= */

/*
   This router will contain all
   Client Password Reset OTP routes.
*/

const router =
    express.Router();



/* =========================================================
   3. IMPORT CONTROLLER
========================================================= */

/*
   The controller contains the actual logic
   for verifying and resending OTPs.
*/

const {

    verifyClientPasswordResetOTP,

    resendClientPasswordResetOTP

} =
    require(
        "../controllers/client-password-reset-otp"
    );



/* =========================================================
   4. VERIFY PASSWORD RESET OTP
========================================================= */

/*
   FRONTEND REQUEST:

   POST /api/auth/client/password-reset-otp/verify


   REQUEST BODY:

   {
       "clientEmail": "client@example.com",
       "otp": "123456"
   }


   CONTROLLER:

   verifyClientPasswordResetOTP


   FLOW:

   Client email
          ↓
   Find Client
          ↓
   Compare OTP
          ↓
   Check OTP expiry
          ↓
   Generate resetAuthorization
          ↓
   Save authorization
          ↓
   Return success
*/

router.post(

    "/verify",

    verifyClientPasswordResetOTP

);



/* =========================================================
   5. RESEND PASSWORD RESET OTP
========================================================= */

/*
   FRONTEND REQUEST:

   POST /api/auth/client/password-reset-otp/resend


   REQUEST BODY:

   {
       "clientEmail": "client@example.com"
   }


   CONTROLLER:

   resendClientPasswordResetOTP


   FLOW:

   Client email
          ↓
   Find Client
          ↓
   Generate new OTP
          ↓
   Generate new expiry
          ↓
   Save OTP
          ↓
   Send OTP email
          ↓
   Return success
*/

router.post(

    "/resend",

    resendClientPasswordResetOTP

);



/* =========================================================
   6. EXPORT ROUTER
========================================================= */


module.exports =
    router;