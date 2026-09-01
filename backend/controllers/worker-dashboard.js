/* =========================================================
   WORKER DASHBOARD CONTROLLER
========================================================= */


/* =========================================================
   1. IMPORT REQUIRED PACKAGES
========================================================= */

const jwt =
    require("jsonwebtoken");

const bcrypt =
    require("bcryptjs");


/* =========================================================
   2. IMPORT WORKER MODEL
========================================================= */

const Worker =
    require("../models/worker");


/* =========================================================
   3. GET ACCESS TOKEN FROM REQUEST
========================================================= */

/*
   Reads the Bearer accessToken from the
   Authorization header.

   Expected format:

   Authorization: Bearer ACCESS_TOKEN
*/

function getAccessTokenFromRequest(
    req
) {

    const authorization =
        req.headers.authorization;


    if (!authorization) {

        return null;

    }


    if (
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        return null;

    }


    return authorization
        .substring(7)
        .trim();

}


/* =========================================================
   4. VERIFY ACCESS TOKEN
========================================================= */

/*
   Validates the accessToken directly inside
   this controller.

   No authentication middleware is used.
*/

function verifyAccessToken(
    token
) {

    return jwt.verify(

        token,

        process.env.ACCESS_TOKEN_SECRET

    );

}


/* =========================================================
   5. FIND WORKER ID FROM TOKEN
========================================================= */

/*
   Supports common JWT payload names.

   This makes the controller compatible with
   tokens containing:

       workerId

   or:

       id

   or:

       _id
*/

function getWorkerIdFromToken(
    decodedToken
) {

    return (
        decodedToken.workerId ||
        decodedToken.id ||
        decodedToken._id ||
        null
    );

}


/* =========================================================
   6. BUILD WORKER DASHBOARD RESPONSE
========================================================= */

/*
   Only return the information required by the
   worker dashboard.

   Sensitive information such as:

       password
       refreshTokenHash
       OTPs
       reset authorization

   is never returned to the frontend.
*/

function buildDashboardResponse(
    worker
) {

    return {

        profilePicture:
            worker.profilePicture || null,

        isVerified:
            worker.isVerified,

        fullName:
            worker.fullName || null,

        phone:
            worker.phone || null,

        primarySkill:
            worker.primarySkill || null,

        experience:
            worker.experience || null,

        startingPrice:
            worker.startingPrice || null,

        location: {

            city:
                worker.city || null,

            state:
                worker.state || null

        },

        description:
            worker.description || null,

        portfolioImages:
            worker.portfolioImages || []

    };

}


/* =========================================================
   7. GET WORKER DASHBOARD
========================================================= */

/*
   Flow:

   Frontend sends accessToken
        ↓
   Controller receives accessToken
        ↓
   Controller validates accessToken
        ↓
   Controller finds worker
        ↓
   Controller returns worker profile
*/

exports.getWorkerDashboard =
    async function (
        req,
        res
    ) {

        try {

            /* ==========================================
               GET ACCESS TOKEN
            ========================================== */

            const accessToken =
                getAccessTokenFromRequest(
                    req
                );


            /*
               No accessToken was supplied.
            */

            if (!accessToken) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Access token is required."

                });

            }


            /* ==========================================
               VERIFY ACCESS TOKEN
            ========================================== */

            let decodedToken;


            try {

                decodedToken =
                    verifyAccessToken(
                        accessToken
                    );

            } catch (error) {

                /*
                   An expired token is different from
                   another invalid token.

                   The frontend can use 401 to begin
                   its refresh-token flow.
                */

                if (
                    error.name ===
                    "TokenExpiredError"
                ) {

                    return res.status(401).json({

                        success: false,

                        code:
                            "ACCESS_TOKEN_EXPIRED",

                        message:
                            "Access token has expired."

                    });

                }


                /*
                   Invalid accessToken.
                */

                return res.status(401).json({

                    success: false,

                    code:
                        "INVALID_ACCESS_TOKEN",

                    message:
                        "Invalid access token."

                });

            }


            /* ==========================================
               GET WORKER ID
            ========================================== */

            const workerId =
                getWorkerIdFromToken(
                    decodedToken
                );


            if (!workerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid authentication token."

                });

            }


            /* ==========================================
               FIND WORKER
            ========================================== */

            const worker =
                await Worker.findById(
                    workerId
                );


            if (!worker) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Worker account could not be found."

                });

            }


            /* ==========================================
               CHECK ACCOUNT STATUS
            ========================================== */

            if (
                worker.accountStatus !==
                "active"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your worker account is not active."

                });

            }


            /* ==========================================
               RETURN WORKER DASHBOARD
            ========================================== */

            return res.status(200).json({

                success: true,

                worker:
                    buildDashboardResponse(
                        worker
                    )

            });

        } catch (error) {

            console.error(
                "Get worker dashboard error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load the worker dashboard."

            });

        }

    };


