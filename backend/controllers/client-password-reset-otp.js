/* =========================================================
   SKILLCONNECT CLIENT PASSWORD RESET OTP CONTROLLER

   This file controls the client password reset OTP flow.

   It handles:

   1. Verify password reset OTP
   2. Check client email
   3. Check password reset OTP
   4. Check OTP expiry
   5. Generate reset authorization
   6. Save reset authorization
   7. Clear used OTP
   8. Generate a new reset OTP
   9. Generate a new OTP expiry
   10. Send password reset OTP through Gmail

   IMPORTANT:

   This controller does NOT use:

   - Resend
   - RESEND_API_KEY
   - EMAIL_FROM
   - otpPurpose

   The password reset OTP uses only:

   - passwordResetOtp
   - passwordResetOtpExpires

   The reset authorization uses:

   - resetAuthorization
   - resetAuthorizationExpires

   The FRONTEND is responsible for displaying
   success/error responses using modals.
========================================================= */


/* =========================================================
   1. IMPORT CLIENT MODEL
========================================================= */

/*
   The Client model allows us to:

   - Find the client
   - Check the password reset OTP
   - Save a new OTP
   - Save reset authorization
*/

const Client =
    require("../models/client");



/* =========================================================
   2. IMPORT CRYPTO
========================================================= */

/*
   Node's built-in crypto module is used to:

   - Generate secure OTPs
   - Generate secure reset authorization

   No external utility file is required.
*/

const crypto =
    require("crypto");



/* =========================================================
   3. IMPORT NODEMAILER
========================================================= */

/*
   Nodemailer is used to send the password
   reset OTP through Gmail SMTP.

   Gmail credentials come from:

   process.env.GMAIL_USER
   process.env.GMAIL_APP_PASSWORD

   We NEVER hard-code the Gmail credentials
   inside this controller.
*/

const nodemailer =
    require("nodemailer");



/* =========================================================
   4. LOAD ENVIRONMENT VARIABLES
========================================================= */

/*
   Loads variables from the backend .env file.

   Examples:

   GMAIL_USER=yourgmail@gmail.com

   GMAIL_APP_PASSWORD=your16characterapppassword
*/

require("dotenv").config();



/* =========================================================
   5. CONSTANTS
========================================================= */

/*
   Password reset OTP lifetime:

   10 minutes
*/

const OTP_EXPIRY_MINUTES =
    10;


/*
   Reset authorization lifetime:

   10 minutes

   This authorization will later be used by
   the Client Password Change page.
*/

const RESET_AUTHORIZATION_EXPIRY_MINUTES =
    10;



/* =========================================================
   6. GENERATE SIX-DIGIT OTP
========================================================= */

/*
   Generates a secure six-digit OTP.

   Example:

   483921
*/

const generateOTP = () => {

    return crypto
        .randomInt(
            100000,
            1000000
        )
        .toString();

};



/* =========================================================
   7. GENERATE RESET AUTHORIZATION
========================================================= */

/*
   Generates a cryptographically secure random value.

   IMPORTANT:

   This is NOT the password reset OTP.

   The OTP proves that the client has access
   to the email account.

   The reset authorization allows the client
   to continue to the password-change page
   after successful OTP verification.
*/

const generateResetAuthorization = () => {

    return crypto
        .randomBytes(32)
        .toString("hex");

};



/* =========================================================
   8. SEND PASSWORD RESET OTP EMAIL
========================================================= */

/*
   This function sends the password reset OTP
   through Gmail SMTP.

   Gmail credentials come from:

   process.env.GMAIL_USER

   process.env.GMAIL_APP_PASSWORD

   We do NOT use:

   - Resend
   - RESEND_API_KEY
   - EMAIL_FROM
   - otpPurpose
*/

const sendPasswordResetOTPEmail =
    async (
        email,
        otp
    ) => {


        /* ================================================
           8.1 CREATE GMAIL TRANSPORTER
        ================================================ */

        /*
           Nodemailer connects SkillConnect
           to Gmail's SMTP server.
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



        /* ================================================
           8.2 CREATE EMAIL
        ================================================ */

        const mailOptions = {

            from:
                `"SkillConnect" <${process.env.GMAIL_USER}>`,

            to:
                email,

            subject:
                "Your SkillConnect Password Reset OTP",

            html: `

                <div
                    style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 30px;
                        background: #020617;
                        color: #ffffff;
                        border-radius: 16px;
                    "
                >

                    <h2
                        style="
                            color: #3b82f6;
                        "
                    >
                        SkillConnect
                    </h2>


                    <p>
                        You requested a new
                        password reset code.
                    </p>


                    <p>
                        Your 6-digit OTP is:
                    </p>


                    <div
                        style="
                            margin: 25px 0;
                            padding: 18px;
                            text-align: center;
                            background: #111827;
                            border-radius: 12px;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            color: #3b82f6;
                        "
                    >

                        ${otp}

                    </div>


                    <p>
                        This OTP will expire
                        in 10 minutes.
                    </p>


                    <p
                        style="
                            color: #94a3b8;
                        "
                    >
                        If you did not request
                        a password reset, you
                        can safely ignore this email.
                    </p>


                    <p>
                        — SkillConnect
                    </p>

                </div>

            `

        };



        /* ================================================
           8.3 SEND EMAIL
        ================================================ */

        try {

            await transporter.sendMail(
                mailOptions
            );


            console.log(
                `Client password reset OTP sent to ${email}`
            );


            return true;

        }


        catch (error) {

            console.error(
                "Gmail client password reset email error:",
                error
            );


            throw new Error(
                "Unable to send password reset OTP."
            );

        }

    };



