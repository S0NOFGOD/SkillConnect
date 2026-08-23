/* =========================================================
   1. LOAD ENVIRONMENT VARIABLES
========================================================= */

/*
   Loads values from the backend .env file.

   Example:

   GMAIL_USER=yourgmail@gmail.com
   GMAIL_APP_PASSWORD=your-app-password
*/

require("dotenv").config();


/* =========================================================
   2. IMPORT CRYPTO
========================================================= */

/*
   crypto is used to generate a secure
   temporary reset authorization.
*/

const crypto =
    require("crypto");


/* =========================================================
   3. IMPORT WORKER MODEL
========================================================= */

/*
   The Worker model allows us to:

   - Find workers
   - Check password reset OTP
   - Save password reset OTP
   - Save reset authorization
*/

const Worker =
    require("../models/worker");


/* =========================================================
   4. IMPORT NODEMAILER
========================================================= */

/*
   Nodemailer is used to send emails
   through Gmail SMTP.
*/

const nodemailer =
    require("nodemailer");


/* =========================================================
   5. GENERATE SIX-DIGIT OTP
========================================================= */

/*
   Creates a six-digit password reset OTP.

   Example:

   483921
*/

const generateOTP =
    () => {

        return crypto
            .randomInt(
                100000,
                1000000
            )
            .toString();

    };


/* =========================================================
   6. CREATE OTP EXPIRATION
========================================================= */

/*
   Password reset OTPs are valid for
   10 minutes.
*/

const createOTPExpiry =
    () => {

        return new Date(

            Date.now() +
            10 * 60 * 1000

        );

    };


/* =========================================================
   7. CREATE GMAIL TRANSPORTER
========================================================= */

/*
   Nodemailer connects SkillConnect
   to Gmail's SMTP server.

   Gmail credentials come from:

   GMAIL_USER
   GMAIL_APP_PASSWORD

   IMPORTANT:

   GMAIL_APP_PASSWORD is the Google
   App Password, NOT the normal Gmail password.
*/

const transporter =
    nodemailer.createTransport({

        service:
            "gmail",

        auth: {

            user:
                process.env.GMAIL_USER,

            pass:
                process.env.GMAIL_APP_PASSWORD

        }

    });


/* =========================================================
   8. SEND PASSWORD RESET OTP EMAIL
========================================================= */

/*
   This function sends the password reset OTP
   to the worker's email address.
*/

const sendPasswordResetOTPEmail =
    async (
        email,
        otp
    ) => {

        /* ============================================
           CREATE EMAIL
        ============================================ */

        const mailOptions = {

            from:
                `"SkillConnect" <${process.env.GMAIL_USER}>`,

            to:
                email,

            subject:
                "SkillConnect Password Reset OTP",

            html: `

                <div
                    style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 30px;
                        color: #111827;
                    "
                >

                    <h2>
                        SkillConnect Password Reset
                    </h2>

                    <p>
                        You requested to reset your
                        SkillConnect worker account password.
                    </p>

                    <p>
                        Your password reset verification
                        code is:
                    </p>

                    <div
                        style="
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            padding: 20px;
                            text-align: center;
                            background: #f3f4f6;
                            border-radius: 10px;
                            margin: 20px 0;
                        "
                    >

                        ${otp}

                    </div>

                    <p>
                        This code expires in
                        <strong>10 minutes</strong>.
                    </p>

                    <p>
                        If you did not request a password
                        reset, you can safely ignore this email.
                    </p>

                    <p>
                        — SkillConnect
                    </p>

                </div>

            `

        };


        /* ============================================
           SEND EMAIL
        ============================================ */

        try {

            await transporter.sendMail(
                mailOptions
            );


            console.log(
                `Password reset OTP sent to ${email}`
            );


            return true;

        }

        catch (error) {

            console.error(
                "Gmail password reset email error:",
                error
            );


            throw new Error(
                "Unable to send password reset OTP."
            );

        }

    };


/* =========================================================
   9. GENERATE RESET AUTHORIZATION
========================================================= */

/*
   This generates a secure temporary value.

   IMPORTANT:

   This is NOT the OTP.

   The OTP proves that the worker has access
   to their email.

   The reset authorization allows the worker
   to continue to the password-change page.
*/

const generateResetAuthorization =
    () => {

        return crypto
            .randomBytes(32)
            .toString("hex");

    };


/* =========================================================
   10. CREATE RESET AUTHORIZATION EXPIRATION
========================================================= */

