/* =========================================================
   1. ENVIRONMENT & DEPENDENCIES
========================================================= */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const connectDB =
    require("./config/mongodb");


/* =========================================================
   2. ROUTES
========================================================= */

/* =========================
   WORKER ROUTES
========================= */

const workerAuthenticationRoutes =
    require("./routes/worker-authentication");

const workerEmailOTPRoutes =
    require("./routes/worker-email-otp");

const workerPasswordResetOTPRoutes =
    require("./routes/worker-password-reset-otp");

const workerCreateProfileRoutes =
    require("./routes/worker-create-profile");

const workerEditProfileRoutes =
    require("./routes/worker-edit-profile");

const workerPasswordChangeRoutes =
    require("./routes/worker-password-change");

const workerDashboardRoutes =
    require("./routes/worker-dashboard");

const workerServicesRoutes =
    require("./routes/worker-services");


/*
   NEW:
   Routes responsible for creating worker services.
*/

const workerCreateServiceRoutes =
    require("./routes/worker-create-service");


/*
   NEW:
   Routes responsible for viewing,
   updating and deleting worker services.
*/

const workerViewServiceRoutes =
    require("./routes/worker-view-service");


const refreshTokenRoutes =
    require("./routes/refreshToken");


/* =========================
   CLIENT ROUTES
========================= */

const clientAuthenticationRoutes =
    require("./routes/client-authentication");

const clientEmailOTPRoutes =
    require("./routes/client-email-otp");

const clientPasswordResetOTPRoutes =
    require("./routes/client-password-reset-otp");

const clientCreateProfileRoutes =
    require("./routes/client-create-profile");

const clientPasswordChangeRoutes =
    require("./routes/client-password-change");

const clientWorkerSearchRoutes =
    require("./routes/client-worker-search");

const clientWorkerDetailsRoutes =
    require("./routes/client-worker-details");


/* =========================================================
   3. CREATE EXPRESS APPLICATION
========================================================= */

const app = express();

const PORT =
    process.env.PORT || 5000;


/* =========================================================
   4. TRUST RENDER PROXY
========================================================= */

app.set(
    "trust proxy",
    1
);


/* =========================================================
   5. ALLOWED FRONTEND ORIGINS
========================================================= */

const allowedOrigins = [

    process.env.FRONTEND_URL,

    process.env.FRONTEND_PRODUCTION_URL

].filter(Boolean);


/* =========================================================
   6. CORS CONFIGURATION
========================================================= */

app.use(

    cors({

        origin(origin, callback) {

            /*
               Allow requests without an Origin header.
            */

            if (!origin) {

                return callback(
                    null,
                    true
                );

            }


            /*
               Allow only configured frontend origins.
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
           Required for HTTP-only refresh-token cookies.
        */

        credentials: true

    })

);


/* =========================================================
   7. BODY & COOKIE PARSERS
========================================================= */

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    cookieParser()
);


/* =========================================================
   8. PASSPORT INITIALIZATION
========================================================= */

app.use(
    passport.initialize()
);


/* =========================================================
   9. HEALTH CHECK
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
   10. WORKER AUTHENTICATION
========================================================= */

app.use(
    "/api/worker-authentication",
    workerAuthenticationRoutes
);


/* =========================================================
   11. WORKER REFRESH TOKEN
========================================================= */

app.use(
    "/api/auth/worker",
    refreshTokenRoutes
);


/* =========================================================
   12. WORKER EMAIL OTP
========================================================= */

app.use(
    "/api/auth/worker",
    workerEmailOTPRoutes
);


/* =========================================================
   13. WORKER PASSWORD RESET OTP
========================================================= */

app.use(
    "/api/auth/worker",
    workerPasswordResetOTPRoutes
);


/* =========================================================
   14. WORKER CREATE PROFILE
========================================================= */

app.use(
    "/api/worker",
    workerCreateProfileRoutes
);


/* =========================================================
   15. WORKER EDIT PROFILE
========================================================= */

app.use(
    "/api/worker",
    workerEditProfileRoutes
);


/* =========================================================
   16. WORKER PASSWORD CHANGE
========================================================= */

app.use(
    "/api/worker-password-change",
    workerPasswordChangeRoutes
);


/* =========================================================
   17. WORKER CREATE SERVICE
========================================================= */

/*
   Handles:

   POST /api/worker/create-service

   The route will handle authentication,
   validation and service creation.
*/

app.use(
    "/api/worker",
    workerCreateServiceRoutes
);


/* =========================================================
   18. WORKER VIEW SERVICE
========================================================= */

/*
   Handles:

   GET    /api/worker/view-service/:serviceId
   PUT    /api/worker/view-service/:serviceId
   DELETE /api/worker/view-service/:serviceId

   The route will handle authentication,
   validation, viewing, updating and deleting
   the worker's service.
*/

app.use(
    "/api/worker",
    workerViewServiceRoutes
);


/* =========================================================
   19. CLIENT AUTHENTICATION
========================================================= */

app.use(
    "/api/client-authentication",
    clientAuthenticationRoutes
);


/* =========================================================
   20. CLIENT EMAIL OTP
========================================================= */

app.use(
    "/api/auth/client",
    clientEmailOTPRoutes
);


/* =========================================================
   21. CLIENT PASSWORD RESET OTP
========================================================= */

app.use(
    "/api/client-password-reset-otp",
    clientPasswordResetOTPRoutes
);


/* =========================================================
   22. CLIENT CREATE PROFILE
========================================================= */

app.use(
    "/api/client-create-profile",
    clientCreateProfileRoutes
);


/* =========================================================
   23. CLIENT PASSWORD CHANGE
========================================================= */

app.use(
    "/api/client-password-change",
    clientPasswordChangeRoutes
);


/* =========================================================
   24. CLIENT WORKER SEARCH
========================================================= */

app.use(
    "/api/client/worker-search",
    clientWorkerSearchRoutes
);


/* =========================================================
   25. CLIENT WORKER DETAILS
========================================================= */

app.use(
    "/api/client/worker-details",
    clientWorkerDetailsRoutes
);


/* =========================================================
   26. WORKER DASHBOARD
========================================================= */

app.use(
    "/api/worker",
    workerDashboardRoutes
);


/* =========================================================
   27. WORKER SERVICES
========================================================= */

app.use(
    "/api/worker",
    workerServicesRoutes
);


/* =========================================================
   28. UNKNOWN ROUTE HANDLER
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
   29. GLOBAL ERROR HANDLER
========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "Server Error:",
            error
        );


        /*
           Handle CORS errors.
        */

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


        /*
           Handle all other server errors.
        */

        return res.status(
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
   30. START SERVER
========================================================= */

const startServer = async () => {

    try {

        /*
           Connect to MongoDB before starting Express.
        */

        await connectDB();


        /*
           Start the HTTP server.
        */

        app.listen(
            PORT,
            () => {

                console.log(
                    `SkillConnect server running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Failed to start SkillConnect server:",
            error.message
        );

        process.exit(1);

    }

};


/* =========================================================
   31. START APPLICATION
========================================================= */

startServer();