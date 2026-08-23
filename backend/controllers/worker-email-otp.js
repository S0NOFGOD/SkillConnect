/* =========================================================
   1. IMPORT CRYPTO
========================================================= */

const crypto =
    require("crypto");



/* =========================================================
   2. IMPORT WORKER MODEL
========================================================= */

const Worker =
    require("../models/worker");





    /* =========================================================
   3. IMPORT NODEMAILER
========================================================= */

const nodemailer =
    require("nodemailer");



/* =========================================================
   5. GENERATE EMAIL OTP
========================================================= */

/*
   Creates a secure six-digit OTP.

   Example:

   482913

   The range is:

   100000 → 999999
*/

const generateEmailOTP = () => {

    return crypto
        .randomInt(
            100000,
            1000000
        )
        .toString();

};



/* =========================================================
   6. CREATE OTP EXPIRY
========================================================= */

/*
   Every OTP remains valid for 10 minutes.

   Example:

   Current time:
   10:00 AM

   Expiry:
   10:10 AM
*/

const createOTPExpiry = () => {

    return new Date(

        Date.now() +
        10 * 60 * 1000

    );

};



/* =========================================================
   7. SEND OTP EMAIL
========================================================= */


/* =========================================================
   7. SEND OTP EMAIL
========================================================= */

/*
   This function sends the worker's email
   verification OTP through Gmail.

   Gmail credentials come from:

   process.env.GMAIL_USER
   process.env.GMAIL_APP_PASSWORD

   This function is used by:

   1. Email OTP verification flow
   2. Resend OTP flow
*/

const sendOTPEmail = async (
    email,
    otp
) => {


    /* =====================================================
       7.1 CREATE GMAIL TRANSPORTER
    ===================================================== */

    /*
       The transporter connects SkillConnect
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


    /* =====================================================
       7.2 CREATE EMAIL CONTENT
    ===================================================== */

    const html = `

        <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
            color: #0f172a;
        ">

            <h2 style="
                color: #22c55e;
            ">
                SkillConnect
            </h2>


            <p>
                Your SkillConnect email verification
                code is:
            </p>


            <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                padding: 20px;
                text-align: center;
                background: #f1f5f9;
                border-radius: 12px;
            ">

                ${otp}

            </div>


            <p>
                This OTP will expire in
                <strong>10 minutes</strong>.
            </p>


            <p>
                If you did not request this code,
                you can safely ignore this email.
            </p>


            <hr>


            <p style="
                color: #64748b;
                font-size: 13px;
            ">

                © ${new Date().getFullYear()}
                SkillConnect.
                All rights reserved.

            </p>

        </div>

    `;


    /* =====================================================
       7.3 CREATE EMAIL OPTIONS
    ===================================================== */

    /*
       The sender is your Gmail account.

       Example:

       "SkillConnect" <yourgmail@gmail.com>
    */

    const mailOptions = {

        from:
            `"SkillConnect" <${process.env.GMAIL_USER}>`,

        to:
            email,

        subject:
            "SkillConnect Email Verification OTP",

        html:
            html

    };


    /* =====================================================
       7.4 SEND EMAIL THROUGH GMAIL
    ===================================================== */

    try {

        const info =
            await transporter.sendMail(
                mailOptions
            );


        /* ================================================
           LOG SUCCESS
        ================================================= */

        console.log(
            "Worker email OTP sent successfully:",
            info.messageId
        );


        return info;

    }

    catch (error) {

        /* ================================================
           LOG EMAIL ERROR
        ================================================= */

        console.error(
            "Gmail email error:",
            error
        );


        /* ================================================
           RETURN CLEAN ERROR
        ================================================= */

        throw new Error(
            "Unable to send OTP email."
        );

    }

};


/* =========================================================
   8. VERIFY EMAIL OTP
========================================================= */

/*
   FRONTEND REQUEST:

   POST /api/auth/worker/email-otp/verify

   Expected body:

   {
       email: "worker@example.com",
       otp: "482913"
   }

   FLOW:

   Worker enters OTP
           ↓
   Frontend validates OTP
           ↓
   Backend receives email + OTP
           ↓
   Find worker
           ↓
   Check OTP
           ↓
   Check OTP expiry
           ↓
   Verify email
           ↓
   Clear OTP
           ↓
   Save worker
           ↓
   Check profileCompleted
           ↓
   Return nextPage
*/

