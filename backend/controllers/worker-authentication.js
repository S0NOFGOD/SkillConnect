/* =========================================================
   SKILLCONNECT
   CONTROLLER — WORKER AUTHENTICATION
========================================================= */


/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const bcrypt =
    require("bcrypt");

const Worker =
    require("../models/worker");

const {
    generateOTPData
} =
    require("../utils/generateOtp");

const {
    sendOTPEmail
} =
    require("../utils/sendEmailOtp");

const {
    generateTokens
} =
    require("../utils/generateTokens");


/* =========================================================
   2. SIGN UP WORKER
========================================================= */

const signupWorker =
    async (req, res) => {

        try {

            const {
                email,
                password
            } =
                req.body;


            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Email and password are required."

                });

            }


            if (
                password.length < 8
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Password must be at least 8 characters."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* -------------------------------------------------
               CHECK EXISTING WORKER
            ------------------------------------------------- */

            const existingWorker =
                await Worker.findOne({

                    email:
                        normalizedEmail

                });


            if (existingWorker) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "An account with this email already exists."

                });

            }


            /* -------------------------------------------------
               HASH PASSWORD
            ------------------------------------------------- */

            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            /* -------------------------------------------------
               CREATE WORKER
            ------------------------------------------------- */

            const worker =
                await Worker.create({

                    email:
                        normalizedEmail,

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


            /* =================================================
               GENERATE EMAIL VERIFICATION OTP
            ================================================= */

            const {
                otp,
                expiresAt
            } =
                generateOTPData();


            worker.emailOtp =
                otp;

            worker.emailOtpExpires =
                expiresAt;


            await worker.save();


            /* =================================================
               SEND EMAIL VERIFICATION OTP
            ================================================= */

            await sendOTPEmail({

                email:
                    worker.email,

                otp,

                type:
                    "email-verification"

            });


            /* -------------------------------------------------
               RESPONSE
            ------------------------------------------------- */

            return res.status(201).json({

                success:
                    true,

                message:
                    "Worker account created successfully. A verification code has been sent to your email.",

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

                success:
                    false,

                message:
                    "An error occurred while creating your worker account."

            });

        }

    };


/* =========================================================
   3. LOGIN WORKER
========================================================= */

const loginWorker =
    async (req, res) => {

        try {

            const {
                email,
                password
            } =
                req.body;


            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Email and password are required."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* -------------------------------------------------
               FIND WORKER
            ------------------------------------------------- */

            const worker =
                await Worker.findOne({

                    email:
                        normalizedEmail

                })
                .select(
                    "+passwordHash"
                );


            if (!worker) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Invalid email or password."

                });

            }


            /* -------------------------------------------------
               CHECK AUTHENTICATION METHOD
            ------------------------------------------------- */

            if (
                worker.authenticationMethod ===
                "google"
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "This account uses Google authentication. Please continue with Google."

                });

            }


            /* -------------------------------------------------
               COMPARE PASSWORD
            ------------------------------------------------- */

            const passwordMatch =
                await bcrypt.compare(

                    password,

                    worker.passwordHash

                );


            if (!passwordMatch) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Invalid email or password."

                });

            }


            /* -------------------------------------------------
               CHECK ACCOUNT STATUS
            ------------------------------------------------- */

            if (
                worker.accountStatus ===
                "suspended"
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "Your account has been suspended."

                });

            }


            /* =================================================
               EMAIL VERIFICATION
            ================================================= */

            if (
                !worker.isEmailVerified
            ) {

                const {
                    otp,
                    expiresAt
                } =
                    generateOTPData();


                worker.emailOtp =
                    otp;

                worker.emailOtpExpires =
                    expiresAt;


                await worker.save();


                await sendOTPEmail({

                    email:
                        worker.email,

                    otp,

                    type:
                        "email-verification"

                });


                return res.status(200).json({

                    success:
                        true,

                    message:
                        "Your email is not verified. A new verification code has been sent to your email.",

                    email:
                        worker.email,

                    nextStep:
                        "email-verification"

                });

            }


            /* =================================================
               PROFILE COMPLETION
            ================================================= */

            if (
                !worker.profileCompleted
            ) {

                return res.status(200).json({

                    success:
                        true,

                    message:
                        "Please complete your worker profile.",

                    email:
                        worker.email,

                    nextStep:
                        "profile"

                });

            }


            /* =================================================
               GENERATE TOKENS
            ================================================= */

            const {
                accessToken,
                refreshToken
            } =
                await generateTokens({

                    userId:
                        worker._id,

                    userType:
                        "worker"

                });


            /* =================================================
               SET REFRESH TOKEN COOKIE
            ================================================= */

            res.cookie(

                "refreshToken",

                refreshToken,

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

                    maxAge:
                        7 *
                        24 *
                        60 *
                        60 *
                        1000,

                    path:
                        "/"

                }

            );


            /* -------------------------------------------------
               RESPONSE
            ------------------------------------------------- */

            return res.status(200).json({

                success:
                    true,

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

                success:
                    false,

                message:
                    "An error occurred while logging in."

            });

        }

    };


/* =========================================================
   4. FORGOT PASSWORD
========================================================= */

const forgotPassword =
    async (req, res) => {

        try {

            const {
                email
            } =
                req.body;


            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (!email) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Email is required."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* -------------------------------------------------
               FIND WORKER
            ------------------------------------------------- */

            const worker =
                await Worker.findOne({

                    email:
                        normalizedEmail

                });


            /* -------------------------------------------------
               ACCOUNT NOT FOUND
            ------------------------------------------------- */

            if (!worker) {

                return res.status(200).json({

                    success:
                        true,

                    emailExists:
                        false,

                    message:
                        "If an account exists with this email, password reset instructions will be sent."

                });

            }


            /* -------------------------------------------------
               GOOGLE AUTHENTICATION
            ------------------------------------------------- */

            if (
                worker.authenticationMethod ===
                "google"
            ) {

                return res.status(200).json({

                    success:
                        true,

                    emailExists:
                        true,

                    message:
                        "This account uses Google authentication. Please continue with Google."

                });

            }


            /* =================================================
               GENERATE PASSWORD RESET OTP
            ================================================= */

            const {
                otp,
                expiresAt
            } =
                generateOTPData();


            worker.passwordResetOtp =
                otp;

            worker.passwordResetOtpExpires =
                expiresAt;

            worker.passwordResetVerified =
                false;

            worker.passwordResetVerifiedAt =
                null;

            worker.resetAuthorization =
                null;

            worker.resetAuthorizationExpires =
                null;


            await worker.save();


            /* =================================================
               SEND PASSWORD RESET OTP
            ================================================= */

            await sendOTPEmail({

                email:
                    worker.email,

                otp,

                type:
                    "password-reset"

            });


            /* -------------------------------------------------
               RESPONSE
            ------------------------------------------------- */

            return res.status(200).json({

                success:
                    true,

                emailExists:
                    true,

                email:
                    worker.email,

                message:
                    "A password reset verification code has been sent to your email."

            });

        }

        catch (error) {

            console.error(
                "Worker forgot password error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "An error occurred while processing your password reset request."

            });

        }

    };


/* =========================================================
   5. EXPORT
========================================================= */

module.exports = {

    signupWorker,

    loginWorker,

    forgotPassword

};