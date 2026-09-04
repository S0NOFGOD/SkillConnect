/* =========================================================
   SKILLCONNECT CLIENT EMAIL OTP CONTROLLER

   This file controls:

   1. Client Email OTP verification
   2. Client Email OTP resend
   3. OTP generation
   4. OTP expiry checking
   5. Client email verification
   6. Sending verification emails

   IMPORTANT:

   No separate utils file is used.

   Therefore:

   - OTP generation
   - OTP expiry calculation
   - Email sending

   are handled directly inside this controller.

   ROUTES:

   POST /api/auth/client/email-otp/verify

   POST /api/auth/client/email-otp/resend
========================================================= */


/* =========================================================
   1. IMPORT CLIENT MODEL
========================================================= */

/*
   The Client model allows us to:

   - Find clients by email
   - Check their OTP
   - Check OTP expiry
   - Update email verification status
   - Save new OTPs
*/

const Client =
    require("../models/client");


    /* =========================================================
   2. IMPORT NODEMAILER
========================================================= */


    const {
    BrevoClient
} = require("@getbrevo/brevo");


/* =========================================================
   4. GENERATE SIX-DIGIT OTP
========================================================= */

/*
   Generates a random 6-digit verification code.

   Example:

       483921

   The OTP is always exactly six digits.
*/

const generateOTP = () => {

    return Math.floor(
        100000 +
        Math.random() * 900000
    ).toString();

};


/* =========================================================
   5. GENERATE OTP EXPIRY
========================================================= */

/*
   Client Email OTPs are valid for 10 minutes.

   Current time:
       Date.now()

   10 minutes:
       10 * 60 * 1000

   The result is stored as a JavaScript Date.
*/

const generateOTPExpiry = () => {

    return new Date(
        Date.now() +
        10 * 60 * 1000
    );

};




/* =========================================================
   6. SEND CLIENT EMAIL OTP
========================================================= */

/*
   Sends the Client Email Verification OTP through
   the Brevo HTTPS API.

   Brevo is used instead of Gmail SMTP because
   Render Free blocks outbound SMTP connections.

   The Brevo API key is stored securely in:

   process.env.BREVO_API_KEY

   The verified sender email is stored in:

   process.env.BREVO_SENDER_EMAIL

   The sender name is stored in:

   process.env.BREVO_SENDER_NAME
*/

const sendClientEmailOTP = async (
    email,
    otp
) => {


    /* =====================================================
       6.1 CREATE BREVO CLIENT
    ===================================================== */

    /*
       Brevo communicates through HTTPS.

       This avoids the Gmail SMTP connection
       that was failing on Render Free.
    */

    const brevo =
        new BrevoClient({

            apiKey:
                process.env.BREVO_API_KEY

        });


    /* =====================================================
       6.2 CREATE AND SEND EMAIL
    ===================================================== */

    /*
       The email is sent through Brevo's
       transactional email API.
    */

    try {

        await brevo.transactionalEmails
            .sendTransacEmail({

                /* -----------------------------------------
                   EMAIL SENDER
                ----------------------------------------- */

                sender: {

                    name:
                        process.env.BREVO_SENDER_NAME ||
                        "SkillConnect",

                    email:
                        process.env.BREVO_SENDER_EMAIL

                },


                /* -----------------------------------------
                   EMAIL RECIPIENT
                ----------------------------------------- */

                to: [

                    {

                        email:
                            email

                    }

                ],


                /* -----------------------------------------
                   EMAIL SUBJECT
                ----------------------------------------- */

                subject:
                    "SkillConnect Client Email Verification",


                /* -----------------------------------------
                   EMAIL HTML
                ----------------------------------------- */

                htmlContent: `

                    <!DOCTYPE html>

                    <html>

                    <head>

                        <meta charset="UTF-8">

                        <title>
                            SkillConnect Email Verification
                        </title>

                    </head>


                    <body
                        style="
                            margin:0;
                            padding:0;
                            background:#020617;
                            font-family:Arial,sans-serif;
                            color:#ffffff;
                        "
                    >

                        <div
                            style="
                                max-width:600px;
                                margin:40px auto;
                                padding:35px;
                                background:#0f172a;
                                border-radius:18px;
                            "
                        >

                            <h1
                                style="
                                    text-align:center;
                                    font-size:28px;
                                    margin-bottom:20px;
                                "
                            >

                                SkillConnect

                            </h1>


                            <h2
                                style="
                                    font-size:22px;
                                    margin-bottom:15px;
                                "
                            >

                                Verify Your Email

                            </h2>


                            <p
                                style="
                                    color:#cbd5e1;
                                    font-size:15px;
                                    line-height:1.7;
                                "
                            >

                                Use the verification code below
                                to verify your SkillConnect client account.

                            </p>


                            <div
                                style="
                                    margin:30px 0;
                                    padding:20px;
                                    text-align:center;
                                    background:#111827;
                                    border-radius:14px;
                                    letter-spacing:8px;
                                    font-size:32px;
                                    font-weight:bold;
                                    color:#3b82f6;
                                "
                            >

                                ${otp}

                            </div>


                            <p
                                style="
                                    color:#94a3b8;
                                    font-size:14px;
                                    line-height:1.7;
                                "
                            >

                                This verification code will expire
                                in 10 minutes.

                            </p>


                            <p
                                style="
                                    color:#94a3b8;
                                    font-size:13px;
                                    margin-top:30px;
                                "
                            >

                                If you did not request this code,
                                you can safely ignore this email.

                            </p>

                        </div>

                    </body>

                    </html>

                `

            });


        /* =================================================
           6.3 SUCCESS MESSAGE
        ================================================= */

        console.log(
            `Client verification OTP sent to ${email}`
        );


        return true;

    }


    /* =====================================================
       6.4 ERROR HANDLING
    ===================================================== */

    catch (error) {

        console.error(
            "Brevo client email error:",
            error
        );


        throw new Error(
            "Unable to send verification email."
        );

    }

};