exports.verifyEmailOTP = async (
    req,
    res
) => {

    try {

        /* =================================================
           8.1 GET DATA FROM FRONTEND
        ================================================= */

        const {
            email,
            otp
        } = req.body;


        /* =================================================
           8.2 BACKEND INPUT VALIDATION
        ================================================= */

        /*
            Frontend validation is not enough.

            The backend MUST validate the request again.
        */

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


        /* =================================================
           8.3 NORMALIZE EMAIL
        ================================================= */

        /*
            Example:

            WORKER@GMAIL.COM

            becomes:

            worker@gmail.com
        */

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* =================================================
           8.4 NORMALIZE OTP
        ================================================= */

        const normalizedOTP =
            String(otp).trim();


        /* =================================================
           8.5 VALIDATE OTP FORMAT
        ================================================= */

        /*
            A valid OTP must contain exactly
            six digits.
        */

        if (
            !/^\d{6}$/.test(
                normalizedOTP
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid 6-digit OTP."

            });

        }


        /* =================================================
           8.6 FIND WORKER
        ================================================= */

        const worker =
            await Worker.findOne({

                email:
                    normalizedEmail

            });


        /* =================================================
           8.7 CHECK WHETHER WORKER EXISTS
        ================================================= */

        if (!worker) {

            return res.status(404).json({

                success: false,

                message:
                    "Worker account could not be found."

            });

        }


        /* =================================================
           8.8 CHECK WHETHER EMAIL IS ALREADY VERIFIED
        ================================================= */

        /*
            If the email is already verified,
            continue to the appropriate next page.
        */

        if (
            worker.isEmailVerified
        ) {

            /* =============================================
               PROFILE NOT COMPLETED
            ============================================= */

            if (
                !worker.profileCompleted
            ) {

                return res.status(200).json({

                    success: true,

                    message:
                        "Your email is already verified. Please complete your worker profile.",

                    profileCompleted:
                        worker.profileCompleted,

                    nextPage:
                        "../worker-create-profile/index.html"

                });

            }


            /* =============================================
               PROFILE COMPLETED
            ============================================= */

            return res.status(200).json({

                success: true,

                message:
                    "Your email is already verified.",

                nextPage:
                    "../worker-client-chats/index.html"

            });

        }


        /* =================================================
           8.9 CHECK WHETHER OTP EXISTS
        ================================================= */

        /*
            IMPORTANT:

            The model uses:

            emailOtp

            NOT:

            emailOTP
        */

        if (
            !worker.emailOtp
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "No active verification OTP was found. Please request a new OTP."

            });

        }


        /* =================================================
           8.10 CHECK OTP
        ================================================= */

        /*
            Compare the OTP entered by the worker
            with the OTP stored in MongoDB.
        */

        if (
            worker.emailOtp !==
            normalizedOTP
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Incorrect OTP. Please check the code and try again."

            });

        }


        /* =================================================
           8.11 CHECK OTP EXPIRY EXISTS
        ================================================= */

        /*
            The model uses:

            emailOtpExpires

            NOT:

            emailOTPExpires
        */

        if (
            !worker.emailOtpExpires
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This OTP is no longer valid. Please request a new OTP."

            });

        }


        /* =================================================
           8.12 CHECK WHETHER OTP HAS EXPIRED
        ================================================= */

        if (
            new Date() >
            worker.emailOtpExpires
        ) {

            /*
                Clear the expired OTP so it cannot
                accidentally be reused.
            */

            worker.emailOtp =
                null;

            worker.emailOtpExpires =
                null;


            await worker.save();


            return res.status(400).json({

                success: false,

                message:
                    "This OTP has expired. Please request a new OTP."

            });

        }


        /* =================================================
           8.13 VERIFY EMAIL
        ================================================= */

        /*
            The OTP is:

            - Present
            - Correct
            - Not expired

            Therefore the worker's email is verified.
        */

        worker.isEmailVerified =
            true;


        /* =================================================
           8.14 CLEAR USED OTP
        ================================================= */

        /*
            OTPs are single-use.

            Remove both the OTP and its expiry
            after successful verification.
        */

        worker.emailOtp =
            null;

        worker.emailOtpExpires =
            null;


        /* =================================================
           8.15 SAVE WORKER
        ================================================= */

        await worker.save();


        /* =================================================
           8.16 CHECK PROFILE COMPLETION
        ================================================= */

        /*
            After successful email verification,
            determine the worker's next page.
        */

        if (
            !worker.profileCompleted
        ) {

            return res.status(200).json({

                success: true,

                message:
                    "Email verified successfully. Please complete your worker profile.",

                profileCompleted:
                    worker.profileCompleted,

                nextPage:
                    "../worker-create-profile/index.html"

            });

        }


        /* =================================================
           8.17 PROFILE ALREADY COMPLETED
        ================================================= */

        return res.status(200).json({

            success: true,

            message:
                "Email verified successfully.",

            profileCompleted:
                worker.profileCompleted,

            nextPage:
                "../worker-client-chats/index.html"

        });


    } catch (error) {

        /* =================================================
           8.18 SERVER ERROR
        ================================================= */

            console.error(
        "Worker email OTP resend error:",
        error
    );


        return res.status(500).json({

            success: false,

            message:
                "Unable to verify your email. Please try again later."

        });

    }

};



