/* =========================================================
   1. IMPORT BREVO
========================================================= */

const {
    BrevoClient
} =
    require("@getbrevo/brevo");


/* =========================================================
   2. IMPORT BREVO CONFIGURATION
========================================================= */

const {

    BREVO_API_KEY,

    BREVO_SMS_SENDER_NAME

} =
    require("../config/brevo");


/* =========================================================
   3. CREATE BREVO CLIENT
========================================================= */

const brevo =
    new BrevoClient({

        apiKey:
            BREVO_API_KEY

    });


/* =========================================================
   4. SEND PHONE OTP
========================================================= */

const sendPhoneOtp =
    async (
        phone,
        otp
    ) => {

        /* -------------------------------------------------
           Validate phone number
        ------------------------------------------------- */

        if (!phone) {

            throw new Error(
                "Phone number is required."
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


        /* -------------------------------------------------
           Validate Brevo API key
        ------------------------------------------------- */

        if (!BREVO_API_KEY) {

            throw new Error(
                "BREVO_API_KEY is not configured."
            );

        }


        /* -------------------------------------------------
           Validate SMS sender
        ------------------------------------------------- */

        if (!BREVO_SMS_SENDER_NAME) {

            throw new Error(
                "BREVO_SMS_SENDER_NAME is not configured."
            );

        }


        /* =================================================
           CREATE SMS MESSAGE
        ================================================= */

        const message =
            `Your SkillConnect verification code is ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;


        /* =================================================
           SEND SMS THROUGH BREVO
        ================================================= */

        const response =
            await brevo
                .transactionalSms
                .sendAsyncTransactionalSms({

                    recipient:
                        phone,

                    sender:
                        BREVO_SMS_SENDER_NAME,

                    content:
                        message

                });


        /* -------------------------------------------------
           Log Brevo response
        ------------------------------------------------- */

        console.log(
            "Brevo SMS response:",
            response
        );


        /* =================================================
           RETURN SUCCESS
        ================================================= */

        return {

            success:
                true,

            phone:
                phone,

            response:
                response

        };

    };


/* =========================================================
   5. EXPORT
========================================================= */

module.exports =
    sendPhoneOtp;