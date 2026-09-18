/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const jwt =
    require("jsonwebtoken");

const Worker =
    require("../models/worker");

    const cloudinary =
    require("../config/cloudinary");

const {
    generateOTPData
} =
    require("../utils/generateOtp");

const sendPhoneOtp =
    require("../utils/sendPhoneOtp");


/* =========================================================
   2. AUTHENTICATE ACCESS TOKEN
========================================================= */

const authenticateAccessToken = (
    req
) => {

    const authorization =
        req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        return null;

    }

    const accessToken =
        authorization
            .split(" ")[1];

    if (!accessToken) {

        return null;

    }

    try {

        const decoded =
            jwt.verify(
                accessToken,
                process.env.ACCESS_TOKEN_SECRET
            );

        if (
            decoded.userType !==
            "worker"
        ) {

            return null;

        }

        if (
            !decoded.userId
        ) {

            return null;

        }

        return decoded.userId;

    }

    catch (error) {

        return null;

    }

};


/* =========================================================
   3. SEND AUTHENTICATION ERROR
========================================================= */

const sendAuthenticationError = (
    res
) => {

    return res.status(401).json({

        success:
            false,

        message:
            "Your authentication session is invalid or has expired. Please sign in again."

    });

};


/* =========================================================
   4. FORMAT WORKER DATA
========================================================= */

const formatWorkerProfile = (
    worker
) => {

    /* -----------------------------------------------------
       Calculate total number of skills
    ----------------------------------------------------- */

    const totalSkills =
        Array.isArray(
            worker.skills
        )
            ? worker.skills.length
            : 0;


    /* -----------------------------------------------------
       Get first selected skill
    ----------------------------------------------------- */

    const skill =
        Array.isArray(
            worker.skills
        ) &&
        worker.skills.length > 0

            ? worker.skills[0]

            : "";


    /* -----------------------------------------------------
       Return safe dashboard information
    ----------------------------------------------------- */

    return {

        /* Worker name */
        fullName:
            worker.fullName || "",


        /* Worker profile photo */
        profilePhoto:worker.profilePhoto
        ? cloudinary.url(
            worker.profilePhoto,
            {
                secure: true
            }
        )
        : null,


        /* Worker phone */
        phone:
            worker.phone || "",


        /* Phone verification expiry */
        phoneVerificationExpires:
            worker.phoneVerificationExpires ||
            null,


        /* Worker location */
        country:
            worker.country || "",

        state:
            worker.state || "",

        city:
            worker.city || "",

        lga:
            worker.lga || "",


        /* Worker skills */
        totalSkills:
            totalSkills,

        skill:
            skill,


        /* Additional profile information */
        experience:
            worker.experience || "",

        socialProfile:
            worker.socialProfile || "",

        description:
            worker.description || ""

    };

};


/* =========================================================
   5. GET WORKER DASHBOARD
========================================================= */

const getWorkerDashboard =
    async (
        req,
        res
    ) => {

        try {

            /* ------------------------------------------------
               Authenticate access token
            ------------------------------------------------ */

            const workerId =
                authenticateAccessToken(
                    req
                );


            /* ------------------------------------------------
               Authentication failed
            ------------------------------------------------ */

            if (
                !workerId
            ) {

                return sendAuthenticationError(
                    res
                );

            }


            /* ------------------------------------------------
               Find worker
            ------------------------------------------------ */

            const worker =
                await Worker.findById(
                    workerId
                );


            /* ------------------------------------------------
               Worker does not exist
            ------------------------------------------------ */

            if (
                !worker
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Worker account not found."

                });

            }


            /* ------------------------------------------------
               Return dashboard information
            ------------------------------------------------ */

            return res.status(200).json({

                success:
                    true,

                worker:
                    formatWorkerProfile(
                        worker
                    )

            });

        }

        catch (error) {

            console.error(
                "Get worker dashboard error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load your dashboard. Please try again."

            });

        }

    };


/* =========================================================
   6. START PHONE VERIFICATION
========================================================= */

