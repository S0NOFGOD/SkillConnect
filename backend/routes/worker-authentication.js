/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const express =
    require("express");

const passport =
    require("../config/passport");


/* ---------------------------------------------------------
   Worker authentication controllers
--------------------------------------------------------- */

const {
    signupWorker,
    loginWorker,
    forgotPassword
} =
    require("../controllers/worker-authentication");


/* ---------------------------------------------------------
   Worker Google authentication controllers
--------------------------------------------------------- */

const {
    googleCallback,
    exchangeGoogleCode
} =
    require("../controllers/worker-google-redirect");



/* =========================================================
   2. CREATE ROUTER
========================================================= */

const router =
    express.Router();



/* =========================================================
   3. CREATE WORKER ACCOUNT
========================================================= */

router.post(
    "/signup",
    signupWorker
);



/* =========================================================
   4. WORKER LOGIN
========================================================= */

router.post(
    "/login",
    loginWorker
);



/* =========================================================
   5. FORGOT PASSWORD
========================================================= */

router.post(
    "/forgot-password",
    forgotPassword
);



/* =========================================================
   6. GOOGLE AUTHENTICATION
========================================================= */

router.get(

    "/google",

    passport.authenticate(

        "google",

        {
            scope: [
                "profile",
                "email"
            ],

            session: false
        }

    )

);



/* =========================================================
   7. GOOGLE CALLBACK
========================================================= */

router.get(

    "/google/callback",

    passport.authenticate(

        "google",

        {
            session: false,

            failureRedirect:
                `${process.env.FRONTEND_URL}/worker-google-redirect/index.html?error=google-authentication-failed`
        }

    ),

    googleCallback

);



/* =========================================================
   8. GOOGLE EXCHANGE CODE
========================================================= */

router.post(

    "/google/exchange",

    exchangeGoogleCode

);



/* =========================================================
   9. EXPORT ROUTER
========================================================= */

module.exports =
    router;