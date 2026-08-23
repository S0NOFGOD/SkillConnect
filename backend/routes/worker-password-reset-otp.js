/* =========================================================
   SKILLCONNECT WORKER PASSWORD RESET OTP ROUTES

   This file defines the API routes used by the
   worker-password-reset-otp page.

   It handles:

   1. Verify password reset OTP
   2. Resend password reset OTP

   Final endpoints:

   POST /api/auth/worker/password-reset-otp/verify

   POST /api/auth/worker/password-reset-otp/resend
========================================================= */


/* =========================================================
   IMPORT EXPRESS
========================================================= */

/*
    Express Router allows us to create a group
    of related routes separately from server.js.
*/

const express =
    require("express");


/* =========================================================
   CREATE ROUTER
========================================================= */

/*
    This router will contain all password reset
    OTP routes.
*/

const router =
    express.Router();


/* =========================================================
   IMPORT CONTROLLER
========================================================= */

/*
    The controller contains the actual business logic.

    It handles:

    - Finding the worker
    - Checking the OTP
    - Checking OTP expiry
    - Marking the OTP as verified
    - Clearing the OTP
    - Generating a new OTP
    - Sending the OTP email
*/

const {

    verifyPasswordResetOTP,

    resendPasswordResetOTP

} =
    require("../controllers/worker-password-reset-otp");


/* =========================================================
   VERIFY PASSWORD RESET OTP
========================================================= */

/*
    Endpoint:

    POST /api/auth/worker/password-reset-otp/verify


    Flow:

    Frontend sends:

    {
        email: "worker@example.com",
        otp: "482913"
    }


    Backend:

    1. Finds worker
    2. Checks passwordResetOTP
    3. Checks passwordResetOTPExpires
    4. Marks reset OTP as verified
    5. Clears OTP
    6. Clears OTP expiry
    7. Saves reset authorization
    8. Returns success response


    Frontend then:

    - Shows success modal
    - Redirects to:

      worker-password-change/index.html
*/

router.post(

    "/password-reset-otp/verify",

    verifyPasswordResetOTP

);


/* =========================================================
   RESEND PASSWORD RESET OTP
========================================================= */

/*
    Endpoint:

    POST /api/auth/worker/password-reset-otp/resend


    Flow:

    Frontend sends:

    {
        email: "worker@example.com"
    }


    Backend:

    1. Finds worker
    2. Generates a new 6-digit OTP
    3. Generates a new 10-minute expiry
    4. Saves OTP
    5. Saves expiry
    6. Sends new OTP email
    7. Returns success response


    Frontend then:

    - Shows success modal
    - Starts the 60-second resend countdown
    - Allows the worker to enter the new OTP
*/

router.post(

    "/password-reset-otp/resend",

    resendPasswordResetOTP

);


/* =========================================================
   EXPORT ROUTER
========================================================= */

/*
    Export this router so server.js can mount it.

    server.js uses:

    app.use(
        "/api/auth/worker",
        workerPasswordResetOTPRoutes
    );


    Therefore:

    "/password-reset-otp/verify"

    becomes:

    "/api/auth/worker/password-reset-otp/verify"


    And:

    "/password-reset-otp/resend"

    becomes:

    "/api/auth/worker/password-reset-otp/resend"
*/

module.exports =
    router;