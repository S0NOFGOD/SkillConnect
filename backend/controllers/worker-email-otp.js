/* =========================================================
   WORKER EMAIL OTP CONTROLLER
   ---------------------------------------------------------
   RESPONSIBILITIES:
   1. Verify worker email OTP
   2. Resend worker email OTP

   This controller does NOT:
   - Handle page redirects
   - Handle frontend UI
   - Generate email directly
   - Connect directly to Brevo
   ========================================================= */


/* =========================================================
   IMPORT DEPENDENCIES
   ========================================================= */

const Worker = require("../models/worker");

const {
  generateOTPData,
  sendOTPEmail
} = require("../utils/generateOtp");


/* =========================================================
   VERIFY WORKER EMAIL OTP
   ---------------------------------------------------------
   Flow:

   Frontend sends:
   {
     email,
     otp
   }

   ↓

   Find worker
   ↓
   Check OTP
   ↓
   Check expiry
   ↓
   Verify email
   ↓
   Clear OTP
   ↓
   Return success
   ========================================================= */

const verifyEmailOTP = async (req, res) => {
  try {

    /* =====================================================
       GET EMAIL AND OTP
       ===================================================== */

    const { email, otp } = req.body;


    /* =====================================================
       VALIDATE REQUIRED FIELDS
       ===================================================== */

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required."
      });
    }


    /* =====================================================
       NORMALIZE INPUT
       ===================================================== */

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOTP = otp.trim();


    /* =====================================================
       VALIDATE OTP FORMAT
       ===================================================== */

    if (!/^\d{6}$/.test(normalizedOTP)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be exactly 6 digits."
      });
    }


    /* =====================================================
       FIND WORKER
       -----------------------------------------------------
       emailOtp and emailOtpExpires use select:false
       in the Worker model.

       Therefore, we explicitly select them here.
       ===================================================== */

    const worker = await Worker.findOne({
      email: normalizedEmail
    }).select("+emailOtp +emailOtpExpires");


    /* =====================================================
       CHECK IF WORKER EXISTS
       ===================================================== */

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker account not found."
      });
    }


    /* =====================================================
       CHECK OTP
       ===================================================== */

    if (!worker.emailOtp || worker.emailOtp !== normalizedOTP) {
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP."
      });
    }


    /* =====================================================
       CHECK OTP EXPIRY
       ===================================================== */

    if (
      !worker.emailOtpExpires ||
      new Date() > worker.emailOtpExpires
    ) {

      /* ===================================================
         CLEAR EXPIRED OTP
         =================================================== */

      worker.emailOtp = null;
      worker.emailOtpExpires = null;

      await worker.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }


    /* =====================================================
       VERIFY WORKER EMAIL
       ===================================================== */

    worker.isEmailVerified = true;


    /* =====================================================
       CLEAR USED OTP
       ===================================================== */

    worker.emailOtp = null;
    worker.emailOtpExpires = null;


    /* =====================================================
       SAVE WORKER
       ===================================================== */

    await worker.save();


    /* =====================================================
       RETURN SUCCESS
       -----------------------------------------------------
       The frontend is responsible for showing the success
       modal and redirecting to worker-create-profile.
       ===================================================== */

    return res.status(200).json({
      success: true,
      message: "Email verified successfully."
    });

  } catch (error) {

    /* =====================================================
       HANDLE VERIFICATION ERROR
       ===================================================== */

    console.error(
      "Worker email OTP verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying your email."
    });
  }
};


/* =========================================================
   RESEND WORKER EMAIL OTP
   ---------------------------------------------------------
   Flow:

   Frontend sends:
   {
     email
   }

   ↓

   Find worker
   ↓
   Generate new OTP
   ↓
   Generate new 10-minute expiry
   ↓
   Save OTP
   ↓
   Send OTP email
   ↓
   Return success
   ========================================================= */

const resendEmailOTP = async (req, res) => {
  try {

    /* =====================================================
       GET EMAIL
       ===================================================== */

    const { email } = req.body;


    /* =====================================================
       VALIDATE EMAIL
       ===================================================== */

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }


    /* =====================================================
       NORMALIZE EMAIL
       ===================================================== */

    const normalizedEmail = email.trim().toLowerCase();


    /* =====================================================
       FIND WORKER
       ===================================================== */

    const worker = await Worker.findOne({
      email: normalizedEmail
    });


    /* =====================================================
       CHECK IF WORKER EXISTS
       ===================================================== */

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker account not found."
      });
    }


    /* =====================================================
       CHECK IF EMAIL IS ALREADY VERIFIED
       ===================================================== */

    if (worker.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Your email is already verified."
      });
    }


    /* =====================================================
       GENERATE NEW OTP
       -----------------------------------------------------
       generateOTPData() returns:
       - otp
       - expiresAt

       The expiry is 10 minutes.
       ===================================================== */

    const { otp, expiresAt } = generateOTPData();


    /* =====================================================
       SAVE NEW OTP
       ===================================================== */

    worker.emailOtp = otp;
    worker.emailOtpExpires = expiresAt;

    await worker.save();


    /* =====================================================
       SEND NEW OTP EMAIL
       ===================================================== */

    await sendOTPEmail({
      email: normalizedEmail,
      otp,
      type: "email-verification"
    });


    /* =====================================================
       RETURN SUCCESS
       ===================================================== */

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email."
    });

  } catch (error) {

    /* =====================================================
       HANDLE RESEND ERROR
       ===================================================== */

    console.error(
      "Worker email OTP resend error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong while resending the OTP."
    });
  }
};


/* =========================================================
   EXPORT CONTROLLER FUNCTIONS
   ========================================================= */

module.exports = {
  verifyEmailOTP,
  resendEmailOTP
};