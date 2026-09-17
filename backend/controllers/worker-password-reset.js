/* =========================================================
   SKILLCONNECT
   CONTROLLER — WORKER PASSWORD RESET OTP
========================================================= */


/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const crypto =
    require("crypto");

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


/* =========================================================
   2. VERIFY PASSWORD RESET OTP
========================================================= */

const verifyPasswordResetOTP =
    async (req, res) => {

        try {

            const {
                email,
                otp
            } =
                req.body;


            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (
                !email ||
                !otp
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Email and OTP are required."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();

            const normalizedOTP =
                otp
                    .trim();


            if (
                !/^\d{6}$/.test(
                    normalizedOTP
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "OTP must be a 6-digit code."

                });

            }


            /* -------------------------------------------------
               FIND WORKER
            ------------------------------------------------- */

            const worker = await Worker.findOne({
                
                email: normalizedEmail
            }).select("+passwordResetOtp +passwordResetOtpExpires");


            if (!worker) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Worker account not found."

                });

            }


            /* -------------------------------------------------
               CHECK ACTIVE OTP
            ------------------------------------------------- */

            if (
                !worker.passwordResetOtp
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "No active password reset code found. Please request a new code."

                });

            }


            /* -------------------------------------------------
               CHECK OTP
            ------------------------------------------------- */

            if (
                worker.passwordResetOtp !==
                normalizedOTP
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid password reset code."

                });

            }


            /* -------------------------------------------------
               CHECK OTP EXPIRATION
            ------------------------------------------------- */

            if (
                !worker.passwordResetOtpExpires
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Password reset code has expired. Please request a new code."

                });

            }


            if (
                new Date() >
                worker.passwordResetOtpExpires
            ) {

                worker.passwordResetOtp =
                    null;

                worker.passwordResetOtpExpires =
                    null;


                await worker.save();


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Password reset code has expired. Please request a new code."

                });

            }


            /* =================================================
               GENERATE RESET AUTHORIZATION
            ================================================= */

            const resetAuthorization =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            const resetAuthorizationExpires =
                new Date(

                    Date.now() +
                    10 *
                    60 *
                    1000

                );


            /* =================================================
               MARK PASSWORD RESET AS VERIFIED
            ================================================= */

            worker.passwordResetVerified =
                true;

            worker.passwordResetVerifiedAt =
                new Date();

            worker.resetAuthorization =
                resetAuthorization;

            worker.resetAuthorizationExpires =
                resetAuthorizationExpires;


            /* -------------------------------------------------
               CLEAR USED OTP
            ------------------------------------------------- */

            worker.passwordResetOtp =
                null;

            worker.passwordResetOtpExpires =
                null;


            await worker.save();


            /* -------------------------------------------------
               RESPONSE
            ------------------------------------------------- */

            return res.status(200).json({

                success:
                    true,

                message:
                    "Password reset code verified successfully.",

                resetAuthorization,

                redirect:
                    "../worker-password-change/index.html"

            });

        }

        catch (error) {

            console.error(
                "Worker password reset OTP verification error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "An error occurred while verifying the password reset code."

            });

        }

    };


/* =========================================================
   3. RESEND PASSWORD RESET OTP
========================================================= */

const resendPasswordResetOTP =
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
               EMAIL FORMAT VALIDATION
            ------------------------------------------------- */

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    normalizedEmail
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please provide a valid email address."

                });

            }


            /* -------------------------------------------------
               FIND WORKER
            ------------------------------------------------- */

            const worker =
                await Worker.findOne({

                    email:
                        normalizedEmail

                });


            if (!worker) {

                return res.status(200).json({

                    success:
                        true,

                    message:
                        "If an account exists with this email, a password reset code has been sent."

                });

            }


            /* =================================================
               GENERATE NEW PASSWORD RESET OTP
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


            /* -------------------------------------------------
               CLEAR PREVIOUS RESET AUTHORIZATION
            ------------------------------------------------- */

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

            try {

                await sendOTPEmail({

                    email:
                        worker.email,

                    otp,

                    type:
                        "password-reset"

                });

            }

            catch (emailError) {

                /* ---------------------------------------------
                   CLEAR OTP IF EMAIL COULD NOT BE SENT
                --------------------------------------------- */

                worker.passwordResetOtp =
                    null;

                worker.passwordResetOtpExpires =
                    null;


                await worker.save();


                throw emailError;

            }


            /* -------------------------------------------------
               RESPONSE
            ------------------------------------------------- */

            return res.status(200).json({

                success:
                    true,

                message:
                    "A new password reset code has been sent to your email."

            });

        }

        catch (error) {

            console.error(
                "Worker resend password reset OTP error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "An error occurred while sending the password reset code."

            });

        }

    };


/* =========================================================
   4. EXPORT
========================================================= */

module.exports = {

    verifyPasswordResetOTP,

    resendPasswordResetOTP

};