/* =========================================================
   1. IMPORT ENVIRONMENT VARIABLES
========================================================= */

require("dotenv").config();



/* =========================================================
   2. IMPORT EXPRESS
========================================================= */

const express =
    require("express");



/* =========================================================
   3. IMPORT CORS
========================================================= */

const cors =
    require("cors");



/* =========================================================
   4. IMPORT COOKIE PARSER
========================================================= */

const cookieParser =
    require("cookie-parser");



/* =========================================================
   5. IMPORT PASSPORT
========================================================= */

const passport =
    require("passport");



/* =========================================================
   6. IMPORT DATABASE CONNECTION
========================================================= */

const connectDB =
    require("./config/db");



/* =========================================================
   7. IMPORT WORKER AUTHENTICATION ROUTES
========================================================= */

const workerAuthenticationRoutes =
    require("./routes/worker-authentication");



/* =========================================================
   8. IMPORT WORKER EMAIL OTP ROUTES
========================================================= */

const workerEmailOTPRoutes =
    require("./routes/worker-email-otp");



/* =========================================================
   9. IMPORT WORKER PASSWORD RESET OTP ROUTES
========================================================= */

const workerPasswordResetOTPRoutes =
    require("./routes/worker-password-reset-otp");



/* =========================================================
   10. IMPORT WORKER CREATE PROFILE ROUTES
========================================================= */

const workerCreateProfileRoutes =
    require("./routes/worker-create-profile");



/* =========================================================
   11. IMPORT WORKER PASSWORD CHANGE ROUTES
========================================================= */

const workerPasswordChangeRoutes =
    require("./routes/worker-password-change");



/* =========================================================
   12. IMPORT CLIENT AUTHENTICATION ROUTES
========================================================= */

const clientAuthenticationRoutes =
    require("./routes/client-authentication");



/* =========================================================
   13. IMPORT CLIENT EMAIL OTP ROUTES
========================================================= */

const clientEmailOTPRoutes =
    require("./routes/client-email-otp");



/* =========================================================
   14. IMPORT CLIENT PASSWORD RESET OTP ROUTES
========================================================= */

const clientPasswordResetOTPRoutes =
    require("./routes/client-password-reset-otp");



/* =========================================================
   15. IMPORT CLIENT CREATE PROFILE ROUTES
========================================================= */

const clientCreateProfileRoutes =
    require("./routes/client-create-profile");



/* =========================================================
   16. IMPORT CLIENT PASSWORD CHANGE ROUTES
========================================================= */

const clientPasswordChangeRoutes =
    require("./routes/client-password-change");



/* =========================================================
   17. IMPORT CLIENT WORKER SEARCH ROUTES
========================================================= */

const clientWorkerSearchRoutes =
    require("./routes/client-worker-search");



/* =========================================================
   18. IMPORT CLIENT WORKER DETAILS ROUTES
========================================================= */

const clientWorkerDetailsRoutes =
    require("./routes/client-worker-details");



/* =========================================================
   19. IMPORT WORKER DASHBOARD ROUTES
========================================================= */

const workerDashboardRoutes =
    require("./routes/worker-dashboard");



    /* =========================================================
       IMPORT RefreshToken ROUTE
    ========================================================= */

     const refreshTokenRoutes = require("./routes/refreshToken");



/* =========================================================
   20. CREATE EXPRESS APPLICATION
========================================================= */

const app =
    express();



/* =========================================================
   21. SERVER PORT
========================================================= */

const PORT =
    process.env.PORT || 5000;



/* =========================================================
   22. TRUST RENDER PROXY
========================================================= */

/*
   Render runs the application behind a proxy.

   This allows Express to correctly understand
   HTTPS requests in production.

   This is important when using secure cookies.
*/

app.set(
    "trust proxy",
    1
);



/* =========================================================
   23. FRONTEND URLS
========================================================= */

const allowedOrigins = [

    process.env.FRONTEND_URL,

    process.env.FRONTEND_PRODUCTION_URL

].filter(Boolean);



/* =========================================================
   24. CORS CONFIGURATION
========================================================= */

app.use(

    cors({

        origin: function (
            origin,
            callback
        ) {

            /*
               Allow requests without an Origin header.

               Examples:

               Postman
               Server-to-server requests
            */

            if (!origin) {

                return callback(
                    null,
                    true
                );

            }


            /*
               Check whether the frontend
               is an allowed frontend URL.
            */

            if (
                allowedOrigins.includes(origin)
            ) {

                return callback(
                    null,
                    true
                );

            }


            /*
               Reject unknown origins.
            */

            return callback(
                new Error(
                    "Not allowed by CORS"
                )
            );

        },

        /*
           Allows HTTP-only refresh-token cookies
           to be sent between frontend and backend.
        */

        credentials: true

    })

);



