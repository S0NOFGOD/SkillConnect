/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const jwt =
    require("jsonwebtoken");

const Worker =
    require("../models/worker");

const {
    generateAccessToken,
    hashRefreshToken
} =
    require("../utils/generateTokens");



/* =========================================================
   2. REFRESH ACCESS TOKEN
========================================================= */

/*
   FLOW:

   Browser sends HTTP-only refreshToken cookie
                    ↓
   Read refreshToken from cookie
                    ↓
   Verify refreshToken JWT
                    ↓
   Extract userId + userType
                    ↓
   Hash refreshToken
                    ↓
   Find matching Worker
                    ↓
   Compare stored refreshTokenHash
                    ↓
   Generate new accessToken
                    ↓
   Return accessToken
*/


const refreshAccessToken = async (
    req,
    res
) => {

    try {

        /* =================================================
           2.1 GET REFRESH TOKEN FROM COOKIE
        ================================================= */

        const refreshToken =
            req.cookies.refreshToken;


        /* =================================================
           2.2 CHECK IF REFRESH TOKEN EXISTS
        ================================================= */

        if (!refreshToken) {

            return res.status(401).json({

                success: false,

                message:
                    "Refresh token not found."

            });

        }


        /* =================================================
           2.3 VERIFY REFRESH TOKEN
        ================================================= */

        let decoded;

        try {

            decoded =
                jwt.verify(

                    refreshToken,

                    process.env.REFRESH_TOKEN_SECRET

                );

        } catch (error) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid or expired refresh token."

            });

        }


        /* =================================================
           2.4 VALIDATE TOKEN USER TYPE
        ================================================= */

        if (
            !decoded.userType ||
            decoded.userType !== "worker"
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /* =================================================
           2.5 VALIDATE USER ID
        ================================================= */

        if (!decoded.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /* =================================================
           2.6 HASH THE REFRESH TOKEN
        ================================================= */

        const refreshTokenHash =
            hashRefreshToken(
                refreshToken
            );


        /* =================================================
           2.7 FIND WORKER
        ================================================= */

        const worker = await Worker.findById(decoded.userId).select("+refreshTokenHash");


        /* =================================================
           2.8 CHECK WORKER EXISTS
        ================================================= */

        if (!worker) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /* =================================================
           2.9 CHECK STORED REFRESH TOKEN HASH
        ================================================= */

        if (
            !worker.refreshTokenHash ||
            worker.refreshTokenHash !==
                refreshTokenHash
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid refresh token."

            });

        }


        /* =================================================
           2.10 CHECK WORKER ACCOUNT STATUS
        ================================================= */

        if (
            worker.accountStatus ===
            "suspended"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been suspended."

            });

        }


        /* =================================================
           2.11 GENERATE NEW ACCESS TOKEN
        ================================================= */

        const newAccessToken =
            generateAccessToken({

                userId:
                    worker._id.toString(),

                userType:
                    "worker"

            });


        /* =================================================
           2.12 RETURN NEW ACCESS TOKEN
        ================================================= */

        return res.status(200).json({

            success: true,

            accessToken:
                newAccessToken

        });

    } catch (error) {

        /* =================================================
           2.13 HANDLE SERVER ERROR
        ================================================= */

        console.error(
            "Refresh access token error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to refresh access token."

        });

    }

};



/* =========================================================
   3. EXPORT CONTROLLER
========================================================= */

module.exports = {

    refreshAccessToken

};