/* =========================================================
   8. REFRESH ACCESS TOKEN
========================================================= */

/*
   Flow:

   Frontend detects expired accessToken
        ↓
   Frontend sends refreshToken
        ↓
   Controller validates refreshToken
        ↓
   Controller finds worker
        ↓
   Controller compares refreshToken hash
        ↓
   Controller creates new accessToken
        ↓
   Frontend saves new accessToken
        ↓
   Frontend retries dashboard request
*/

exports.refreshAccessToken =
    async function (
        req,
        res
    ) {

        try {

            /* ==========================================
               GET REFRESH TOKEN
            ========================================== */

            const refreshToken =
                req.body.refreshToken;


            if (!refreshToken) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Refresh token is required."

                });

            }


            /* ==========================================
               VERIFY REFRESH TOKEN
            ========================================== */

            let decodedToken;


            try {

                decodedToken =
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


            /* ==========================================
               GET WORKER ID
            ========================================== */

            const workerId =
                getWorkerIdFromToken(
                    decodedToken
                );


            if (!workerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid refresh token."

                });

            }


            /* ==========================================
               FIND WORKER
            ========================================== */

            const worker =
                await Worker.findById(
                    workerId
                );


            if (!worker) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Worker account could not be found."

                });

            }


            /* ==========================================
               CHECK STORED REFRESH TOKEN
            ========================================== */

            if (
                !worker.refreshTokenHash
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Refresh token is no longer valid."

                });

            }


            /* ==========================================
               COMPARE REFRESH TOKEN
               WITH STORED HASH
            ========================================== */

            const refreshTokenMatches =
                await bcrypt.compare(

                    refreshToken,

                    worker.refreshTokenHash

                );


            if (!refreshTokenMatches) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid refresh token."

                });

            }


            /* ==========================================
               CHECK ACCOUNT STATUS
            ========================================== */

            if (
                worker.accountStatus !==
                "active"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your worker account is not active."

                });

            }


            /* ==========================================
               CREATE NEW ACCESS TOKEN
            ========================================== */

            const newAccessToken =
                jwt.sign(

                    {
                        workerId:
                            worker._id.toString()
                    },

                    process.env.ACCESS_TOKEN_SECRET,

                    {
                        expiresIn:
                            process.env.ACCESS_TOKEN_EXPIRE
                    }

                );


            /* ==========================================
               RETURN NEW ACCESS TOKEN
            ========================================== */

            return res.status(200).json({

                success: true,

                message:
                    "Access token refreshed successfully.",

                accessToken:
                    newAccessToken

            });

        } catch (error) {

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
   9. UPDATE WORKER DASHBOARD
========================================================= */

/*
   Flow:

   Frontend sends PUT request
        ↓
   Controller validates accessToken
        ↓
   Controller finds worker
        ↓
   Controller validates submitted data
        ↓
   Controller updates worker
        ↓
   Controller returns updated profile
*/

exports.updateWorkerDashboard =
    async function (
        req,
        res
    ) {

        try {

            /* ==========================================
               GET ACCESS TOKEN
            ========================================== */

            const accessToken =
                getAccessTokenFromRequest(
                    req
                );


            if (!accessToken) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Access token is required."

                });

            }


            /* ==========================================
               VERIFY ACCESS TOKEN
            ========================================== */

            let decodedToken;


            try {

                decodedToken =
                    verifyAccessToken(
                        accessToken
                    );

            } catch (error) {

                if (
                    error.name ===
                    "TokenExpiredError"
                ) {

                    return res.status(401).json({

                        success: false,

                        code:
                            "ACCESS_TOKEN_EXPIRED",

                        message:
                            "Access token has expired."

                    });

                }


                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid access token."

                });

            }


            /* ==========================================
               GET WORKER ID
            ========================================== */

            const workerId =
                getWorkerIdFromToken(
                    decodedToken
                );


            if (!workerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid authentication token."

                });

            }


            /* ==========================================
               FIND WORKER
            ========================================== */

            const worker =
                await Worker.findById(
                    workerId
                );


            if (!worker) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Worker account could not be found."

                });

            }


            /* ==========================================
               CHECK ACCOUNT STATUS
            ========================================== */

            if (
                worker.accountStatus !==
                "active"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your worker account is not active."

                });

            }


            /* ==========================================
               GET SUBMITTED DATA
            ========================================== */

            const {

                fullName,

                phone,

                primarySkill,

                experience,

                startingPrice,

                city,

                state,

                description,

                profilePicture,

                portfolioImages

            } = req.body;


            /* ==========================================
               VALIDATE FULL NAME
            ========================================== */

            if (
                fullName !== undefined
            ) {

                if (
                    typeof fullName !==
                    "string" ||
                    !fullName.trim()
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Full name is required."

                    });

                }

            }


            /* ==========================================
               VALIDATE PHONE
            ========================================== */

            if (
                phone !== undefined &&
                (
                    typeof phone !==
                    "string" ||
                    !phone.trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide a valid phone number."

                });

            }


            /* ==========================================
               VALIDATE PRIMARY SKILL
            ========================================== */

            if (
                primarySkill !== undefined &&
                (
                    typeof primarySkill !==
                    "string" ||
                    !primarySkill.trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Primary skill is required."

                });

            }


            /* ==========================================
               VALIDATE EXPERIENCE
            ========================================== */

            if (
                experience !== undefined &&
                (
                    typeof experience !==
                    "string" ||
                    !experience.trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Experience is required."

                });

            }


            /* ==========================================
               VALIDATE STARTING PRICE
            ========================================== */

            if (
                startingPrice !== undefined &&
                (
                    typeof startingPrice !==
                    "string" ||
                    !startingPrice.trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Starting price is required."

                });

            }


            /* ==========================================
               VALIDATE LOCATION
            ========================================== */

            if (
                city !== undefined &&
                (
                    typeof city !==
                    "string" ||
                    !city.trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "City is required."

                });

            }


            if (
                state !== undefined &&
                (
                    typeof state !==
                    "string" ||
                    !state.trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "State is required."

                });

            }


            /* ==========================================
               VALIDATE DESCRIPTION
            ========================================== */

            if (
                description !== undefined &&
                typeof description !==
                "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Service description is invalid."

                });

            }


            /* ==========================================
               VALIDATE PROFILE PICTURE
            ========================================== */

            if (
                profilePicture !== undefined &&
                profilePicture !== null &&
                typeof profilePicture !==
                "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Profile picture is invalid."

                });

            }


            /* ==========================================
               VALIDATE PORTFOLIO
            ========================================== */

            if (
                portfolioImages !== undefined
            ) {

                if (
                    !Array.isArray(
                        portfolioImages
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Portfolio images must be an array."

                    });

                }


                if (
                    portfolioImages.length > 3
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "You can upload a maximum of 3 portfolio images."

                    });

                }

            }


            /* ==========================================
               UPDATE WORKER FIELDS
            ========================================== */

            if (
                fullName !== undefined
            ) {

                worker.fullName =
                    fullName.trim();

            }


            if (
                phone !== undefined
            ) {

                worker.phone =
                    phone.trim();

            }


            if (
                primarySkill !== undefined
            ) {

                worker.primarySkill =
                    primarySkill.trim();

            }


            if (
                experience !== undefined
            ) {

                worker.experience =
                    experience.trim();

            }


            if (
                startingPrice !== undefined
            ) {

                worker.startingPrice =
                    startingPrice.trim();

            }


            if (
                city !== undefined
            ) {

                worker.city =
                    city.trim();

            }


            if (
                state !== undefined
            ) {

                worker.state =
                    state.trim();

            }


            if (
                description !== undefined
            ) {

                worker.description =
                    description.trim();

            }


            if (
                profilePicture !== undefined
            ) {

                worker.profilePicture =
                    profilePicture;

            }


            if (
                portfolioImages !== undefined
            ) {

                worker.portfolioImages =
                    portfolioImages;

            }


            /* ==========================================
               SAVE UPDATED WORKER
            ========================================== */

            await worker.save();


            /* ==========================================
               RETURN UPDATED PROFILE
            ========================================== */

            return res.status(200).json({

                success: true,

                message:
                    "Worker profile updated successfully.",

                worker:
                    buildDashboardResponse(
                        worker
                    )

            });

        } catch (error) {

            console.error(
                "Update worker dashboard error:",
                error
            );


            /*
               Handle duplicate phone numbers.
            */

            if (
                error.code === 11000 &&
                error.keyPattern &&
                error.keyPattern.phone
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This phone number is already in use."

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update your profile."

            });

        }

    };


