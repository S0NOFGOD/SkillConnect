/* =========================================================
   SKILLCONNECT CLIENT AUTHENTICATION ROUTES

   This file controls the API routes used by the
   Client Authentication page.

   CLIENT AUTHENTICATION FLOW:

   1. Create Account
   2. Login
   3. Forgot Password

   IMPORTANT:

   Google authentication is intentionally NOT included.

   The actual authentication logic is handled by:

   controllers/client-authentication.js

   SERVER PREFIX:

   /api/client-authentication

   Therefore:

   POST /signup
       becomes
   POST /api/client-authentication/signup

   POST /login
       becomes
   POST /api/client-authentication/login

   POST /forgot-password
       becomes
   POST /api/client-authentication/forgot-password
========================================================= */


/* =========================================================
   1. IMPORT EXPRESS ROUTER
========================================================= */

/*
   Express Router allows us to create a separate group
   of routes for client authentication.
*/

const express =
    require("express");



/* =========================================================
   2. CREATE ROUTER
========================================================= */

/*
   This router will contain all client authentication
   endpoints.
*/

const router =
    express.Router();



/* =========================================================
   3. IMPORT CLIENT AUTHENTICATION CONTROLLER
========================================================= */

/*
   The controller contains the actual business logic
   for:

   - Client signup
   - Client login
   - Client forgot password
*/

const {

    signup,

    login,

    forgotPassword

} = require(
    "../controllers/client-authentication"
);



/* =========================================================
   4. CLIENT CREATE ACCOUNT ROUTE
========================================================= */

/*
   FRONTEND:

   User enters:

   - Email
   - Password
   - Confirm password
   - Terms & Privacy agreement

   The frontend performs its own validation first.

   If valid, it sends:

   POST /api/client-authentication/signup

   The controller then:

   1. Validates the request
   2. Checks whether the email exists
   3. Hashes the password
   4. Creates the client
   5. Sets accountStatus = active
   6. Sets isEmailVerified = false
   7. Sets profileCompleted = false
   8. Generates an email OTP
   9. Saves the OTP and expiry
   10. Sends the OTP
   11. Returns a success response

   The frontend will then save the client email
   in sessionStorage and redirect to:

   client-email-otp/index.html
*/

router.post(

    "/signup",

    signup

);



/* =========================================================
   5. CLIENT LOGIN ROUTE
========================================================= */

/*
   FRONTEND:

   User enters:

   - Email
   - Password

   The frontend validates the input first.

   If valid, it sends:

   POST /api/client-authentication/login

   The controller then:

   1. Validates the request
   2. Checks whether the email exists
   3. Compares the password
   4. Checks accountStatus
   5. Checks email verification
   6. Checks profile completion
   7. Generates an access token when appropriate
   8. Generates a refresh token
   9. Hashes the refresh token
   10. Saves the refresh-token hash
   11. Sends the refresh token as an HTTP-only cookie
   12. Returns the access token

   Depending on the client's account state, the frontend
   will redirect to:

   client-email-otp/index.html

   OR

   client-create-profile/index.html

   OR

   client-worker-search/index.html
*/

router.post(

    "/login",

    login

);



/* =========================================================
   6. CLIENT FORGOT PASSWORD ROUTE
========================================================= */

/*
   FRONTEND:

   User clicks:

   Forgot Password

   Then enters their email in the forgot-password modal.

   The frontend validates the email first.

   If valid, it sends:

   POST /api/client-authentication/forgot-password

   The controller then:

   1. Validates the email
   2. Checks whether the client exists
   3. Returns a generic response if the email
      does not exist
   4. Generates a password-reset OTP if the
      client exists
   5. Saves the OTP and expiry
   6. Sends the OTP
   7. Returns a response

   The frontend saves the client email in
   sessionStorage and redirects to:

   client-password-reset-otp/index.html
*/

router.post(

    "/forgot-password",

    forgotPassword

);



/* =========================================================
   7. EXPORT ROUTER
========================================================= */

/*
   server.js imports this router and mounts it at:

   /api/client-authentication

   Therefore the final endpoints are:

   POST /api/client-authentication/signup

   POST /api/client-authentication/login

   POST /api/client-authentication/forgot-password
*/

module.exports =
    router;