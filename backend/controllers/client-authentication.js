/* =========================================================
   SKILLCONNECT CLIENT AUTHENTICATION CONTROLLER

   This file contains ALL business logic for:

   1. Client Create Account
   2. Client Login
   3. Client Forgot Password

   IMPORTANT:

   - No utils files are used.
   - Password hashing is handled here.
   - OTP generation is handled here.
   - OTP email sending is handled here.
   - JWT generation is handled here.
   - Refresh-token hashing is handled here.
   - Refresh-token cookie is handled here.
   - Google authentication is NOT included.

   FRONTEND ROUTES:

   /api/client-authentication/signup

   /api/client-authentication/login

   /api/client-authentication/forgot-password
========================================================= */


/* =========================================================
   1. IMPORT CLIENT MODEL
========================================================= */

/*
   The Client model provides access to the clients
   collection in MongoDB.
*/

const Client =
    require("../models/client");



/* =========================================================
   2. IMPORT BCRYPT
========================================================= */

/*
   bcrypt is used for:

   - Hashing new client passwords
   - Comparing login passwords
   - Hashing refresh tokens
*/

const bcrypt =
    require("bcryptjs");



/* =========================================================
   3. IMPORT JWT
========================================================= */

/*
   jsonwebtoken creates:

   - Access tokens
   - Refresh tokens
*/

const jwt =
    require("jsonwebtoken");



/* =========================================================
   4. IMPORT CRYPTO
========================================================= */

/*
   crypto is used to generate secure random OTPs.

   We do not use Math.random() for authentication OTPs.
*/

const crypto =
    require("crypto");



/* =========================================================
   5. IMPORT NODEMAILER
========================================================= */

const nodemailer =
    require("nodemailer");

/* =========================================================
   5. IMPORT BREVO
========================================================= */

    const {
    BrevoClient
} = require("@getbrevo/brevo");


/* =========================================================
   7. PASSWORD VALIDATION HELPER
========================================================= */

const validatePassword = (
    password
) => {

    if (
        typeof password !== "string"
    ) {

        return false;

    }


    if (
        password.length < 8
    ) {

        return false;

    }


    return true;

};



/* =========================================================
   8. EMAIL OTP GENERATOR
========================================================= */

const generateEmailOTP = () => {

    return crypto
        .randomInt(
            100000,
            1000000
        )
        .toString();

};



/* =========================================================
   9. OTP EXPIRY GENERATOR
========================================================= */

const generateOTPExpiry = () => {

    return new Date(
        Date.now() +
        10 * 60 * 1000
    );

};


/* =========================================================
   10. SEND EMAIL VERIFICATION OTP
========================================================= */

/*
   Sends an email verification OTP to the client.

   This function is used for:

   1. Client account creation
   2. Client login when email is not verified

   Brevo is used instead of Gmail SMTP.

   Brevo communicates through HTTPS, which works
   with the Render Free backend.
*/

