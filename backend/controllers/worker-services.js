/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const jwt =
    require("jsonwebtoken");

const Worker =
    require("../models/worker");



/* =========================================================
   2. IMPORT REFRESH TOKEN HASH FUNCTION
========================================================= */

/*
   This function comes from generateTokens.js.

   It hashes the raw refresh token from the
   HTTP-only cookie before comparing it with
   the stored MongoDB hash.
*/

const {
    hashRefreshToken
} = require("../utils/generateTokens");



/* =========================================================
   3. AUTHENTICATE WORKER FROM ACCESS TOKEN
========================================================= */

/*
   The routes no longer use authenticateWorker
   middleware.

   Therefore, this controller reads the access token
   directly from the Authorization header.

   Expected format:

   Authorization: Bearer <accessToken>
*/

const authenticateWorkerFromRequest = (
    req
) => {

    /* -----------------------------------------------------
       Get Authorization header
    ----------------------------------------------------- */

    const authorization =
        req.headers.authorization;


    /* -----------------------------------------------------
       Make sure the header exists
    ----------------------------------------------------- */

    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {

        return null;

    }


    /* -----------------------------------------------------
       Extract access token
    ----------------------------------------------------- */

    const accessToken =
        authorization.substring(7);


    /* -----------------------------------------------------
       Verify access token
    ----------------------------------------------------- */

    try {

        return jwt.verify(

            accessToken,

            process.env.ACCESS_TOKEN_SECRET

        );

    }

    catch (error) {

        return null;

    }

};



/* =========================================================
   4. GET WORKER SERVICES
========================================================= */

/*
   GET /api/worker/services

   FLOW:

   Frontend sends accessToken
        ↓
   Controller reads Bearer token
        ↓
   Controller verifies accessToken
        ↓
   Get worker ID from token
        ↓
   Find worker in MongoDB
        ↓
   Get worker.services
        ↓
   Return service id, skill and date
        ↓
   Frontend displays service cards
*/

const getWorkerServices = async (
    req,
    res
) => {

    try {

        /* -------------------------------------------------
           Authenticate worker
        ------------------------------------------------- */

        const decodedToken =
            authenticateWorkerFromRequest(
                req
            );


        /* -------------------------------------------------
           Invalid or missing access token
        ------------------------------------------------- */

        if (!decodedToken) {

            return res.status(401).json({

                success: false,

                message:
                    "Worker authentication is required."

            });

        }


        /* -------------------------------------------------
           Make sure token belongs to a worker
        ------------------------------------------------- */

        if (
            decodedToken.userType &&
            decodedToken.userType !== "worker"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Worker access is required."

            });

        }


        /* -------------------------------------------------
           Get worker ID from access token
        ------------------------------------------------- */

        const workerId =
            decodedToken.userId;


        /* -------------------------------------------------
           Make sure worker ID exists
        ------------------------------------------------- */

        if (!workerId) {

            return res.status(401).json({

                success: false,

                message:
                    "Worker authentication is required."

            });

        }


        /* -------------------------------------------------
           Find authenticated worker
        ------------------------------------------------- */

        const worker =
            await Worker.findById(
                workerId
            ).select(
                "services"
            );


        /* -------------------------------------------------
           Worker was not found
        ------------------------------------------------- */

        if (!worker) {

            return res.status(404).json({

                success: false,

                message:
                    "Worker account was not found."

            });

        }


        /* -------------------------------------------------
           No services yet
        ------------------------------------------------- */

        if (
            worker.services === null ||
            !Array.isArray(worker.services) ||
            worker.services.length === 0
        ) {

            return res.status(200).json({

                success: true,

                services: null

            });

        }


        /* -------------------------------------------------
           Prepare services for frontend
        ------------------------------------------------- */

        const services =
            worker.services.map(
                (service) => {

                    return {

                        id:
                            service.id,

                        skill:
                            service.skill,

                        date:
                            service.date

                    };

                }
            );


        /* -------------------------------------------------
           Return services
        ------------------------------------------------- */

        return res.status(200).json({

            success: true,

            services

        });

    }

    catch (error) {

        /* -------------------------------------------------
           Log server error
        ------------------------------------------------- */

        console.error(
            "Get worker services error:",
            error
        );


        /* -------------------------------------------------
           Return server error
        ------------------------------------------------- */

        return res.status(500).json({

            success: false,

            message:
                "Unable to load your services."

        });

    }

};



/* =========================================================
   5. LOGOUT WORKER
========================================================= */

/*
   POST /api/worker/logout

   FLOW:

   Frontend sends logout request
        ↓
   Backend gets refreshToken cookie
        ↓
   Backend hashes refreshToken
        ↓
   Backend finds the worker using the
   refreshTokenHash
        ↓
   Backend clears refreshTokenHash
        ↓
   Backend clears refreshToken cookie
        ↓
   Backend returns success
        ↓
   Frontend removes accessToken
        ↓
   Frontend redirects to login

   No authentication middleware is required.
*/

const logoutWorker = async (
    req,
    res
) => {

    try {

        /* -------------------------------------------------
           Get refresh token from HTTP-only cookie
        ------------------------------------------------- */

        const refreshToken =
            req.cookies &&
            req.cookies.refreshToken;


        /* -------------------------------------------------
           Clear refresh token cookie

           This is done even when the cookie is missing.
        ------------------------------------------------- */

        res.clearCookie(
            "refreshToken",
            {

                httpOnly: true,

                secure:
                    process.env.NODE_ENV ===
                    "production",

                sameSite:
                    process.env.NODE_ENV ===
                    "production"
                        ? "none"
                        : "lax",

                path: "/"

            }
        );


        /* -------------------------------------------------
           No refresh token

           There is nothing to revoke.
        ------------------------------------------------- */

        if (!refreshToken) {

            return res.status(200).json({

                success: true,

                message:
                    "Logout successful."

            });

        }


        /* -------------------------------------------------
           Hash the refresh token
        ------------------------------------------------- */

        const refreshTokenHash =
            hashRefreshToken(
                refreshToken
            );


        /* -------------------------------------------------
           Revoke the matching refresh token
           
           We identify the worker through the stored
           refreshTokenHash instead of req.user because
           authentication middleware is no longer used.
        ------------------------------------------------- */

        await Worker.findOneAndUpdate(

            {

                refreshTokenHash

            },

            {

                $set: {

                    refreshTokenHash: null

                }

            }

        );


        /* -------------------------------------------------
           Return successful logout response
        ------------------------------------------------- */

        return res.status(200).json({

            success: true,

            message:
                "Logout successful."

        });

    }

    catch (error) {

        /* -------------------------------------------------
           Log server error
        ------------------------------------------------- */

        console.error(
            "Worker logout error:",
            error
        );


        /* -------------------------------------------------
           Return server error
        ------------------------------------------------- */

        return res.status(500).json({

            success: false,

            message:
                "Unable to log out. Please try again."

        });

    }

};



/* =========================================================
   6. EXPORT CONTROLLER FUNCTIONS
========================================================= */

module.exports = {

    getWorkerServices,

    logoutWorker

};