/* =========================================================
   SKILLCONNECT WORKER AUTHENTICATION CONTROLLER

   This file controls:

   1. Worker account creation
   2. Worker login
   3. Forgot password
   4. Email OTP generation
   5. Email OTP delivery
   6. Password hashing
   7. Password comparison
   8. Access token generation
   9. Refresh token generation
   10. Refresh token hashing
   11. Refresh token httpOnly cookie

   IMPORTANT:

   The frontend is responsible for:

   - Showing success/error modals
   - Saving workerEmail in sessionStorage
   - Saving accessToken in sessionStorage
   - Performing redirects after the 1.5-second
     redirect modal

   This controller only returns structured JSON
   responses to the frontend.
========================================================= */


/* =========================================================
   1. IMPORT WORKER MODEL
========================================================= */

/*
   The Worker model communicates with MongoDB.
*/

const Worker =
    require("../models/worker");



/* =========================================================
   2. IMPORT BCRYPT
========================================================= */

/*
   bcryptjs is used for:

   - Hashing passwords
   - Comparing passwords
   - Hashing refresh tokens
*/

const bcrypt =
    require("bcryptjs");



/* =========================================================
   3. IMPORT JSON WEB TOKEN
========================================================= */

/*
   jsonwebtoken creates:

   - Access tokens
   - Refresh tokens
*/

const jwt =
    require("jsonwebtoken");



/* =========================================================
   4. LOAD ENVIRONMENT VARIABLES
========================================================= */

require("dotenv").config();


/* =========================================================
   5. IMPORT NODEMAILER
========================================================= */


const nodemailer =
    require("nodemailer");



/* =========================================================
   5. GENERATE RANDOM OTP
========================================================= */

/*
   Creates a six-digit OTP.

   Example:

   483921
*/

const generateOTP = () => {

    return Math.floor(
        100000 +
        Math.random() * 900000
    ).toString();

};



/* =========================================================
   6. CALCULATE OTP EXPIRATION
========================================================= */

/*
   OTPs remain valid for 10 minutes.
*/

const getOTPExpiration = () => {

    return new Date(
        Date.now() +
        10 * 60 * 1000
    );

};



/* =========================================================
   7. SEND EMAIL OTP
========================================================= */

const sendEmailOTP = async (
    email,
    otp,
    purpose = "signup"
) => {


    /* =====================================================
       1. CREATE GMAIL TRANSPORTER
    ===================================================== */

    /*
       The transporter is responsible for connecting
       SkillConnect to Gmail's SMTP server.
    */

    const transporter =
        nodemailer.createTransport({

            service: "gmail",

            auth: {

                user:
                    process.env.GMAIL_USER,

                pass:
                    process.env.GMAIL_APP_PASSWORD

            }

        });


    /* =====================================================
       2. DETERMINE EMAIL CONTENT
    ===================================================== */

    /*
       Default email content is for account
       email verification.
    */

    let subject =
        "SkillConnect Email Verification";

    let heading =
        "Verify Your SkillConnect Account";

    let description =
        "Use the OTP below to verify your email address.";


    /* =====================================================
       3. PASSWORD RESET EMAIL CONTENT
    ===================================================== */

    /*
       Password-reset emails use different wording.
    */

    if (
        purpose === "password-reset"
    ) {

        subject =
            "SkillConnect Password Reset OTP";

        heading =
            "Reset Your SkillConnect Password";

        description =
            "Use the OTP below to reset your SkillConnect password.";

    }


    /* =====================================================
       4. CREATE EMAIL
    ===================================================== */

    /*
       This contains the actual email information
       that Gmail will send.
    */

    const mailOptions = {

        from:
            `"SkillConnect" <${process.env.GMAIL_USER}>`,

        to:
            email,

        subject:

            subject,

        html: `

            <div
                style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                "
            >

                <h2>
                    ${heading}
                </h2>

                <p>
                    ${description}
                </p>

                <div
                    style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 25px 0;
                    "
                >
                    ${otp}
                </div>

                <p>
                    This OTP expires in 10 minutes.
                </p>

                <p>
                    If you did not request this,
                    you can safely ignore this email.
                </p>

            </div>

        `

    };


    /* =====================================================
       5. SEND EMAIL
    ===================================================== */

    try {

        await transporter.sendMail(
            mailOptions
        );

        console.log(
            `SkillConnect OTP email sent to ${email}`
        );

        return true;

    }

    catch (error) {

        console.error(
            "Gmail email error:",
            error
        );

        throw new Error(
            "Unable to send authentication email."
        );

    }

};