const verifyWorkerPhone =
    async (
        req,
        res
    ) => {

        try {

            /* ------------------------------------------------
               Authenticate access token
            ------------------------------------------------ */

            const workerId =
                authenticateAccessToken(
                    req
                );


            /* ------------------------------------------------
               Authentication failed
            ------------------------------------------------ */

            if (
                !workerId
            ) {

                return sendAuthenticationError(
                    res
                );

            }


            /* ------------------------------------------------
               Find worker
            ------------------------------------------------ */

            const worker =
                await Worker.findById(
                    workerId
                );


            /* ------------------------------------------------
               Worker does not exist
            ------------------------------------------------ */

            if (
                !worker
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Worker account not found."

                });

            }


            /* ------------------------------------------------
               Make sure worker has a phone number
            ------------------------------------------------ */

            if (
                !worker.phone
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please add a phone number before verifying your profile."

                });

            }


            /* ------------------------------------------------
               Check existing phone verification
            ------------------------------------------------ */

            if (

                worker.phoneVerificationExpires &&

                new Date(
                    worker.phoneVerificationExpires
                ) > new Date()

            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Your phone number is already verified."

                });

            }


            /* =================================================
               7. GENERATE PHONE OTP
            ================================================= */

            const {
                otp,
                expiresAt
            } =
                generateOTPData();


            /* =================================================
               8. SEND OTP THROUGH SMS
            ================================================= */

            await sendPhoneOtp(
                worker.phone,
                otp
            );


            /* =================================================
               9. SAVE OTP AFTER SMS SUCCESS
            ================================================= */

            worker.phoneOtp =
                otp;


            worker.phoneOtpExpires =
                expiresAt;


            await worker.save();


            /* =================================================
               10. RETURN SUCCESS
            ================================================= */

            /*
               NEVER send the OTP itself to the frontend.
            */

            return res.status(200).json({

                success:
                    true,

                message:
                    "A verification code has been sent to your phone.",

                phone:
                    worker.phone

            });

        }

        catch (error) {

            /* ------------------------------------------------
               Log actual server error
            ------------------------------------------------ */

            console.error(
                "Worker phone verification error:",
                error
            );


            /* ------------------------------------------------
               Return safe error to frontend
            ------------------------------------------------ */

            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to send your phone verification code. Please try again."

            });

        }

    };


/* =========================================================
   11. LOGOUT WORKER
========================================================= */

const logoutWorker =
    async (
        req,
        res
    ) => {

        try {

            /* ------------------------------------------------
               Authenticate access token
            ------------------------------------------------ */

            const workerId =
                authenticateAccessToken(
                    req
                );


            /* ------------------------------------------------
               Authentication failed
            ------------------------------------------------ */

            if (
                !workerId
            ) {

                return sendAuthenticationError(
                    res
                );

            }


            /* ------------------------------------------------
               Find worker
            ------------------------------------------------ */

            const worker =
                await Worker.findById(
                    workerId
                );


            /* ------------------------------------------------
               Worker does not exist
            ------------------------------------------------ */

            if (
                !worker
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Worker account not found."

                });

            }


            /* ------------------------------------------------
               Revoke refresh token
            ------------------------------------------------ */

            worker.refreshTokenHash =
                null;


            await worker.save();


            /* ------------------------------------------------
               Clear refresh-token cookie
            ------------------------------------------------ */

            res.clearCookie(
                "refreshToken",
                {

                    httpOnly:
                        true,

                    secure:
                        process.env.NODE_ENV ===
                        "production",

                    sameSite:
                        process.env.NODE_ENV ===
                        "production"

                            ? "none"

                            : "lax",

                    path:
                        "/"

                }
            );


            /* ------------------------------------------------
               Return successful logout response
            ------------------------------------------------ */

            return res.status(200).json({

                success:
                    true,

                message:
                    "Logged out successfully."

            });

        }

        catch (error) {

            console.error(
                "Worker logout error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to log out. Please try again."

            });

        }

    };


/* =========================================================
   12. EXPORT CONTROLLERS
========================================================= */

module.exports = {

    getWorkerDashboard,

    verifyWorkerPhone,

    logoutWorker

};