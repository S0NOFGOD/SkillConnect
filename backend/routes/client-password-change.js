/* =========================================================
   SKILLCONNECT CLIENT PASSWORD CHANGE ROUTES

   PURPOSE:

   This file defines the API endpoint used when a
   client wants to create a new password after
   completing the password-reset OTP process.

   FLOW:

   Frontend
       ↓
   POST /api/client-password-change
       ↓
   This router
       ↓
   clientPasswordChange controller
       ↓
   Find client
       ↓
   Validate resetAuthorization
       ↓
   Validate expiration
       ↓
   Hash new password
       ↓
   Clear reset authorization
       ↓
   Clear password reset OTP
       ↓
   Save client
       ↓
   Return success response

   IMPORTANT:

   The route does NOT contain the password-changing
   business logic.

   The controller is responsible for that logic.
========================================================= */


/* =========================================================
   1. IMPORT EXPRESS
========================================================= */

/*
   Express Router allows us to create a separate
   route file instead of putting every endpoint
   directly inside server.js.
*/

const express =
    require("express");


/* =========================================================
   2. CREATE ROUTER
========================================================= */

/*
   Create a new Express router.

   server.js will mount this router at:

       /api/client-password-change

   Therefore:

       router.post("/")

   becomes:

       POST /api/client-password-change
*/

const router =
    express.Router();


/* =========================================================
   3. IMPORT PASSWORD CHANGE CONTROLLER
========================================================= */

/*
   The controller contains the actual logic for:

   - Finding the client
   - Checking resetAuthorization
   - Checking expiration
   - Hashing the new password
   - Clearing password reset data
   - Saving the client
   - Sending the response
*/

const {
    changeClientPassword
} =
    require(
        "../controllers/client-password-change"
    );


/* =========================================================
   4. CLIENT PASSWORD CHANGE ENDPOINT
========================================================= */

/*
   POST /api/client-password-change

   Expected request body:

   {
       email: "client@example.com",

       resetAuthorization:
           "temporary-reset-authorization",

       password:
           "NewPassword123"
   }

   The frontend sends these values after
   successful frontend validation.
*/

router.post(

    "/",

    changeClientPassword

);


/* =========================================================
   5. EXPORT ROUTER
========================================================= */

/*
   Export the router so server.js can mount it.

   server.js:

   app.use(
       "/api/client-password-change",
       clientPasswordChangeRoutes
   );
*/

module.exports =
    router;


/* =========================================================
   END OF CLIENT PASSWORD CHANGE ROUTES
========================================================= */