/* =========================================================
   8. CREATE ACCESS TOKEN
========================================================= */

/*
   Access tokens are short-lived.

   The expiration comes from:

   ACCESS_TOKEN_EXPIRE

   in .env.
*/

const generateAccessToken = (
    workerId
) => {

    return jwt.sign(

        {
            workerId: workerId.toString()
        },

        process.env.ACCESS_TOKEN_SECRET,

        {
            expiresIn:
                process.env.ACCESS_TOKEN_EXPIRE || "15m"
        }

    );

};



/* =========================================================
   9. CREATE REFRESH TOKEN
========================================================= */

/*
   Refresh tokens live longer than access tokens.

   The expiration comes from:

   REFRESH_TOKEN_EXPIRE

   in .env.
*/

const generateRefreshToken = (
    workerId
) => {

    return jwt.sign(

        {
            workerId: workerId.toString()
        },

        process.env.REFRESH_TOKEN_SECRET,

        {
            expiresIn:
                process.env.REFRESH_TOKEN_EXPIRE || "7d"
        }

    );

};



/* =========================================================
   10. CREATE ACCOUNT
========================================================= */

/*
   FLOW:

   Frontend validation
          ↓
   Backend validation
          ↓
   Check email
          ↓
   Email exists → error
          ↓
   Hash password
          ↓
   Create worker
          ↓
   Active account
          ↓
   Email unverified
          ↓
   Profile incomplete
          ↓
   Generate email OTP
          ↓
   Save OTP + expiry
          ↓
   Send OTP
          ↓
   Success response
          ↓
   Frontend saves email
          ↓
   worker-email-otp/index.html
*/

const signupWorker = async (
    req,
    res
) => {

    try {

        /* ==========================================
           10.1 Read request data
        ========================================== */

        const {
            email,
            password,
            confirmPassword
        } = req.body;


        /* ==========================================
           10.2 Backend validation
        ========================================== */

        if (
            !email ||
            !password ||
            !confirmPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email, password and confirm password are required."

            });

        }


        /* ==========================================
           10.3 Normalize email
        ========================================== */

        const normalizedEmail =
            email.trim().toLowerCase();


        /* ==========================================
           10.4 Validate email format
        ========================================== */

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailRegex.test(
                normalizedEmail
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid email address."

            });

        }


        /* ==========================================
           10.5 Validate password confirmation
        ========================================== */

        if (
            password !== confirmPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Passwords do not match."

            });

        }


        /* ==========================================
           10.6 Validate password strength
        ========================================== */

        if (
            password.length < 8
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must contain at least 8 characters."

            });

        }


        /* ==========================================
           10.7 Check existing worker
        ========================================== */

        const existingWorker =
            await Worker.findOne({

                email:
                    normalizedEmail

            });


        if (existingWorker) {

            return res.status(409).json({

                success: false,

                message:
                    "An account with this email already exists."

            });

        }


        /* ==========================================
           10.8 Hash password
        ========================================== */

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );


        /* ==========================================
           10.9 Generate email OTP
        ========================================== */

        const emailOTP =
            generateOTP();


        const emailOTPExpires =
            getOTPExpiration();


        /* ==========================================
           10.10 Create worker
        ========================================== */

        const worker =
            await Worker.create({

                email:
                    normalizedEmail,

                password:
                    hashedPassword,

                accountStatus:
                    "active",

                isEmailVerified:
                    false,

                profileCompleted:
                    false,

                emailOtp:
                    emailOTP,

                emailOtpExpires:
                    emailOTPExpires,
            });


        /* ==========================================
           10.11 Send email OTP
        ========================================== */

        try {

            await sendEmailOTP(

                worker.email,

                emailOTP,

                "signup"

            );

        }

        catch (emailError) {

            /*
               Remove the newly created account if
               the verification email could not be sent.

               This prevents creating an account that
               cannot proceed through verification.
            */

            await Worker.findByIdAndDelete(
                worker._id
            );


            throw emailError;

        }


        /* ==========================================
           10.12 Success response
        ========================================== */

        return res.status(201).json({

            success: true,

            message:
                "Account created successfully. A verification OTP has been sent to your email.",

            email:
                worker.email,

            redirect:
                "../worker-email-otp/index.html"

        });

    }

    catch (error) {

        /* ==========================================
           Handle unexpected errors
        ========================================== */

        console.error(
            "Worker signup error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to create your account right now. Please try again."

        });

    }

};