/* =========================================================
   9. VERIFY CLIENT PASSWORD RESET OTP
========================================================= */

/*
   Endpoint:

   POST
   /api/auth/client/password-reset-otp/verify


   Expected request body:

   {
       "clientEmail": "client@example.com",
       "otp": "123456"
   }


   FLOW:

   Find client
        ↓
   Client does not exist
        ↓
   Error response

   Client exists
        ↓
   Check passwordResetOtp
        ↓
   OTP does not exist
        ↓
   Error response

   OTP exists
        ↓
   Compare OTP
        ↓
   Wrong OTP
        ↓
   Error response

   Correct OTP
        ↓
   Check expiry
        ↓
   Expired
        ↓
   Clear OTP
        ↓
   Error response

   Valid OTP
        ↓
   Generate resetAuthorization
        ↓
   Generate resetAuthorizationExpires
        ↓
   Clear passwordResetOtp
        ↓
   Clear passwordResetOtpExpires
        ↓
   Save reset authorization
        ↓
   Save client
        ↓
   Return resetAuthorization
        ↓
   Frontend saves authorization
        ↓
   Password change page
*/

const verifyClientPasswordResetOTP =
    async (
        req,
        res
    ) => {

        try {


            /* ============================================
               9.1 GET REQUEST DATA
            ============================================ */

            const {
                clientEmail,
                otp
            } =
                req.body;



            /* ============================================
               9.2 VALIDATE CLIENT EMAIL
            ============================================ */

            if (
                !clientEmail ||
                typeof clientEmail !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Client email is required."

                });

            }



            /* ============================================
               9.3 VALIDATE OTP
            ============================================ */

            if (
                !otp ||
                typeof otp !== "string" ||
                !/^\d{6}$/.test(
                    otp.trim()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid 6-digit OTP."

                });

            }



            /* ============================================
               9.4 NORMALIZE EMAIL
            ============================================ */

            const normalizedEmail =
                clientEmail
                    .trim()
                    .toLowerCase();



            /* ============================================
               9.5 FIND CLIENT
            ============================================ */

            const client =
                await Client.findOne({

                    email:
                        normalizedEmail

                });



            /* ============================================
               9.6 CLIENT DOES NOT EXIST
            ============================================ */

            if (!client) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client account was not found."

                });

            }



            /* ============================================
               9.7 CHECK WHETHER OTP EXISTS
            ============================================ */

            /*
               The password reset OTP is stored in:

               client.passwordResetOtp
            */

            if (
                !client.passwordResetOtp
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "The password reset OTP is invalid or has already been used."

                });

            }



            /* ============================================
               9.8 COMPARE OTP
            ============================================ */

            const enteredOTP =
                otp.trim();


            if (
                client.passwordResetOtp !==
                enteredOTP
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "The password reset OTP is incorrect."

                });

            }



            /* ============================================
               9.9 CHECK OTP EXPIRY
            ============================================ */

            if (
                !client.passwordResetOtpExpires ||
                client.passwordResetOtpExpires.getTime() <
                    Date.now()
            ) {


                /* ========================================
                   CLEAR EXPIRED OTP
                ======================================== */

                client.passwordResetOtp =
                    null;

                client.passwordResetOtpExpires =
                    null;


                await client.save();


                return res.status(400).json({

                    success: false,

                    message:
                        "The password reset OTP has expired. Please request a new OTP."

                });

            }



            /* ============================================
               9.10 GENERATE RESET AUTHORIZATION
            ============================================ */

            /*
               The OTP is valid.

               Generate a secure authorization that
               will allow the client to continue to
               the password-change process.
            */

            const resetAuthorization =
                generateResetAuthorization();



            /* ============================================
               9.11 GENERATE AUTHORIZATION EXPIRY
            ============================================ */

            const resetAuthorizationExpires =
                new Date(

                    Date.now() +

                    RESET_AUTHORIZATION_EXPIRY_MINUTES *

                    60 *

                    1000

                );



            /* ============================================
               9.12 CLEAR USED PASSWORD RESET OTP
            ============================================ */

            /*
               The OTP has now been successfully used.

               It must never be reusable.
            */

            client.passwordResetOtp =
                null;

            client.passwordResetOtpExpires =
                null;



            /* ============================================
               9.13 SAVE RESET AUTHORIZATION
            ============================================ */

            client.resetAuthorization =
                resetAuthorization;

            client.resetAuthorizationExpires =
                resetAuthorizationExpires;



            /* ============================================
               9.14 SAVE CLIENT
            ============================================ */

            await client.save();



            /* ============================================
               9.15 RETURN SUCCESS RESPONSE
            ============================================ */

            return res.status(200).json({

                success: true,

                message:
                    "Password reset OTP verified successfully.",

                resetAuthorization:
                    resetAuthorization

            });

        }


        catch (error) {

            /* ============================================
               9.16 SERVER ERROR
            ============================================ */

            console.error(
                "Verify Client Password Reset OTP Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "An error occurred while verifying the password reset OTP."

            });

        }

    };



