/* =========================================================
   1. BREVO CONFIGURATION
========================================================= */

const BREVO_API_KEY =
    process.env.BREVO_API_KEY;


const BREVO_SENDER_EMAIL =
    process.env.BREVO_SENDER_EMAIL;


const BREVO_SENDER_NAME =
    process.env.BREVO_SENDER_NAME ||
    "SkillConnect";


const BREVO_SMS_SENDER_NAME =
    process.env.BREVO_SMS_SENDER_NAME;


/* =========================================================
   2. EXPORT
========================================================= */

module.exports = {

    BREVO_API_KEY,

    BREVO_SENDER_EMAIL,

    BREVO_SENDER_NAME,

    BREVO_SMS_SENDER_NAME

};