/* =========================================================
   11. LOGIN
========================================================= */

const loginWorker = async (
    req,
    res
) => {

    try {

        /* ==========================================
           11.1 Read request data
        ========================================== */

        const {
            email,
            password
        } = req.body;


        /* ==========================================
           11.2 Backend validation
        ========================================== */

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


        /* ==========================================
           11.3 Normalize email
        ========================================== */

        const normalizedEmail =
            email.trim().toLowerCase();


        /* ==========================================
           11.4 Find worker
        ========================================== */

        const worker =
            await Worker.findOne({

                email:
                    normalizedEmail

            });


        /* ==========================================
           11.5 Email does not exist
        ========================================== */

        if (!worker) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        /* ==========================================
           11.6 Compare password
        ========================================== */

        const passwordMatches =
            await bcrypt.compare(

                password,

                worker.password

            );


        if (!passwordMatches) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        /* ==========================================
           11.7 Check account status
        ========================================== */

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


        /* ==========================================
           11.8 Check email verification
        ========================================== */

        if (
            worker.isEmailVerified !== true
        ) {

            const emailOTP =
    generateOTP();


/* =========================================================
   GENERATE OTP EXPIRATION
========================================================= */

/*
   The email verification OTP expires after 10 minutes.
*/

const emailOTPExpires =
    getOTPExpiration();


/* =========================================================
   SAVE EMAIL VERIFICATION OTP
========================================================= */


worker.emailOtp =
    emailOTP;

worker.emailOtpExpires =
    emailOTPExpires;


/*
   Save the worker document.
*/

await worker.save();


/* =========================================================
   SEND EMAIL VERIFICATION OTP
========================================================= */

/*
   Send the newly generated OTP to the worker's email.
*/

await sendEmailOTP(

    worker.email,

    emailOTP,

    "signup"

);


            /*
               The frontend will:

               1. Save worker email
               2. Show redirect modal
               3. Wait 1.5 seconds
               4. Redirect to OTP page
            */

            return res.status(200).json({
                
                success: true,
                nextStep: "email-verification",
                message: "Your email has not been verified. A new verification OTP has been sent.",
                email: worker.email
            });

        }


        /* ==========================================
           11.9 Check profile completion
        ========================================== */

        if (
            worker.profileCompleted !== true
        ) {

            return res.status(200).json({

    success: true,

    nextStep: "profile",

    message:
        "Login successful. Please complete your worker profile.",

    email:
        worker.email

});
        }


        /* ==========================================
           11.10 Generate access token
        ========================================== */

        const accessToken =
            generateAccessToken(
                worker._id
            );


        /* ==========================================
           11.11 Generate refresh token
        ========================================== */

        const refreshToken =
            generateRefreshToken(
                worker._id
            );


        /* ==========================================
           11.12 Hash refresh token
        ========================================== */

        const hashedRefreshToken =
            await bcrypt.hash(

                refreshToken,

                12

            );


        /* ==========================================
           11.13 Save hashed refresh token
        ========================================== */

        worker.refreshTokenHash =
            hashedRefreshToken;


        await worker.save();


        /* ==========================================
           11.14 Set refresh token cookie
        ========================================== */

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
                    7 *
                    24 *
                    60 *
                    60 *
                    1000

            }

        );


        /* ==========================================
           11.15 Return successful login
        ========================================== */

        return res.status(200).json({

    success: true,

    nextStep: "authenticated",

    message:
        "Login successful. Welcome back to SkillConnect.",

    accessToken,

    email:
        worker.email

});

    }

    catch (error) {

        /* ==========================================
           Handle login errors
        ========================================== */

        console.error(
            "Worker login error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to complete login right now. Please try again."

        });

    }

};