/* =========================================================
   10. LOGOUT WORKER
========================================================= */

/*
   Flow:

   Frontend sends refreshToken
        ↓
   Controller finds worker
        ↓
   Controller invalidates refreshToken
        ↓
   Controller removes refreshTokenHash
        ↓
   Frontend removes local tokens
        ↓
   Frontend redirects to authentication
*/

exports.logout =
    async function (
        req,
        res
    ) {

        try {

            /* ==========================================
               GET REFRESH TOKEN
            ========================================== */

            const refreshToken =
                req.body.refreshToken;


            /*
               If there is no refreshToken,
               there is nothing to revoke.

               We still return success because
               the frontend can safely clear its
               local authentication data.
            */

            if (!refreshToken) {

                return res.status(200).json({

                    success: true,

                    message:
                        "Worker logged out successfully."

                });

            }


            /* ==========================================
               VERIFY REFRESH TOKEN
            ========================================== */

            let decodedToken;


            try {

                decodedToken =
                    jwt.verify(

                        refreshToken,

                        process.env.REFRESH_TOKEN_SECRET

                    );

            } catch (error) {

                /*
                   Even if the token has already expired,
                   logout should still succeed locally.
                */

                return res.status(200).json({

                    success: true,

                    message:
                        "Worker logged out successfully."

                });

            }


            /* ==========================================
               GET WORKER ID
            ========================================== */

            const workerId =
                getWorkerIdFromToken(
                    decodedToken
                );


            if (!workerId) {

                return res.status(200).json({

                    success: true,

                    message:
                        "Worker logged out successfully."

                });

            }


            /* ==========================================
               FIND WORKER
            ========================================== */

            const worker =
                await Worker.findById(
                    workerId
                );


            if (!worker) {

                return res.status(200).json({

                    success: true,

                    message:
                        "Worker logged out successfully."

                });

            }


            /* ==========================================
               REVOKE REFRESH TOKEN
            ========================================== */

            worker.refreshTokenHash =
                null;


            await worker.save();


            /* ==========================================
               RETURN LOGOUT SUCCESS
            ========================================== */

            return res.status(200).json({

                success: true,

                message:
                    "Worker logged out successfully."

            });

        } catch (error) {

            console.error(
                "Worker logout error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to complete logout."

            });

        }

    };