/*
   The reset authorization is valid for
   10 minutes.
*/

const createResetAuthorizationExpiry =
    () => {

        return new Date(

            Date.now() +
            10 * 60 * 1000

        );

    };


/* =========================================================
   11. VERIFY PASSWORD RESET OTP
========================================================= */

/*
   Endpoint:

   POST
   /api/auth/worker/password-reset-otp/verify


   Expected request:

   {
       "email": "worker@example.com",
       "otp": "482913"
   }


   FLOW:

   Receive email + OTP
          ↓
   Validate input
          ↓
   Find worker
          ↓
   Check passwordResetOTP
          ↓
   Compare OTP
          ↓
   Check OTP expiry
          ↓
   Generate reset authorization
          ↓
   Save authorization
          ↓
   Clear used OTP
          ↓
   Return reset authorization
*/

const verifyPasswordResetOTP =
    async (
        req,
        res
    ) => {

        try {

            /* ============================================
               11.1 GET DATA FROM FRONTEND
            ============================================ */

            const {
                email,
                otp
            } =
                req.body;


            /* ============================================
               11.2 VALIDATE INPUT
            ============================================ */

            if (
                !email ||
                !otp
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and OTP are required."

                });

            }


            /* ============================================
               11.3 NORMALIZE EMAIL
            ============================================ */

            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* ============================================
               11.4 VALIDATE OTP FORMAT
            ============================================ */

            if (
                !/^\d{6}$/.test(
                    String(otp).trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid OTP format."

                });

            }


            /* ============================================
               11.5 FIND WORKER
            ============================================ */

            const worker =
                await Worker.findOne({

                    email:
                        normalizedEmail

                });


            /* ============================================
               11.6 WORKER DOES NOT EXIST
            ============================================ */

            if (!worker) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Worker account was not found."

                });

            }


            /* ============================================
               11.7 CHECK PASSWORD RESET OTP
            ============================================ */

            /*
               If no OTP exists, the worker needs
               to request another OTP.
            */

            if (
                !worker.passwordResetOtp
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No active password reset OTP. Please request a new OTP."

                });

            }


            /* ============================================
               11.8 COMPARE OTP
            ============================================ */

            const enteredOTP =
                String(otp).trim();


            if (
                enteredOTP !==
                worker.passwordResetOtp
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Incorrect password reset OTP."

                });

            }


            /* ============================================
               11.9 CHECK OTP EXPIRATION
            ============================================ */

            if (
                !worker.passwordResetOtpExpires
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This password reset OTP has expired. Please request a new OTP."

                });

            }


            /* ============================================
               11.10 CHECK CURRENT TIME
            ============================================ */

            if (
                new Date() >
                worker.passwordResetOTPExpires
            ) {

                /* Clear expired OTP */

                worker.passwordResetOTP =
                    null;

                worker.passwordResetOTPExpires =
                    null;


                await worker.save();


                return res.status(400).json({

                    success: false,

                    message:
                        "This password reset OTP has expired. Please request a new OTP."

                });

            }


            /* ============================================
               11.11 MARK OTP AS VERIFIED
            ============================================ */

            /*
               The worker entered the correct OTP
               before it expired.
            */

            worker.passwordResetVerified =
                true;


            worker.passwordResetVerifiedAt =
                new Date();


            /* ============================================
               11.12 GENERATE RESET AUTHORIZATION
            ============================================ */

            const resetAuthorization =
                generateResetAuthorization();


            /* ============================================
               11.13 GENERATE AUTHORIZATION EXPIRY
            ============================================ */

            const resetAuthorizationExpires =
                createResetAuthorizationExpiry();


            /* ============================================
               11.14 SAVE RESET AUTHORIZATION
            ============================================ */

            worker.resetAuthorization =
                resetAuthorization;


            worker.resetAuthorizationExpires =
                resetAuthorizationExpires;


            /* ============================================
               11.15 CLEAR USED OTP
            ============================================ */

            /*
               The OTP has now been consumed.

               It cannot be reused.
            */

            worker.passwordResetOTP =
                null;


            worker.passwordResetOTPExpires =
                null;


            /* ============================================
               11.16 SAVE WORKER
            ============================================ */

            await worker.save();


            /* ============================================
               11.17 SUCCESS RESPONSE
            ============================================ */

            return res.status(200).json({

                success: true,

                message:
                    "Password reset OTP verified successfully.",

                resetAuthorization:
                    resetAuthorization,

                redirect:
                    "../worker-password-change/index.html"

            });

        }

        catch (error) {

            /* ============================================
               11.18 SERVER ERROR
            ============================================ */

            console.error(
                "Verify password reset OTP error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Something went wrong while verifying the OTP. Please try again."

            });

        }

    };