/* =========================================================
   12. FORGOT PASSWORD
========================================================= */

/*
   FLOW:

   User clicks Forgot Password
          ↓
   Modal opens
          ↓
   Enter email
          ↓
   Frontend validation
          ↓
   Backend
          ↓
   Check email
          ↓
   Doesn't exist
          ↓
   Generic response

   OR

   Exists
          ↓
   Generate reset OTP
          ↓
   Save OTP + expiry
          ↓
   Send OTP
          ↓
   Save email on frontend
          ↓
   worker-password-reset-otp/index.html
*/

const forgotPassword = async (
    req,
    res
) => {

    try {

        /* ==========================================
           12.1 Read email
        ========================================== */

        const {
            email
        } = req.body;


        /* ==========================================
           12.2 Backend validation
        ========================================== */

        if (!email) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your email address."

            });

        }


        /* ==========================================
           12.3 Normalize email
        ========================================== */

        const normalizedEmail =
            email.trim().toLowerCase();


        /* ==========================================
           12.4 Find worker
        ========================================== */

        const worker =
            await Worker.findOne({

                email:
                    normalizedEmail

            });


        /* ==========================================
           12.5 Generic response for unknown email
        ========================================== */

        if (!worker) {

            /*
               Do not reveal whether an email is
               registered.

               This prevents account enumeration.
            */

            return res.status(200).json({

                success: true,

                otpSent: false,

                message:
                    "If an account with that email exists, a password reset OTP has been sent.",

                email:
                    normalizedEmail

            });

        }


        /* ==========================================
   12.6 Generate password reset OTP
========================================== */

const resetOTP =
    generateOTP();


/* ==========================================
   12.7 Generate password reset OTP expiration
========================================== */

const resetOTPExpires =
    getOTPExpiration();


/* ==========================================
   12.8 Save password reset OTP
========================================== */

worker.passwordResetOtp =
    resetOTP;

worker.passwordResetOtpExpires =
    resetOTPExpires;


await worker.save();


/* ==========================================
   12.9 Send password reset OTP
========================================== */

await sendEmailOTP(

    worker.email,

    resetOTP,

    "password-reset"

);


        /* ==========================================
           12.10 Success response
        ========================================== */

        return res.status(200).json({

            success: true,

            otpSent: true,

            message:
                "If an account with that email exists, a password reset OTP has been sent.",

            email:
                worker.email,

            redirect:
                "../worker-password-reset-otp/index.html"

        });

    }

    catch (error) {

        /* ==========================================
           Handle forgot-password errors
        ========================================== */

        console.error(
            "Worker forgot-password error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to process your password reset request right now. Please try again."

        });

    }

};



/* =========================================================
   13. EXPORT CONTROLLERS
========================================================= */

/*
   routes/worker-authentication.js imports these
   controller functions.
*/

module.exports = {

    signupWorker,

    loginWorker,

    forgotPassword

};