/* =========================================================
   7. VERIFY CLIENT EMAIL OTP
========================================================= */

const verifyClientEmailOTP = async (
    req,
    res
) => {

    try {

        /* =================================================
           7.1 GET REQUEST DATA
        ================================================= */

        const {
            email,
            otp
        } =
            req.body;


        /* =================================================
           7.2 BACKEND VALIDATION
        ================================================= */

        if (
            !email ||
            typeof email !== "string"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Client email is required."

            });

        }


        if (
            !otp ||
            typeof otp !== "string"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Verification code is required."

            });

        }


        /* =================================================
           7.3 NORMALIZE EMAIL
        ================================================= */

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* =================================================
           7.4 VALIDATE OTP FORMAT
        ================================================= */

        if (
            !/^\d{6}$/.test(otp)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Verification code must contain exactly 6 digits."

            });

        }


        /* =================================================
           7.5 FIND CLIENT
        ================================================= */

        const client =
            await Client.findOne({

                email:
                    normalizedEmail

            });


        /* =================================================
           7.6 CLIENT DOES NOT EXIST
        ================================================= */

        if (!client) {

            return res.status(404).json({

                success: false,

                message:
                    "Client account could not be found."

            });

        }


        /* =================================================
           7.7 CHECK EMAIL VERIFICATION STATUS
        ================================================= */

        if (
            client.isEmailVerified
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This email has already been verified."

            });

        }


        /* =================================================
           7.8 CHECK WHETHER OTP EXISTS
        ================================================= */

        /*
           IMPORTANT:

           The Client model uses:

               emailOtp

           NOT:

               emailOTP
        */

        if (
            !client.emailOtp
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Your verification code is invalid or has expired. Please request a new OTP."

            });

        }


        /* =================================================
           7.9 CHECK OTP
        ================================================= */

        if (
            client.emailOtp !== otp
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "The verification code is incorrect."

            });

        }


        /* =================================================
           7.10 CHECK OTP EXPIRY
        ================================================= */

        /*
           IMPORTANT:

           The Client model uses:

               emailOtpExpires

           NOT:

               emailOTPExpires
        */

        if (
            !client.emailOtpExpires ||
            new Date(
                client.emailOtpExpires
            ).getTime() <= Date.now()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Your verification code has expired. Please request a new OTP."

            });

        }


        /* =================================================
           7.11 VERIFY CLIENT EMAIL
        ================================================= */

        client.isEmailVerified =
            true;


        /* =================================================
           7.12 CLEAR USED OTP
        ================================================= */

        client.emailOtp =
            null;


        client.emailOtpExpires =
            null;


        /* =================================================
           7.13 SAVE CLIENT
        ================================================= */

        await client.save();


        /* =================================================
           7.14 DETERMINE NEXT PAGE
        ================================================= */

        let nextPage;


        if (
            client.profileCompleted
        ) {

            /*
               Profile is already completed.

               Send client to the worker search page.
            */

            nextPage =
                "../client-worker-search/index.html";

        } else {

            /*
               Profile has not been completed.

               Send client to the create-profile page.
            */

            nextPage =
                "../client-create-profile/index.html";

        }


        /* =================================================
           7.15 SUCCESS RESPONSE
        ================================================= */

        return res.status(200).json({

            success: true,

            message:
                "Your email has been successfully verified.",

            nextPage:
                nextPage

        });

    }

    catch (error) {

        /* =================================================
           7.16 SERVER ERROR
        ================================================= */

        console.error(
            "Client Email OTP verification error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to verify your email at this time. Please try again."

        });

    }

};