/* =========================================================
   12. RESEND PASSWORD RESET OTP
========================================================= */

/*
   Endpoint:

   POST
   /api/auth/worker/password-reset-otp/resend


   Expected request:

   {
       "email": "worker@example.com"
   }


   FLOW:

   Receive email
          ↓
   Validate email
          ↓
   Find worker
          ↓
   Worker doesn't exist
          ↓
   Generic response
          ↓
   Worker exists
          ↓
   Generate new OTP
          ↓
   Generate new expiry
          ↓
   Clear previous authorization
          ↓
   Save new OTP
          ↓
   Send OTP through Gmail
          ↓
   Success response
*/

const resendPasswordResetOTP =
    async (
        req,
        res
    ) => {

        try {

            /* ============================================
               12.1 GET EMAIL
            ============================================ */

            const {
                email
            } =
                req.body;


            /* ============================================
               12.2 VALIDATE EMAIL
            ============================================ */

            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email is required."

                });

            }


            /* ============================================
               12.3 NORMALIZE EMAIL
            ============================================ */

            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* ============================================
               12.4 VALIDATE EMAIL FORMAT
            ============================================ */

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(normalizedEmail)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid email address."

                });

            }


            /* ============================================
               12.5 FIND WORKER
            ============================================ */

            /*
               IMPORTANT:

               There is ONLY ONE worker declaration
               in this function.

               This prevents:

               SyntaxError:
               Identifier 'worker' has already been declared
            */

            const worker =
                await Worker.findOne({

                    email:
                        normalizedEmail

                });


            /* ============================================
               12.6 WORKER DOES NOT EXIST
            ============================================ */

            /*
               Do not reveal whether the email
               belongs to a SkillConnect account.
            */

            if (!worker) {

                return res.status(200).json({

                    success: true,

                    message:
                        "If an account exists for this email, a new password reset OTP has been sent."

                });

            }


            /* ============================================
               12.7 GENERATE NEW OTP
            ============================================ */

            const newOTP =
                generateOTP();


            /* ============================================
               12.8 GENERATE NEW OTP EXPIRY
            ============================================ */

            const newOTPExpiry =
                createOTPExpiry();


            /* ============================================
               12.9 SAVE NEW OTP
            ============================================ */

            worker.passwordResetOTP =
                newOTP;


            worker.passwordResetOTPExpires =
                newOTPExpiry;


            /* ============================================
               12.10 CLEAR OLD RESET AUTHORIZATION
            ============================================ */

            /*
               Requesting a new OTP starts a new
               password-reset process.

               Therefore any previous authorization
               must be invalidated.
            */

            worker.passwordResetVerified =
                false;


            worker.passwordResetVerifiedAt =
                null;


            worker.resetAuthorization =
                null;


            worker.resetAuthorizationExpires =
                null;


            /* ============================================
               12.11 SAVE WORKER
            ============================================ */

            await worker.save();


            /* ============================================
               12.12 SEND NEW OTP THROUGH GMAIL
            ============================================ */

            try {

                await sendPasswordResetOTPEmail(

                    worker.email,

                    newOTP

                );

            }

            catch (emailError) {

                /* ========================================
                   REMOVE OTP IF EMAIL FAILED
                ======================================== */

                worker.passwordResetOTP =
                    null;


                worker.passwordResetOTPExpires =
                    null;


                await worker.save();


                throw emailError;

            }


            /* ============================================
               12.13 SUCCESS RESPONSE
            ============================================ */

            return res.status(200).json({

                success: true,

                message:
                    "A new password reset OTP has been sent to your email."

            });

        }

        catch (error) {

            /* ============================================
               12.14 SERVER ERROR
            ============================================ */

            console.error(
                "Resend password reset OTP error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Something went wrong while sending the password reset OTP. Please try again."

            });

        }

    };


/* =========================================================
   13. EXPORT CONTROLLER FUNCTIONS
========================================================= */

/*
   The route file imports these functions.
*/

module.exports = {

    verifyPasswordResetOTP,

    resendPasswordResetOTP

};