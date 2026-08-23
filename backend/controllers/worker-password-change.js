/* =========================================================
   SKILLCONNECT WORKER PASSWORD CHANGE CONTROLLER

   This controller handles the final stage of the
   worker forgot-password process.

   FLOW:

   Frontend sends:
       email
       resetAuthorization
       newPassword

            ↓

   Find worker

            ↓

   Worker does not exist
            ↓
   Error response

            ↓

   Worker exists
            ↓

   Check resetAuthorization

            ↓

   Invalid or expired
            ↓
   Error response

            ↓

   Valid resetAuthorization
            ↓

   Hash new password

            ↓

   Update worker password

            ↓

   Clear resetAuthorization

            ↓

   Clear passwordResetOTP

            ↓

   Clear passwordResetOTPExpires

            ↓

   Save worker

            ↓

   Success response

========================================================= */


/* =========================================================
   1. IMPORT WORKER MODEL
========================================================= */

const Worker =
    require("../models/worker");


/* =========================================================
   2. IMPORT BCRYPT
========================================================= */

const bcrypt =
    require("bcryptjs");


/* =========================================================
   3. CHANGE WORKER PASSWORD
========================================================= */

const changeWorkerPassword =
    async (req, res) => {

        try {


            /* =============================================
               4. GET DATA FROM FRONTEND
            ============================================= */

            const {
                email,
                resetAuthorization,
                newPassword
            } = req.body;


            /* =============================================
               5. CHECK REQUIRED VALUES
            ============================================= */

            if (
                !email ||
                !resetAuthorization ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email, reset authorization and new password are required."

                });

            }


            /* =============================================
               6. CHECK PASSWORD LENGTH
            ============================================= */

            /*
               FRONTEND AND BACKEND MUST AGREE.

               Password requirement:

               Minimum 8 characters.

               No 150-word limit.
               No 1500-character limit.
               No uppercase requirement.
               No lowercase requirement.
               No number requirement.
               No special-character requirement.
            */

            if (
                newPassword.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must contain at least 8 characters."

                });

            }


            /* =============================================
               7. FIND WORKER
            ============================================= */

            const worker =
                await Worker.findOne({

                    email:
                        email.toLowerCase().trim()

                });


            /* =============================================
               8. WORKER NOT FOUND
            ============================================= */

            if (!worker) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Worker account was not found."

                });

            }


            /* =============================================
               9. CHECK RESET AUTHORIZATION
            ============================================= */

            if (
                !worker.resetAuthorization ||
                worker.resetAuthorization !==
                    resetAuthorization
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Your password reset authorization is invalid or expired. Please restart the password reset process."

                });

            }


            /* =============================================
               10. CHECK RESET AUTHORIZATION EXPIRATION
            ============================================= */

            if (
                worker.resetAuthorizationExpires &&
                worker.resetAuthorizationExpires <
                    new Date()
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Your password reset authorization has expired. Please restart the password reset process."

                });

            }


            /* =============================================
               11. HASH NEW PASSWORD
            ============================================= */

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    12
                );


            /* =============================================
               12. UPDATE PASSWORD
            ============================================= */

            worker.password =
                hashedPassword;


            /* =============================================
               13. CLEAR RESET AUTHORIZATION
            ============================================= */

            worker.resetAuthorization =
                null;


            /* =============================================
               14. CLEAR PASSWORD RESET OTP
            ============================================= */

            worker.passwordResetOTP =
                null;


            /* =============================================
               15. CLEAR PASSWORD RESET OTP EXPIRATION
            ============================================= */

            worker.passwordResetOTPExpires =
                null;


            /* =============================================
               16. CLEAR RESET AUTHORIZATION EXPIRATION
            ============================================= */

            worker.resetAuthorizationExpires =
                null;


            /* =============================================
               17. SAVE WORKER
            ============================================= */

            await worker.save();


            /* =============================================
               18. SUCCESS RESPONSE
            ============================================= */

            return res.status(200).json({

                success: true,

                message:
                    "Your password has been changed successfully. You can now log in with your new password."

            });


        } catch (error) {


            /* =============================================
               19. LOG SERVER ERROR
            ============================================= */

            console.error(
                "Worker password change error:",
                error
            );


            /* =============================================
               20. SEND SERVER ERROR
            ============================================= */

            return res.status(500).json({

                success: false,

                message:
                    "Something went wrong while changing your password. Please try again."

            });

        }

    };


/* =========================================================
   21. EXPORT CONTROLLER
========================================================= */

module.exports = {

    changeWorkerPassword

};