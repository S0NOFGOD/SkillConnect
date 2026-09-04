/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const bcrypt =
    require("bcryptjs");

const Worker =
    require("../models/worker");

const {
    sendOTP
} =
    require("../utils/generateOtp");

const {
    generateTokens
} =
    require("../utils/generateTokens");



/* =========================================================
   2. CREATE WORKER ACCOUNT
========================================================= */

const signupWorker = async (
    req,
    res
) => {

    try {

        const {
            email,
            password
        } = req.body;


        /* -------------------------------------------------
           Validate required fields
        ------------------------------------------------- */

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        /* -------------------------------------------------
           Validate password length
        ------------------------------------------------- */

        if (
            password.length < 8
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 8 characters."

            });

        }


        /* -------------------------------------------------
           Normalize email
        ------------------------------------------------- */

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* -------------------------------------------------
           Check whether worker already exists
        ------------------------------------------------- */

        const existingWorker =
            await Worker.findOne({
                email: normalizedEmail
            });


        if (existingWorker) {

            return res.status(409).json({

                success: false,

                message:
                    "An account with this email already exists."

            });

        }


        /* -------------------------------------------------
           Hash password
        ------------------------------------------------- */

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );


        /* -------------------------------------------------
           Create worker
        ------------------------------------------------- */

        const worker =
            await Worker.create({

                email:
                    normalizedEmail,

                passwordHash:
                    passwordHash,

                authenticationMethod:
                    "password",

                accountStatus:
                    "active",

                isEmailVerified:
                    false,

                profileCompleted:
                    false

            });


        /* -------------------------------------------------
           Generate and send email OTP
        ------------------------------------------------- */

        await sendOTP({

            workerId:
                worker._id,

            type:
                "email-verification"

        });


        /* -------------------------------------------------
           Send response
        ------------------------------------------------- */

        return res.status(201).json({

            success: true,

            message:
                "Account created successfully. A verification code has been sent to your email.",

            email:
                worker.email,

            nextStep:
                "email-verification"

        });

    }

    catch (error) {

        console.error(
            "Worker signup error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to create your account. Please try again."

        });

    }

};



/* =========================================================
   3. WORKER LOGIN
========================================================= */

const loginWorker = async (
    req,
    res
) => {

    try {

        const {
            email,
            password
        } = req.body;


        /* -------------------------------------------------
           Validate required fields
        ------------------------------------------------- */

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        /* -------------------------------------------------
           Normalize email
        ------------------------------------------------- */

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* -------------------------------------------------
           Find worker
           
           passwordHash is select:false in the model,
           so explicitly include it.
        ------------------------------------------------- */

        const worker =
            await Worker
                .findOne({
                    email: normalizedEmail
                })
                .select("+passwordHash");


        /* -------------------------------------------------
           Generic authentication error
           
           Do not reveal whether the email exists.
        ------------------------------------------------- */

        if (!worker) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        /* -------------------------------------------------
           Check authentication method
        ------------------------------------------------- */

        if (
            worker.authenticationMethod ===
            "google"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This account was created with Google. Please continue with Google."

            });

        }


        /* -------------------------------------------------
           Check password
        ------------------------------------------------- */

        const passwordMatches =
            await bcrypt.compare(
                password,
                worker.passwordHash
            );


        if (!passwordMatches) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

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
                    "Your account has been suspended. Please contact SkillConnect support."

            });

        }


        /* -------------------------------------------------
           Check email verification
        ------------------------------------------------- */

        if (
            !worker.isEmailVerified
        ) {

            await sendOTP({

                workerId:
                    worker._id,

                type:
                    "email-verification"

            });


            return res.status(200).json({

                success: true,

                message:
                    "Your email is not verified. A new verification code has been sent to your email.",

                email:
                    worker.email,

                nextStep:
                    "email-verification"

            });

        }


        /* -------------------------------------------------
           Check profile completion
        ------------------------------------------------- */

        if (
            !worker.profileCompleted
        ) {

            return res.status(200).json({

                success: true,

                message:
                    "Please complete your worker profile.",

                email:
                    worker.email,

                nextStep:
                    "profile"

            });

        }


        /* -------------------------------------------------
           Generate access and refresh tokens
           
           generateTokens() also hashes the refresh
           token and saves refreshTokenHash in MongoDB.
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
                "Login successful.",

            accessToken,

            email:
                worker.email,

            nextStep:
                "authenticated"

        });

    }

    catch (error) {

        console.error(
            "Worker login error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to log you in. Please try again."

        });

    }

};



/* =========================================================
   4. FORGOT PASSWORD
========================================================= */

const forgotPassword = async (
    req,
    res
) => {

    try {

        const {
            email
        } = req.body;


        /* -------------------------------------------------
           Validate email
        ------------------------------------------------- */

        if (!email) {

            return res.status(400).json({

                success: false,

                message:
                    "Email is required."

            });

        }


        /* -------------------------------------------------
           Normalize email
        ------------------------------------------------- */

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* -------------------------------------------------
           Find worker
        ------------------------------------------------- */

        const worker =
            await Worker.findOne({

                email:
                    normalizedEmail

            });


        /* -------------------------------------------------
           Do not reveal whether account exists
        ------------------------------------------------- */

        if (!worker) {

            return res.status(200).json({

                success: true,

                emailExists: false,

                message:
                    "If an account with this email exists, you will receive a password reset code."

            });

        }


        /* -------------------------------------------------
           Google-only account
        ------------------------------------------------- */

        if (
            worker.authenticationMethod ===
            "google"
        ) {

            return res.status(200).json({

                success: true,

                emailExists: true,

                message:
                    "This account uses Google authentication. Please continue with Google."

            });

        }


        /* -------------------------------------------------
           Generate and send password reset OTP
        ------------------------------------------------- */

        await sendOTP({

            workerId:
                worker._id,

            type:
                "password-reset"

        });


        /* -------------------------------------------------
           Send response
        ------------------------------------------------- */

        return res.status(200).json({

            success: true,

            emailExists: true,

            email:
                worker.email,

            message:
                "A password reset code has been sent to your email."

        });

    }

    catch (error) {

        console.error(
            "Worker forgot password error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to process your password reset request. Please try again."

        });

    }

};



/* =========================================================
   5. EXPORT CONTROLLERS
========================================================= */

module.exports = {

    signupWorker,

    loginWorker,

    forgotPassword

};