/* =========================================================
   10. RESEND CLIENT PASSWORD RESET OTP
========================================================= */

/*
   Endpoint:

   POST
   /api/auth/client/password-reset-otp/resend


   Expected request body:

   {
       "clientEmail": "client@example.com"
   }


   FLOW:

   Receive email
        ↓
   Validate email
        ↓
   Find client
        ↓
   Client does not exist
        ↓
   Generic response

   Client exists
        ↓
   Generate NEW password reset OTP
        ↓
   Generate NEW expiry
        ↓
   Save passwordResetOtp
        ↓
   Save passwordResetOtpExpires
        ↓
   Clear old reset authorization
        ↓
   Send OTP through Gmail
        ↓
   Success response
*/

const resendClientPasswordResetOTP =
    async (
        req,
        res
    ) => {

        try {


            /* ============================================
               10.1 GET CLIENT EMAIL
            ============================================ */

            const {
                clientEmail
            } =
                req.body;



            /* ============================================
               10.2 VALIDATE CLIENT EMAIL
            ============================================ */

            if (
                !clientEmail ||
                typeof clientEmail !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Client email is required."

                });

            }



            /* ============================================
               10.3 NORMALIZE EMAIL
            ============================================ */

            const normalizedEmail =
                clientEmail
                    .trim()
                    .toLowerCase();



            /* ============================================
               10.4 VALIDATE EMAIL FORMAT
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
               10.5 FIND CLIENT
            ============================================ */

            const client =
                await Client.findOne({

                    email:
                        normalizedEmail

                });



            /* ============================================
               10.6 CLIENT DOES NOT EXIST
            ============================================ */

            /*
               Do NOT reveal whether the email exists.

               This prevents email/account enumeration.
            */

            if (!client) {

                return res.status(200).json({

                    success: true,

                    message:
                        "If an account exists for this email, a password reset OTP has been sent."

                });

            }



            /* ============================================
               10.7 GENERATE NEW PASSWORD RESET OTP
            ============================================ */

            /*
               Generate a completely NEW OTP.

               This replaces the previous OTP.
            */

            const newOTP =
                generateOTP();



            /* ============================================
               10.8 GENERATE NEW OTP EXPIRY
            ============================================ */

            /*
               The new OTP will remain valid
               for another 10 minutes.
            */

            const newOTPExpiry =
                new Date(

                    Date.now() +

                    OTP_EXPIRY_MINUTES *

                    60 *

                    1000

                );



            /* ============================================
               10.9 SAVE NEW PASSWORD RESET OTP
            ============================================ */

            client.passwordResetOtp =
                newOTP;

            client.passwordResetOtpExpires =
                newOTPExpiry;



            /* ============================================
               10.10 CLEAR OLD RESET AUTHORIZATION
            ============================================ */

            /*
               Requesting a new OTP starts a new
               password-reset verification process.

               Therefore any previous authorization
               must be invalidated.
            */

            client.resetAuthorization =
                null;

            client.resetAuthorizationExpires =
                null;



            /* ============================================
               10.11 SAVE CLIENT
            ============================================ */

            await client.save();



            /* ============================================
               10.12 SEND NEW OTP THROUGH GMAIL
            ============================================ */

            /*
               The Gmail function uses:

               process.env.GMAIL_USER

               process.env.GMAIL_APP_PASSWORD
            */

            try {

                await sendPasswordResetOTPEmail(

                    client.email,

                    newOTP

                );

            }


            catch (emailError) {

                /* ========================================
                   EMAIL DELIVERY FAILED
                ======================================== */

                console.error(
                    "Gmail client password reset OTP error:",
                    emailError
                );


                /*
                   Remove the OTP because the email
                   was not successfully sent.

                   This prevents the database from
                   containing an OTP the client never
                   received.
                */

                client.passwordResetOtp =
                    null;

                client.passwordResetOtpExpires =
                    null;


                await client.save();


                return res.status(500).json({

                    success: false,

                    message:
                        "We could not send the password reset OTP. Please try again."

                });

            }



            /* ============================================
               10.13 RETURN SUCCESS RESPONSE
            ============================================ */

            return res.status(200).json({

                success: true,

                message:
                    "A new password reset OTP has been sent to your email."

            });

        }


        catch (error) {

            /* ============================================
               10.14 SERVER ERROR
            ============================================ */

            console.error(
                "Resend Client Password Reset OTP Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to resend the password reset OTP. Please try again."

            });

        }

    };



/* =========================================================
   11. EXPORT CONTROLLER FUNCTIONS
========================================================= */

/*
   The route file imports:

   verifyClientPasswordResetOTP

   resendClientPasswordResetOTP
*/

module.exports = {

    verifyClientPasswordResetOTP,

    resendClientPasswordResetOTP

};