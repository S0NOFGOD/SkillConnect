/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const https = require("https");


/* =========================================================
   2. ENVIRONMENT VARIABLES
========================================================= */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "SkillConnect";


/* =========================================================
   3. SEND EMAIL
========================================================= */

const sendEmail = async ({
  to,
  subject,
  htmlContent,
}) => {
  /* -------------------------------------------------------
     Validate required values
  ------------------------------------------------------- */

  if (!to) {
    throw new Error("Recipient email is required.");
  }

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  if (!htmlContent) {
    throw new Error("Email HTML content is required.");
  }

  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  if (!BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL is not configured.");
  }


  /* -------------------------------------------------------
     Brevo request data
  ------------------------------------------------------- */

  const data = JSON.stringify({
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },

    to: [
      {
        email: to,
      },
    ],

    subject,
    htmlContent,
  });


  /* -------------------------------------------------------
     Send request to Brevo
  ------------------------------------------------------- */

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.brevo.com",
        path: "/v3/smtp/email",
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          "api-key": BREVO_API_KEY,
        },
      },

      (response) => {
        let responseData = "";

        response.on("data", (chunk) => {
          responseData += chunk;
        });

        response.on("end", () => {
          if (
            response.statusCode >= 200 &&
            response.statusCode < 300
          ) {
            resolve({
              success: true,
              data: responseData,
            });

            return;
          }

          reject(
            new Error(
              `Brevo email error (${response.statusCode}): ${responseData}`
            )
          );
        });
      }
    );


    /* -----------------------------------------------------
       Handle request errors
    ----------------------------------------------------- */

    request.on("error", (error) => {
      reject(error);
    });


    /* -----------------------------------------------------
       Send request
    ----------------------------------------------------- */

    request.write(data);
    request.end();
  });
};


/* =========================================================
   4. EXPORT
========================================================= */

module.exports = {
  sendEmail,
};