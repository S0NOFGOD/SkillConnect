"use strict";

const express = require("express");
const router = express.Router();

const {
    verifyPasswordResetOTP,
    resendPasswordResetOTP
} = require("../controllers/worker-password-reset-otp");

// Verify password-reset OTP
router.post(
    "/password-reset-otp/verify",
    verifyPasswordResetOTP
);

// Resend password-reset OTP
router.post(
    "/password-reset-otp/resend",
    resendPasswordResetOTP
);

module.exports = router;