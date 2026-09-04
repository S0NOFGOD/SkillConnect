/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const Worker =
    require("../models/worker");

const {
    generateGoogleExchangeCode,
    consumeGoogleExchangeCode
} =
    require("../utils/googleExchangeCode");

const {
    generateTokens
} =
    require("../utils/generateTokens");


/* =========================================================
   2. GOOGLE CALLBACK
========================================================= */

const googleCallback = async (
    req,
    res
) => {

    try {

        const {
            googleId,
            email,
            firstName,
            lastName,
            profilePicture
        } = req.user || {};


        /* -------------------------------------------------
           Validate Google authentication result
        ------------------------------------------------- */

        if (
            !googleId ||
            !email
        ) {

            return res.redirect(
                `${process.env.FRONTEND_URL}/worker-google-redirect/index.html?error=google-authentication-failed`
            );

        }


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* -------------------------------------------------
           Find existing worker
        ------------------------------------------------- */

        let worker =
            await Worker
                .findOne({
                    $or: [
                        {
                            googleId
                        },
                        {
                            email:
                                normalizedEmail
                        }
                    ]
                })
                .select("+googleId");


        /* =================================================
           2A. CREATE NEW GOOGLE ACCOUNT
        ================================================= */

        if (!worker) {

            worker =
                await Worker.create({

                    email:
                        normalizedEmail,

                    googleId,

                    authenticationMethod:
                        "google",

                    accountStatus:
                        "active",

                    isEmailVerified:
                        true,

                    profileCompleted:
                        false,

                    fullName:
                        `${firstName || ""} ${lastName || ""}`
                            .trim(),

                    profilePicture:
                        profilePicture || null

                });

        }


        /* =================================================
           2B. EXISTING PASSWORD ACCOUNT
        ================================================= */

        else if (
            worker.authenticationMethod ===
            "password"
        ) {

            const exchangeCode =
                await generateGoogleExchangeCode(
                    worker._id
                );


            return res.redirect(

                `${process.env.FRONTEND_URL}/worker-google-redirect/index.html?code=${encodeURIComponent(exchangeCode)}&error=login-required`

            );

        }


        /* =================================================
           2C. EXISTING GOOGLE ACCOUNT
        ================================================= */

        else {

            /* -------------------------------------------------
               Make sure Google ID is saved.
            ------------------------------------------------- */

            if (
                !worker.googleId
            ) {

                worker.googleId =
                    googleId;

                await worker.save();

            }

        }


        /* -------------------------------------------------
           Check account status
        ------------------------------------------------- */

        if (
            worker.accountStatus ===
            "suspended"
        ) {

            const exchangeCode =
                await generateGoogleExchangeCode(
                    worker._id
                );


            return res.redirect(

                `${process.env.FRONTEND_URL}/worker-google-redirect/index.html?code=${encodeURIComponent(exchangeCode)}&error=suspended`

            );

        }


        /* -------------------------------------------------
           Generate one-time exchange code
        ------------------------------------------------- */

        const exchangeCode =
            await generateGoogleExchangeCode(
                worker._id
            );


        /* -------------------------------------------------
           Redirect to frontend
        ------------------------------------------------- */

        return res.redirect(

            `${process.env.FRONTEND_URL}/worker-google-redirect/index.html?code=${encodeURIComponent(exchangeCode)}`

        );

    }

    catch (error) {

        console.error(
            "Google callback error:",
            error
        );

        return res.redirect(

            `${process.env.FRONTEND_URL}/worker-google-redirect/index.html?error=google-authentication-failed`

        );

    }

};


/* =========================================================
   3. EXCHANGE GOOGLE CODE
========================================================= */

const exchangeGoogleCode = async (
    req,
    res
) => {

    try {

        const {
            code
        } = req.body;


        /* -------------------------------------------------
           Validate exchange code
        ------------------------------------------------- */

        if (!code) {

            return res.status(400).json({

                success: false,

                message:
                    "Google authentication code is required."

            });

        }


        /* -------------------------------------------------
           Consume one-time exchange code
        ------------------------------------------------- */

        const googleData =
            await consumeGoogleExchangeCode(
                code
            );


        if (!googleData) {

            return res.status(401).json({

                success: false,

                message:
                    "Google authentication code is invalid or has expired."

            });

        }


        /* -------------------------------------------------
           Find worker
        ------------------------------------------------- */

        const worker =
            await Worker.findById(
                googleData.workerId
            );


        if (!worker) {

            return res.status(404).json({

                success: false,

                message:
                    "Worker account could not be found."

            });

        }


        /* -------------------------------------------------
           Check account status
        ------------------------------------------------- */

        if (
            worker.accountStatus ===
            "suspended"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been suspended.",

                nextStep:
                    "suspended"

            });

        }


        /* -------------------------------------------------
           Password account
        ------------------------------------------------- */

        if (
            worker.authenticationMethod ===
            "password"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This account uses email and password. Please log in with your password.",

                nextStep:
                    "login-required"

            });

        }


        /* -------------------------------------------------
           Profile incomplete
        ------------------------------------------------- */

        if (
            !worker.profileCompleted
        ) {

            return res.status(200).json({

                success: true,

                message:
                    "Google authentication successful. Please complete your worker profile.",

                email:
                    worker.email,

                nextStep:
                    "profile"

            });

        }


        /* -------------------------------------------------
           Generate access and refresh tokens
        ------------------------------------------------- */

        const {
            accessToken,
            refreshToken
        } =
            await generateTokens({

                userId:
                    worker._id.toString(),

                userType:
                    "worker"

            });


        /* -------------------------------------------------
           Set HTTP-only refresh token cookie
        ------------------------------------------------- */

        res.cookie(

            "refreshToken",

            refreshToken,

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

                maxAge:
                    7 * 24 * 60 * 60 * 1000,

                path:
                    "/"

            }

        );


        /* -------------------------------------------------
           Send authenticated response
        ------------------------------------------------- */

        return res.status(200).json({

            success: true,

            message:
                "Google authentication successful.",

            email:
                worker.email,

            accessToken,

            nextStep:
                "authenticated"

        });

    }

    catch (error) {

        console.error(
            "Google exchange error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to complete Google authentication. Please try again."

        });

    }

};


/* =========================================================
   4. EXPORT CONTROLLERS
========================================================= */

module.exports = {

    googleCallback,

    exchangeGoogleCode

};