/* =========================================================
   9. RESEND EMAIL OTP
========================================================= */

/*
   FRONTEND REQUEST:

   POST /api/auth/worker/email-otp/resend

   Expected body:

   {
       email: "worker@example.com"
   }

   FLOW:

   Worker clicks Resend OTP
           ↓
   Frontend sends worker email
           ↓
   Backend finds worker
           ↓
   Generate new OTP
           ↓
   Generate new 10-minute expiry
           ↓
   Save OTP + expiry
           ↓
   Send OTP email
           ↓
   Success response
           ↓
   Frontend displays success modal
           ↓
   Worker enters new OTP
*/

exports.resendEmailOTP = async (
    req,
    res
) => {

    try {

        /* =================================================
           9.1 GET EMAIL
        ================================================= */

        const {
            email
        } = req.body;


        /* =================================================
           9.2 VALIDATE EMAIL
        ================================================= */

        if (!email) {

            return res.status(400).json({

                success: false,

                message:
                    "Worker email is required."

            });

        }


        /* =================================================
           9.3 NORMALIZE EMAIL
        ================================================= */

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        /* =================================================
           9.4 FIND WORKER
        ================================================= */

        const worker =
            await Worker.findOne({

                email:
                    normalizedEmail

            });


        /* =================================================
           9.5 CHECK WHETHER WORKER EXISTS
        ================================================= */

        if (!worker) {

            return res.status(404).json({

                success: false,

                message:
                    "Worker account could not be found."

            });

        }


        /* =================================================
           9.6 CHECK WHETHER EMAIL IS ALREADY VERIFIED
        ================================================= */

        if (
            worker.isEmailVerified
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Your email is already verified."

            });

        }


        /* =================================================
           9.7 GENERATE NEW OTP
        ================================================= */

        const emailOtp =
            generateEmailOTP();


        /* =================================================
           9.8 CREATE NEW OTP EXPIRY
        ================================================= */

        const emailOtpExpires =
            createOTPExpiry();


        /* =================================================
           9.9 SAVE NEW OTP
        ================================================= */

        /*
            IMPORTANT:

            These names exactly match the Worker model:

            emailOtp
            emailOtpExpires
        */

        worker.emailOtp =
            emailOtp;

        worker.emailOtpExpires =
            emailOtpExpires;


        /* =================================================
           9.10 SAVE WORKER
        ================================================= */

        await worker.save();


        /* =================================================
           9.11 SEND NEW OTP EMAIL
        ================================================= */

        await sendOTPEmail(

            worker.email,

            emailOtp

        );


        /* =================================================
           9.12 SUCCESS RESPONSE
        ================================================= */

        return res.status(200).json({

            success: true,

            message:
                "A new verification OTP has been sent to your email.",

            email:
                worker.email

        });


    } catch (error) {

        /* =================================================
           9.13 SERVER ERROR
        ================================================= */

        console.error(
            "Worker email OTP resend error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to resend the OTP. Please try again later."

        });

    }

};