/* =========================================================
   8. RESEND CLIENT EMAIL OTP
========================================================= */

/*
   Endpoint:

   POST /api/auth/client/email-otp/resend


   Request body:

   {
       email: "client@example.com"
   }


   FLOW:

   Client sends email
          ↓
   Validate email
          ↓
   Find client
          ↓
   Generate new OTP
          ↓
   Generate new 10-minute expiry
          ↓
   Save OTP + expiry
          ↓
   Send email
          ↓
   Success response
*/

const resendClientEmailOTP = async (
    req,
    res
) => {

    try {

        /* =================================================
           8.1 GET EMAIL
        ================================================= */

        const {
            email
        } =
            req.body;


        /* =================================================
           8.2 VALIDATE EMAIL
        ================================================= */

        if (
            !email ||
            typeof email !== "string"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Client email is required."

            });

        }


        /* =================================================
           8.3 NORMALIZE EMAIL
        ================================================= */

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* =================================================
           8.4 FIND CLIENT
        ================================================= */

        const client =
            await Client.findOne({

                email:
                    normalizedEmail

            });


        /* =================================================
           8.5 CLIENT DOES NOT EXIST
        ================================================= */

        if (!client) {

            return res.status(404).json({

                success: false,

                message:
                    "Client account could not be found."

            });

        }


        /* =================================================
           8.6 CHECK EMAIL VERIFICATION STATUS
        ================================================= */

        if (
            client.isEmailVerified
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This email has already been verified."

            });

        }


        /* =================================================
           8.7 GENERATE NEW OTP
        ================================================= */

        const newOTP =
            generateOTP();


        /* =================================================
           8.8 GENERATE NEW OTP EXPIRY
        ================================================= */

        const newOTPExpiry =
            generateOTPExpiry();


        /* =================================================
           8.9 SAVE NEW OTP
        ================================================= */

        /*
           Match the Client model exactly:

               emailOtp
               emailOtpExpires
        */

        client.emailOtp =
            newOTP;


        client.emailOtpExpires =
            newOTPExpiry;


        /* =================================================
           8.10 SAVE CLIENT
        ================================================= */

        await client.save();


        /* =================================================
           8.11 SEND NEW OTP EMAIL
        ================================================= */

        try {

            await sendClientEmailOTP(
                normalizedEmail,
                newOTP
            );

        }

        catch (emailError) {

            /* =============================================
               EMAIL FAILED

               Remove the OTP that could not be delivered.
            ============================================= */

            client.emailOtp =
                null;


            client.emailOtpExpires =
                null;


            await client.save();


            throw emailError;

        }


        /* =================================================
           8.12 SUCCESS RESPONSE
        ================================================= */

        return res.status(200).json({

            success: true,

            message:
                "A new verification code has been sent to your email."

        });

    }

    catch (error) {

        /* =================================================
           8.13 SERVER ERROR
        ================================================= */

        console.error(
            "Client Email OTP resend error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to send a new verification code at this time. Please try again."

        });

    }

};


/* =========================================================
   9. EXPORT CONTROLLER FUNCTIONS
========================================================= */

/*
   Export both controller functions so that
   routes/client-email-otp.js can use them.
*/

module.exports = {

    verifyClientEmailOTP,

    resendClientEmailOTP

};