/* =========================================================
   25. JSON BODY PARSER
========================================================= */

app.use(
    express.json()
);



/* =========================================================
   26. URL-ENCODED BODY PARSER
========================================================= */

app.use(

    express.urlencoded({

        extended: true

    })

);



/* =========================================================
   27. COOKIE PARSER
========================================================= */

app.use(
    cookieParser()
);



/* =========================================================
   28. PASSPORT INITIALIZATION
========================================================= */

/*
   Passport is used for Google OAuth.

   We intentionally do not use express-session
   because SkillConnect uses a stateless OAuth
   exchange-code flow.
*/

app.use(
    passport.initialize()
);



/* =========================================================
   29. HEALTH CHECK ROUTE
========================================================= */

app.get(

    "/",

    (req, res) => {

        res.status(200).json({

            success: true,

            message:
                "SkillConnect API is running successfully."

        });

    }

);



/* =========================================================
   30. WORKER AUTHENTICATION ROUTES
========================================================= */

app.use(

    "/api/worker-authentication",

    workerAuthenticationRoutes

);



app.use(
    "/api/auth/worker",
    refreshTokenRoutes
);



/* =========================================================
   31. WORKER EMAIL OTP ROUTES
========================================================= */

app.use(

    "/api/auth/worker",

    workerEmailOTPRoutes

);



/* =========================================================
   32. WORKER PASSWORD RESET OTP ROUTES
========================================================= */

app.use(

    "/api/auth/worker",

    workerPasswordResetOTPRoutes

);



/* =========================================================
   33. WORKER CREATE PROFILE ROUTES
========================================================= */

app.use(

    "/api/auth/worker",

    workerCreateProfileRoutes

);



/* =========================================================
   34. WORKER PASSWORD CHANGE ROUTES
========================================================= */

app.use(

    "/api/worker-password-change",

    workerPasswordChangeRoutes

);



/* =========================================================
   35. CLIENT AUTHENTICATION ROUTES
========================================================= */

app.use(

    "/api/client-authentication",

    clientAuthenticationRoutes

);



/* =========================================================
   36. CLIENT EMAIL OTP ROUTES
========================================================= */

app.use(

    "/api/auth/client",

    clientEmailOTPRoutes

);



/* =========================================================
   37. CLIENT PASSWORD RESET OTP ROUTES
========================================================= */

app.use(

    "/api/client-password-reset-otp",

    clientPasswordResetOTPRoutes

);



/* =========================================================
   38. CLIENT CREATE PROFILE ROUTES
========================================================= */

app.use(

    "/api/client-create-profile",

    clientCreateProfileRoutes

);



/* =========================================================
   39. CLIENT PASSWORD CHANGE ROUTES
========================================================= */

app.use(

    "/api/client-password-change",

    clientPasswordChangeRoutes

);



/* =========================================================
   40. CLIENT WORKER SEARCH ROUTES
========================================================= */

app.use(

    "/api/client/worker-search",

    clientWorkerSearchRoutes

);



/* =========================================================
   41. CLIENT WORKER DETAILS ROUTES
========================================================= */

app.use(

    "/api/client/worker-details",

    clientWorkerDetailsRoutes

);



/* =========================================================
   42. WORKER DASHBOARD ROUTES
========================================================= */

app.use(

    "/api/worker-dashboard",

    workerDashboardRoutes

);



/* =========================================================
   43. UNKNOWN ROUTE HANDLER
========================================================= */

app.use(

    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "The requested API endpoint was not found."

        });

    }

);



/* =========================================================
   44. GLOBAL ERROR HANDLER
========================================================= */

app.use(

    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Server Error:",
            error
        );


        /* =================================================
           CORS ERROR
        ================================================= */

        if (
            error.message ===
            "Not allowed by CORS"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "This origin is not allowed to access the SkillConnect API."

            });

        }


        /* =================================================
           GENERIC SERVER ERROR
        ================================================= */

        res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:

                process.env.NODE_ENV ===
                "development"

                    ? error.message

                    : "An internal server error occurred."

        });

    }

);



/* =========================================================
   45. START SERVER
========================================================= */

const startServer = async () => {

    try {

        /* ==========================================
           CONNECT TO MONGODB ATLAS
        ========================================== */

        await connectDB();


        /* ==========================================
           START EXPRESS SERVER
        ========================================== */

        app.listen(

            PORT,

            () => {

                console.log(
                    `SkillConnect server running on port ${PORT}`
                );

            }

        );

    }

    catch (error) {

        console.error(

            "Failed to start SkillConnect server:",

            error.message

        );


        process.exit(1);

    }

};



/* =========================================================
   46. START APPLICATION
========================================================= */

startServer();