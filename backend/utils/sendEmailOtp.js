/* =========================================================
   SKILLCONNECT
   UTILS — SEND EMAIL OTP
========================================================= */


/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const https =
    require("https");


/* =========================================================
   2. IMPORT BREVO CONFIGURATION
========================================================= */

const {

    BREVO_API_KEY,

    BREVO_SENDER_EMAIL,

    BREVO_SENDER_NAME

} =
    require("../config/brevo");


/* =========================================================
   3. SEND EMAIL
========================================================= */

const sendEmail =
    async ({
        to,
        subject,
        htmlContent
    }) => {

        /* -------------------------------------------------
           Validate recipient
        ------------------------------------------------- */

        if (!to) {

            throw new Error(
                "Recipient email is required."
            );

        }


        /* -------------------------------------------------
           Validate subject
        ------------------------------------------------- */

        if (!subject) {

            throw new Error(
                "Email subject is required."
            );

        }


        /* -------------------------------------------------
           Validate HTML content
        ------------------------------------------------- */

        if (!htmlContent) {

            throw new Error(
                "Email HTML content is required."
            );

        }


        /* -------------------------------------------------
           Validate Brevo API key
        ------------------------------------------------- */

        if (!BREVO_API_KEY) {

            throw new Error(
                "BREVO_API_KEY is not configured."
            );

        }


        /* -------------------------------------------------
           Validate sender email
        ------------------------------------------------- */

        if (!BREVO_SENDER_EMAIL) {

            throw new Error(
                "BREVO_SENDER_EMAIL is not configured."
            );

        }


        /* =================================================
           CREATE EMAIL DATA
        ================================================= */

        const data =
            JSON.stringify({

                sender: {

                    name:
                        BREVO_SENDER_NAME,

                    email:
                        BREVO_SENDER_EMAIL

                },

                to: [

                    {
                        email:
                            to
                    }

                ],

                subject,

                htmlContent

            });


        /* =================================================
           SEND REQUEST TO BREVO
        ================================================= */

        return new Promise(
            (resolve, reject) => {

                const request =
                    https.request(

                        {

                            hostname:
                                "api.brevo.com",

                            path:
                                "/v3/smtp/email",

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Content-Length":
                                    Buffer.byteLength(
                                        data
                                    ),

                                "api-key":
                                    BREVO_API_KEY

                            }

                        },

                        response => {

                            let responseData =
                                "";


                            /* -------------------------------------------------
                               Collect Brevo response
                            ------------------------------------------------- */

                            response.on(
                                "data",
                                chunk => {

                                    responseData +=
                                        chunk;

                                }
                            );


                            /* -------------------------------------------------
                               Process Brevo response
                            ------------------------------------------------- */

                            response.on(
                                "end",
                                () => {

                                    if (
                                        response.statusCode >=
                                            200 &&
                                        response.statusCode <
                                            300
                                    ) {

                                        resolve({

                                            success:
                                                true,

                                            data:
                                                responseData

                                        });

                                        return;

                                    }


                                    reject(

                                        new Error(
                                            `Brevo email error (${response.statusCode}): ${responseData}`
                                        )

                                    );

                                }
                            );

                        }

                    );


                /* -------------------------------------------------
                   Handle request errors
                ------------------------------------------------- */

                request.on(
                    "error",
                    error =>
                        reject(error)
                );


                /* -------------------------------------------------
                   Send request body
                ------------------------------------------------- */

                request.write(
                    data
                );


                request.end();

            }
        );

    };


/* =========================================================
   4. CREATE AND SEND OTP EMAIL
========================================================= */

const sendOTPEmail =
    async ({
        email,
        otp,
        type
    }) => {

        /* -------------------------------------------------
           Validate email
        ------------------------------------------------- */

        if (!email) {

            throw new Error(
                "Recipient email is required."
            );

        }


        /* -------------------------------------------------
           Validate OTP
        ------------------------------------------------- */

        if (!otp) {

            throw new Error(
                "OTP is required."
            );

        }


        let subject;

        let title;

        let message;


        /* =================================================
           EMAIL VERIFICATION
        ================================================= */

        if (
            type ===
            "email-verification"
        ) {

            subject =
                "Verify Your SkillConnect Account";

            title =
                "Verify Your Email";

            message =
                "Use the verification code below to verify your SkillConnect account.";

        }


        /* =================================================
           PASSWORD RESET
        ================================================= */

        else if (
            type ===
            "password-reset"
        ) {

            subject =
                "SkillConnect Password Reset";

            title =
                "Reset Your Password";

            message =
                "Use the code below to verify your password reset request.";

        }


        /* =================================================
           INVALID OTP TYPE
        ================================================= */

        else {

            throw new Error(
                "Invalid OTP email type."
            );

        }


        /* =================================================
           CREATE EMAIL HTML
        ================================================= */

        const htmlContent =

            `
            <div
                style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    color: #333;
                "
            >

                <h2>
                    ${title}
                </h2>

                <p>
                    ${message}
                </p>

                <div
                    style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        text-align: center;
                        padding: 20px;
                        margin: 20px 0;
                        background: #f5f5f5;
                        border-radius: 8px;
                    "
                >
                    ${otp}
                </div>

                <p>
                    This code expires in 10 minutes.
                </p>

                <p>
                    If you did not request this code,
                    you can safely ignore this email.
                </p>

                <p>
                    — SkillConnect
                </p>

            </div>
            `;


        /* =================================================
           SEND OTP EMAIL
        ================================================= */

        return sendEmail({

            to:
                email,

            subject,

            htmlContent

        });

    };


/* =========================================================
   5. EXPORT
========================================================= */

module.exports = {

    sendEmail,

    sendOTPEmail

};