/* =========================================================
   SKILLCONNECT WORKER AUTHENTICATION ROUTES

   This file controls the API endpoints for:

   1. Worker account creation
   2. Worker login
   3. Worker forgot password

   IMPORTANT:

   server.js already mounts this router at:

   /api/worker-authentication

   Therefore the final endpoints become:

   POST /api/worker-authentication/signup

   POST /api/worker-authentication/login

   POST /api/worker-authentication/forgot-password


   The actual authentication logic is NOT written here.

   This file only connects each endpoint to the
   appropriate controller function.
========================================================= */


/* =========================================================
   1. IMPORT EXPRESS
========================================================= */

/*
   Express Router allows us to create a separate
   collection of related routes.

   These routes will later be mounted by server.js.
*/

const express = require("express");


/*
   Create the router.
*/

const router = express.Router();



/* =========================================================
   2. IMPORT WORKER AUTHENTICATION CONTROLLER
========================================================= */

/*
   The controller contains the actual logic for:

   - Validating worker authentication data
   - Checking existing workers
   - Hashing passwords
   - Creating workers
   - Generating OTPs
   - Sending OTP emails
   - Comparing passwords
   - Checking account status
   - Creating access tokens
   - Creating refresh tokens
   - Saving hashed refresh tokens
   - Handling forgot password
*/

const {

    signupWorker,

    loginWorker,

    forgotPassword

} = require(
    "../controllers/worker-authentication"
);



/* =========================================================
   3. CREATE ACCOUNT ROUTE
========================================================= */

/*
   FRONTEND FLOW:

   User clicks "Create Account"
        ↓
   Frontend validation
        ↓
   POST request
        ↓
   This route
        ↓
   signupWorker controller
        ↓
   Database
        ↓
   Email OTP
        ↓
   Response to frontend


   FINAL ENDPOINT:

   POST /api/worker-authentication/signup
*/

router.post(

    "/signup",

    signupWorker

);



/* =========================================================
   4. LOGIN ROUTE
========================================================= */

/*
   FRONTEND FLOW:

   User clicks "Login"
        ↓
   Frontend validation
        ↓
   POST request
        ↓
   This route
        ↓
   loginWorker controller
        ↓
   Database
        ↓
   Password comparison
        ↓
   Account status check
        ↓
   Email verification check
        ↓
   Profile completion check
        ↓
   Token generation
        ↓
   Response to frontend


   FINAL ENDPOINT:

   POST /api/worker-authentication/login
*/

router.post(

    "/login",

    loginWorker

);



/* =========================================================
   5. FORGOT PASSWORD ROUTE
========================================================= */

/*
   FRONTEND FLOW:

   User clicks "Forgot Password"
        ↓
   Forgot Password modal
        ↓
   Enter email
        ↓
   Frontend validation
        ↓
   POST request
        ↓
   This route
        ↓
   forgotPassword controller
        ↓
   Check worker
        ↓
   Generate reset OTP
        ↓
   Save OTP + expiry
        ↓
   Send OTP
        ↓
   Generic response


   FINAL ENDPOINT:

   POST /api/worker-authentication/forgot-password
*/

router.post(

    "/forgot-password",

    forgotPassword

);



/* =========================================================
   6. EXPORT ROUTER
========================================================= */

/*
   server.js imports this router and mounts it at:

   /api/worker-authentication
*/

module.exports = router;