const sendEmailOTP = async (
    email,
    otp
) => {


    /* =====================================================
       1. CREATE BREVO CLIENT
    ===================================================== */

    /*
       Brevo uses its HTTPS API to send the email.

       The API key is stored securely inside
       the backend environment variables.
    */

    const brevo =
        new BrevoClient({

            apiKey:
                process.env.BREVO_API_KEY

        });


    /* =====================================================
       2. SEND EMAIL THROUGH BREVO
    ===================================================== */

    try {

        /*
           Send the client verification email.

           No Gmail SMTP connection is made here.
        */

        const result =
            await brevo.transactionalEmails
                .sendTransacEmail({

                    /* -------------------------------------
                       EMAIL SUBJECT
                    ------------------------------------- */

                    subject:
                        "SkillConnect Email Verification OTP",


                    /* -------------------------------------
                       EMAIL SENDER
                    ------------------------------------- */

                    sender: {

                        name:
                            process.env.BREVO_SENDER_NAME ||
                            "SkillConnect",

                        email:
                            process.env.BREVO_SENDER_EMAIL

                    },


                    /* -------------------------------------
                       EMAIL RECIPIENT
                    ------------------------------------- */

                    to: [

                        {

                            email:
                                email

                        }

                    ],


                    /* -------------------------------------
                       EMAIL HTML
                    ------------------------------------- */

                    htmlContent: `

                        <div
                            style="
                                font-family: Arial, sans-serif;
                                max-width: 600px;
                                margin: auto;
                                padding: 30px;
                                background: #020617;
                                color: #ffffff;
                                border-radius: 15px;
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
                                Your email verification OTP is:
                            </p>


                            <h1
                                style="
                                    letter-spacing: 8px;
                                    color: #3b82f6;
                                "
                            >

                                ${otp}

                            </h1>


                            <p>
                                This OTP will expire in 10 minutes.
                            </p>


                            <p>
                                If you did not request this code,
                                you can safely ignore this email.
                            </p>

                        </div>

                    `

                });


        /* =================================================
           3. SUCCESS LOG
        ================================================= */

        console.log(
            `Client verification OTP sent to ${email}`
        );

        console.log(
            "Brevo message ID:",
            result.messageId
        );


    }


    /* =====================================================
       4. ERROR HANDLING
    ===================================================== */

    catch (error) {

        console.error(
            "Client Brevo verification email error:",
            error
        );


        throw new Error(
            "Unable to send email verification OTP."
        );

    }

};


/* =========================================================
   11. SEND PASSWORD RESET OTP
========================================================= */

/*
   Sends a password-reset OTP to the client.

   IMPORTANT:

   This function is completely separate from
   sendEmailOTP().

   It is used ONLY for:

   Forgot Password

   Gmail credentials come from:

   process.env.GMAIL_USER
   process.env.GMAIL_APP_PASSWORD
*/

