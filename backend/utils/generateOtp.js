/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const crypto = require("crypto");

const Worker = require("../models/worker");

const { sendEmail } = require("./sendEmail");


/* =========================================================
   2. OTP CONFIGURATION
========================================================= */

const OTP_EXPIRY_MINUTES = 10;


/* =========================================================
   3. GENERATE OTP
========================================================= */

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};


/* =========================================================
   4. GENERATE OTP DATA
========================================================= */

const generateOTPData = () => {
  const otp = generateOTP();

  const expiresAt =
    new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

  return {
    otp,
    expiresAt,
  };
};


/* =========================================================
   5. SEND OTP EMAIL
========================================================= */

const sendOTPEmail = async ({
  email,
  otp,
  type,
}) => {
  let subject;
  let title;
  let message;


  /* -------------------------------------------------------
     Email verification
  ------------------------------------------------------- */

  if (type === "email-verification") {
    subject = "Verify Your SkillConnect Account";

    title = "Verify Your Email";

    message =
      "Use the verification code below to verify your SkillConnect account.";
  }


  /* -------------------------------------------------------
     Password reset
  ------------------------------------------------------- */

  else if (type === "password-reset") {
    subject = "SkillConnect Password Reset";

    title = "Reset Your Password";

    message =
      "Use the code below to verify your password reset request.";
  }


  /* -------------------------------------------------------
     Phone verification
  ------------------------------------------------------- */

  else {
    throw new Error("Invalid OTP email type.");
  }


  /* -------------------------------------------------------
     Email template
  ------------------------------------------------------- */

  const htmlContent = `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 30px;
    ">

      <h2>${title}</h2>

      <p>${message}</p>

      <div style="
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 8px;
        margin: 30px 0;
      ">
        ${otp}
      </div>

      <p>
        This code expires in ${OTP_EXPIRY_MINUTES} minutes.
      </p>

      <p>
        If you did not request this code, you can safely ignore
        this email.
      </p>

      <p>
        — SkillConnect
      </p>

    </div>
  `;


  /* -------------------------------------------------------
     Send through centralized email utility
  ------------------------------------------------------- */

  return sendEmail({
    to: email,
    subject,
    htmlContent,
  });
};


/* =========================================================
   6. SEND OTP
========================================================= */

const sendOTP = async ({
  workerId,
  type,
}) => {
  /* -------------------------------------------------------
     Find worker
  ------------------------------------------------------- */

  const worker = await Worker.findById(workerId);

  if (!worker) {
    throw new Error("Worker account not found.");
  }


  /* -------------------------------------------------------
     Generate OTP
  ------------------------------------------------------- */

  const {
    otp,
    expiresAt,
  } = generateOTPData();


  /* =======================================================
     EMAIL VERIFICATION OTP
  ======================================================= */

  if (type === "email-verification") {
    worker.emailOtp = otp;
    worker.emailOtpExpires = expiresAt;

    await worker.save();

    await sendOTPEmail({
      email: worker.email,
      otp,
      type,
    });

    return {
      success: true,
      type,
    };
  }


  /* =======================================================
     PASSWORD RESET OTP
  ======================================================= */

  if (type === "password-reset") {
    worker.passwordResetOtp = otp;
    worker.passwordResetOtpExpires = expiresAt;

    worker.passwordResetVerified = false;
    worker.passwordResetVerifiedAt = null;

    worker.resetAuthorization = null;
    worker.resetAuthorizationExpires = null;

    await worker.save();

    await sendOTPEmail({
      email: worker.email,
      otp,
      type,
    });

    return {
      success: true,
      type,
    };
  }


  /* =======================================================
     PHONE VERIFICATION OTP
  ======================================================= */

  if (type === "phone-verification") {
    worker.phoneOtp = otp;
    worker.phoneOtpExpires = expiresAt;

    await worker.save();

    return {
      success: true,
      type,
    };
  }


  /* =======================================================
     INVALID OTP TYPE
  ======================================================= */

  throw new Error("Invalid OTP type.");
};


/* =========================================================
   7. EXPORT
========================================================= */

module.exports = {
  generateOTP,
  generateOTPData,
  sendOTPEmail,
  sendOTP,
};