const sendPasswordResetOTP = async (
    email,
    otp
) => {

    /* =====================================================
       CREATE GMAIL TRANSPORTER
    ===================================================== */

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
       CREATE PASSWORD RESET EMAIL
    ===================================================== */

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
                    background: #020617;
                    color: #ffffff;
                    border-radius: 15px;
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
                    Your password reset OTP is:
                </p>

                <h1
                    style="
                        letter-spacing: 8px;
                        color: #3b82f6;
                    "
                >
                    ${otp}
                </h1>

                <p>
                    This OTP will expire in 10 minutes.
                </p>

                <p>
                    If you did not request a password reset,
                    you can safely ignore this email.
                </p>

            </div>

        `

    };


    /* =====================================================
       SEND EMAIL THROUGH GMAIL
    ===================================================== */

    try {

        await transporter.sendMail(
            mailOptions
        );

        console.log(
            `Client password reset OTP sent to ${email}`
        );

    }

    catch (error) {

        console.error(
            "Client Gmail password reset email error:",
            error
        );

        throw new Error(
            "Unable to send password reset OTP."
        );

    }

};



/* =========================================================
   12. CREATE ACCOUNT
========================================================= */

/*
   CLIENT SIGNUP FLOW:

   Frontend validation
          ↓
   Backend validation
          ↓
   Check email
          ↓
   Hash password
          ↓
   Create client
          ↓
   accountStatus = active
          ↓
   isEmailVerified = false
          ↓
   profileCompleted = false
          ↓
   Generate OTP
          ↓
   Save OTP + expiry
          ↓
   Send OTP
          ↓
   Success response
          ↓
   Frontend saves email
          ↓
   client-email-otp/index.html
*/

const signup = async (
    req,
    res
) => {

    try {

        /* ==========================================
           12.1 GET REQUEST DATA
        ========================================== */

        const {
            email,
            password
        } = req.body;



        /* ==========================================
           12.2 NORMALIZE EMAIL
        ========================================== */

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";



        /* ==========================================
           12.3 BACKEND VALIDATION
        ========================================== */

        if (
            !normalizedEmail ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                code:
                    "missingFields",

                message:
                    "Please complete all required fields."

            });

        }



        /* ==========================================
           12.4 EMAIL FORMAT VALIDATION
        ========================================== */

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailPattern.test(
                normalizedEmail
            )
        ) {

            return res.status(400).json({

                success: false,

                code:
                    "invalidEmail",

                message:
                    "Please enter a valid email address."

            });

        }



        /* ==========================================
           12.5 PASSWORD VALIDATION
        ========================================== */

        if (
            !validatePassword(password)
        ) {

            return res.status(400).json({

                success: false,

                code:
                    "invalidPassword",

                message:
                    "Password must be at least 8 characters long."

            });

        }



        /* ==========================================
           12.8 CHECK EXISTING EMAIL
        ========================================== */

        const existingClient =
            await Client.findOne({

                email:
                    normalizedEmail

            });



        if (
            existingClient
        ) {

            return res.status(409).json({

                success: false,

                code:
                    "emailExists",

                message:
                    "An account with this email already exists."

            });

        }



        /* ==========================================
           12.9 HASH PASSWORD
        ========================================== */

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );



        /* ==========================================
           12.10 GENERATE EMAIL OTP
        ========================================== */

        const emailOTP =
            generateEmailOTP();


        const emailOTPExpires =
            generateOTPExpiry();



        /* ==========================================
           12.11 CREATE CLIENT
        ========================================== */

        const client =
            await Client.create({

                email:
                    normalizedEmail,

                password:
                    passwordHash,

                authProvider:
                    "local",

                accountStatus:
                    "active",

                isEmailVerified:
                    false,

                emailOtp:
                    emailOTP,

                emailOtpExpires:
                    emailOTPExpires,

                profileCompleted:
                    false

            });



        /* ==========================================
           12.12 SEND EMAIL OTP
        ========================================== */

        try {

            await sendEmailOTP(
                client.email,
                emailOTP
            );

        }

        catch (emailError) {

            /*
               If the email cannot be sent, remove the
               newly created account so the user can
               retry signup cleanly.
            */

            await Client.findByIdAndDelete(
                client._id
            );

            console.error(
                "Client signup OTP email error:",
                emailError
            );

            return res.status(500).json({

                success: false,

                code:
                    "emailDeliveryFailed",

                message:
                    "We could not send the verification email. Please try again."

            });

        }



        /* ==========================================
           12.13 SUCCESS RESPONSE
        ========================================== */

        return res.status(201).json({

            success: true,

            code:
                "accountCreated",

            message:
                "Your account was created successfully. A verification OTP has been sent to your email.",

            email:
                client.email

        });

    }

    catch (error) {

        console.error(
            "Client signup error:",
            error
        );

        return res.status(500).json({

            success: false,

            code:
                "serverError",

            message:
                "An internal server error occurred. Please try again."

        });

    }

};



/* =========================================================
   13. CLIENT LOGIN
========================================================= */

/*
   CLIENT LOGIN FLOW:

   Frontend validation
          ↓
   Backend validation
          ↓
   Check email
          ↓
   Compare password
          ↓
   Check accountStatus
          ↓
   Check email verification
          ↓
   Check profile completion
          ↓
   Generate tokens
          ↓
   Hash refresh token
          ↓
   Save refresh token hash
          ↓
   Set HTTP-only cookie
          ↓
   Return access token
*/

const login = async (
    req,
    res
) => {

    try {

        /* ==========================================
           13.1 GET LOGIN DATA
        ========================================== */

        const {
            email,
            password
        } = req.body;



        /* ==========================================
           13.2 NORMALIZE EMAIL
        ========================================== */

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";



        /* ==========================================
           13.3 BACKEND VALIDATION
        ========================================== */

        if (
            !normalizedEmail ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                code:
                    "missingFields",

                message:
                    "Please enter your email and password."

            });

        }



        /* ==========================================
           13.4 FIND CLIENT
        ========================================== */

        const client =
            await Client.findOne({

                email:
                    normalizedEmail

            });



        /* ==========================================
           13.5 EMAIL DOES NOT EXIST
        ========================================== */

        if (
            !client
        ) {

            return res.status(401).json({

                success: false,

                code:
                    "invalidCredentials",

                message:
                    "Incorrect email or password."

            });

        }



        /* ==========================================
           13.6 COMPARE PASSWORD
        ========================================== */

        const passwordMatches =
            await bcrypt.compare(
                password,
                client.password
            );



        if (
            !passwordMatches
        ) {

            return res.status(401).json({

                success: false,

                code:
                    "invalidCredentials",

                message:
                    "Incorrect email or password."

            });

        }



        /* ==========================================
           13.7 CHECK ACCOUNT STATUS
        ========================================== */

        if (
            client.accountStatus ===
            "suspended"
        ) {

            return res.status(403).json({

                success: false,

                code:
                    "accountSuspended",

                message:
                    "Your account has been suspended. Please contact SkillConnect support."

            });

        }



        /* ==========================================
           13.8 CHECK EMAIL VERIFICATION
        ========================================== */

        if (
            !client.isEmailVerified
        ) {

            /* --------------------------------------
               Generate a new email verification OTP
            -------------------------------------- */

            const emailOTP =
                generateEmailOTP();


            const emailOTPExpires =
                generateOTPExpiry();



            /* --------------------------------------
               Save OTP
            -------------------------------------- */

            client.emailOtp =
                emailOTP;

            client.emailOtpExpires =
                emailOTPExpires;


            await client.save();



            /* --------------------------------------
               Send OTP
            -------------------------------------- */

            try {

                await sendEmailOTP(
                    client.email,
                    emailOTP
                );

            }

            catch (emailError) {

                console.error(
                    "Client login OTP email error:",
                    emailError
                );

                return res.status(500).json({

                    success: false,

                    code:
                        "emailDeliveryFailed",

                    message:
                        "We could not send the verification email. Please try again."

                });

            }



            /* --------------------------------------
               Tell frontend email verification
               is required.
            -------------------------------------- */

            return res.status(200).json({

                success: true,

                nextStep: "email-verification",

                message:
                    "Your email has not been verified. A new verification OTP has been sent to your email.",

                email:
                    client.email

            });

        }



        /* ==========================================
           13.9 CHECK PROFILE COMPLETION
        ========================================== */

        if (
            !client.profileCompleted
        ) {

            return res.status(200).json({

                success: true,

                nextStep: "complete-profile",

                message:
                    "Email verified successfully. Please complete your profile.",

                email:
                    client.email

            });

        }



        /* ==========================================
           13.10 GENERATE ACCESS TOKEN
        ========================================== */

        const accessToken =
            jwt.sign(

                {
                    clientId:
                        client._id.toString(),

                    email:
                        client.email,

                    role:
                        "client"

                },

                process.env.ACCESS_TOKEN_SECRET,

                {
                    expiresIn:
                        process.env.ACCESS_TOKEN_EXPIRE ||
                        "15m"
                }

            );



        /* ==========================================
           13.11 GENERATE REFRESH TOKEN
        ========================================== */

        const refreshToken =
            jwt.sign(

                {
                    clientId:
                        client._id.toString(),

                    role:
                        "client",

                    tokenType:
                        "refresh"

                },

                process.env.REFRESH_TOKEN_SECRET,

                {
                    expiresIn:
                        process.env.REFRESH_TOKEN_EXPIRE ||
                        "7d"
                }

            );



        /* ==========================================
           13.12 HASH REFRESH TOKEN
        ========================================== */

        const refreshTokenHash =
            await bcrypt.hash(
                refreshToken,
                12
            );



        /* ==========================================
           13.13 SAVE REFRESH TOKEN HASH
        ========================================== */

        client.refreshTokenHash =
            refreshTokenHash;


        await client.save();



        /* ==========================================
           13.14 SET HTTP-ONLY COOKIE
        ========================================== */

        const isProduction =
            process.env.NODE_ENV ===
            "production";


        res.cookie(

            "refreshToken",

            refreshToken,

            {
                httpOnly:
                    true,

                secure:
                    isProduction,

                sameSite:
                    isProduction
                        ? "none"
                        : "lax",

                maxAge:
                    7 * 24 * 60 * 60 * 1000,

                path:
                    "/"

            }

        );



        /* ==========================================
           13.15 LOGIN SUCCESS RESPONSE
        ========================================== */

        return res.status(200).json({

            success: true,

            code:
                "loginSuccessful",

            message:
                "Welcome back to SkillConnect.",

            accessToken,

            email:
                client.email

        });

    }

    catch (error) {

        console.error(
            "Client login error:",
            error
        );

        return res.status(500).json({

            success: false,

            code:
                "serverError",

            message:
                "An internal server error occurred. Please try again."

        });

    }

};



/* =========================================================
   14. FORGOT PASSWORD
========================================================= */

/*
   CLIENT FORGOT PASSWORD FLOW:

   Forgot Password
          ↓
   Frontend sends email
          ↓
   Backend validates email
          ↓
   Check client
          ↓
   If client does not exist:
          Generic response
          ↓
   If client exists:
          Generate reset OTP
          ↓
   Save OTP + expiry
          ↓
   Send OTP
          ↓
   Return success response
          ↓
   Frontend saves client email
          ↓
   client-password-reset-otp/index.html

   IMPORTANT:

   The response deliberately does not reveal whether
   an email belongs to a SkillConnect account.

   This prevents account-enumeration attacks.
*/

const forgotPassword = async (
    req,
    res
) => {

    try {

        /* ==========================================
           14.1 GET EMAIL
        ========================================== */

        const {
            email
        } = req.body;



        /* ==========================================
           14.2 NORMALIZE EMAIL
        ========================================== */

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";



        /* ==========================================
           14.3 VALIDATE EMAIL
        ========================================== */

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !normalizedEmail ||
            !emailPattern.test(
                normalizedEmail
            )
        ) {

            return res.status(400).json({

                success: false,

                code:
                    "invalidEmail",

                message:
                    "Please enter a valid email address."

            });

        }



        /* ==========================================
           14.4 FIND CLIENT
        ========================================== */

        const client =
            await Client.findOne({

                email:
                    normalizedEmail

            });



        /* ==========================================
           14.5 GENERIC RESPONSE
        ========================================== */

        /*
           Do not tell the user whether the email
           exists in our database.

           This prevents attackers from discovering
           registered client accounts.
        */

        if (
            !client
        ) {

            return res.status(200).json({

                success: true,

                code:
                    "passwordResetRequestReceived",

                message:
                    "If an account exists for this email, a password reset OTP has been sent."

            });

        }



        /* ==========================================
           14.6 GENERATE RESET OTP
        ========================================== */

        const resetOTP =
            generateEmailOTP();


        const resetOTPExpires =
            generateOTPExpiry();



        /* ==========================================
           14.7 SAVE RESET OTP
        ========================================== */

        client.passwordResetOtp =
            resetOTP;

        client.passwordResetOtpExpires =
            resetOTPExpires;

        client.passwordResetVerified =
            false;


        await client.save();



        /* ==========================================
           14.8 SEND RESET OTP
        ========================================== */

        try {

            await sendPasswordResetOTP(
                client.email,
                resetOTP
            );

        }

        catch (emailError) {

            console.error(
                "Client password reset email error:",
                emailError
            );

            return res.status(500).json({

                success: false,

                code:
                    "emailDeliveryFailed",

                message:
                    "We could not send the password reset OTP. Please try again."

            });

        }



        /* ==========================================
           14.9 SUCCESS RESPONSE
        ========================================== */

        return res.status(200).json({

            success: true,

            code:
                "passwordResetOtpSent",

            message:
                "If an account exists for this email, a password reset OTP has been sent.",

            email:
                client.email

        });

    }

    catch (error) {

        console.error(
            "Client forgot-password error:",
            error
        );

        return res.status(500).json({

            success: false,

            code:
                "serverError",

            message:
                "An internal server error occurred. Please try again."

        });

    }

};



/* =========================================================
   15. EXPORT CONTROLLER FUNCTIONS
========================================================= */

/*
   routes/client-authentication.js imports these
   controller functions.
*/

module.exports = {

    signup,

    login,

    forgotPassword

};