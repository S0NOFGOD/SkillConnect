"use strict";

const crypto = require("crypto");
const https = require("https");
const Worker = require("../models/worker");

// ==========================================
// CONFIGURATION
// ==========================================

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME =
    process.env.BREVO_SENDER_NAME || "SkillConnect";

const OTP_EXPIRY_MINUTES = 10;
const RESET_AUTHORIZATION_MINUTES = 10;
const MAX_RESEND_ATTEMPTS = 3;
const RESEND_COOLDOWN_HOURS = 24;

const generateOTP = () =>
    crypto.randomInt(100000, 1000000).toString();

const hashOTP = otp =>
    crypto.createHash("sha256").update(otp).digest("hex");

const createExpiry = minutes =>
    new Date(Date.now() + minutes * 60 * 1000);

const isValidEmail = email =>
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
    );

const normalizeEmail = email =>
    email.trim().toLowerCase();

const isOTPMatch = (otp, storedHash) => {
    if (
        typeof storedHash !== "string" ||
        !/^[a-f0-9]{64}$/i.test(storedHash)
    ) {
        return false;
    }

    const submittedHash = Buffer.from(
        hashOTP(otp),
        "hex"
    );

    const savedHash = Buffer.from(
        storedHash,
        "hex"
    );

    return crypto.timingSafeEqual(
        submittedHash,
        savedHash
    );
};

// ==========================================
// BREVO EMAIL DELIVERY
// ==========================================

const sendEmail = async ({
    to,
    subject,
    htmlContent
}) => {
    if (!to || !subject || !htmlContent) {
        throw new Error("Email details are incomplete.");
    }

    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
        throw new Error(
            "Brevo email configuration is incomplete."
        );
    }

    const data = JSON.stringify({
        sender: {
            name: BREVO_SENDER_NAME,
            email: BREVO_SENDER_EMAIL
        },
        to: [{ email: to }],
        subject,
        htmlContent
    });

    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: "api.brevo.com",
            path: "/v3/smtp/email",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
                "api-key": BREVO_API_KEY
            }
        }, response => {
            let responseData = "";

            response.on("data", chunk => {
                responseData += chunk;
            });

            response.on("end", () => {
                if (
                    response.statusCode >= 200 &&
                    response.statusCode < 300
                ) {
                    return resolve({
                        success: true,
                        data: responseData
                    });
                }

                reject(
                    new Error(
                        `Brevo email error (${response.statusCode})`
                    )
                );
            });
        });

        request.setTimeout(15000, () => {
            request.destroy(
                new Error("Brevo email request timed out.")
            );
        });

        request.on("error", reject);
        request.write(data);
        request.end();
    });
};

const sendOTPEmail = async ({ email, otp }) => {
    const htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
            <h2>Reset Your SkillConnect Password</h2>
            <p>Use the code below to verify your password reset request.</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;margin:20px 0;background:#f5f5f5;border-radius:8px;">
                ${otp}
            </div>
            <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
            <p>If you did not request this code, you can safely ignore this email.</p>
            <p>— SkillConnect</p>
        </div>
    `;

    return sendEmail({
        to: email,
        subject: "SkillConnect Password Reset",
        htmlContent
    });
};

// ==========================================
// 1. VERIFY PASSWORD RESET OTP
// ==========================================

const verifyPasswordResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body || {};

        // Validate request data.
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        if (
            typeof otp !== "string" ||
            !/^\d{6}$/.test(otp.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "OTP must be a 6-digit code."
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedOTP = otp.trim();

        // Find worker by email.
        const worker = await Worker.findOne({
            email: normalizedEmail
        }).select(
            "+passwordResetOtpHash +passwordResetOtpExpires"
        );

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account not found."
            });
        }

        // Check OTP expiry before comparing the OTP hash.
        const otpExpiry = worker.passwordResetOtpExpires;

        if (
            !otpExpiry ||
            new Date(otpExpiry).getTime() <= Date.now()
        ) {
            worker.passwordResetOtpHash = null;
            worker.passwordResetOtpExpires = null;
            await worker.save();

            return res.status(400).json({
                success: false,
                message: "Password reset code has expired. Please request a new code."
            });
        }

        if (!worker.passwordResetOtpHash) {
            return res.status(400).json({
                success: false,
                message: "No active password reset code found. Please request a new code."
            });
        }

        // Compare submitted OTP with the stored hash.
        if (
            !isOTPMatch(
                normalizedOTP,
                worker.passwordResetOtpHash
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid password reset code."
            });
        }

        // Clear OTP and issue 10-minute reset authorization.
        worker.passwordResetOtpHash = null;
        worker.passwordResetOtpExpires = null;

        worker.resetAuthorizationExpires = createExpiry(
            RESET_AUTHORIZATION_MINUTES
        );

        worker.passwordResetVerified = true;
        worker.passwordResetVerifiedAt = new Date();

        await worker.save();

        return res.status(200).json({
            success: true,
            message: "Password reset code verified successfully.",
            redirect: "../worker-password-change/index.html"
        });
    } catch (error) {
        console.error(
            "Worker password reset OTP verification error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "An error occurred while verifying the password reset code."
        });
    }
};

// ==========================================
// 2. RESEND PASSWORD RESET OTP
// ==========================================

const resendPasswordResetOTP = async (req, res) => {
    try {
        const { email } = req.body || {};

        // Validate email before querying MongoDB.
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        const normalizedEmail = normalizeEmail(email);

        // Find worker by email.
        const worker = await Worker.findOne({
            email: normalizedEmail
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account not found."
            });
        }

        const now = new Date();

        let resendCount = Number(
            worker.get(
                "otpResendAttempts.passwordResetOtpResendCount"
            ) ?? 0
        );

        let cooldownUntil = worker.get(
            "otpResendAttempts.coolDownUntil"
        );

        // Check whether the 24-hour cooldown is active.
        if (
            cooldownUntil &&
            new Date(cooldownUntil).getTime() > now.getTime()
        ) {
            return res.status(429).json({
                success: false,
                message: "You have reached the password reset OTP resend limit. Please try again after the cooldown period.",
                cooldownUntil: new Date(
                    cooldownUntil
                ).toISOString()
            });
        }

        // A completed cooldown starts a new resend window.
        if (cooldownUntil) {
            worker.set(
                "otpResendAttempts.passwordResetOtpResendCount",
                0
            );

            worker.set(
                "otpResendAttempts.coolDownUntil",
                null
            );

            resendCount = 0;
            cooldownUntil = null;

            await worker.save();
        }

        // If three resends have already been used,
        // start the 24-hour cooldown and block this request.
        if (resendCount >= MAX_RESEND_ATTEMPTS) {
            const newCooldownUntil = new Date(
                Date.now() +
                RESEND_COOLDOWN_HOURS * 60 * 60 * 1000
            );

            worker.set(
                "otpResendAttempts.coolDownUntil",
                newCooldownUntil
            );

            await worker.save();

            return res.status(429).json({
                success: false,
                message: "You have reached the password reset OTP resend limit. Please try again after 24 hours.",
                cooldownUntil: newCooldownUntil.toISOString()
            });
        }

        // Generate a fresh OTP and prepare its expiry.
        const otp = generateOTP();
        const otpHash = hashOTP(otp);
        const otpExpires = createExpiry(OTP_EXPIRY_MINUTES);

        // Reserve this resend attempt before sending the email.
        // The database count is kept separate from phone OTPs.
        worker.set(
            "otpResendAttempts.passwordResetOtpResendCount",
            resendCount + 1
        );

        worker.set(
            "otpResendAttempts.coolDownUntil",
            null
        );

        worker.passwordResetOtpHash = otpHash;
        worker.passwordResetOtpExpires = otpExpires;

        // Invalidate any previous reset authorization.
        worker.resetAuthorizationExpires = null;
        worker.passwordResetVerified = false;
        worker.passwordResetVerifiedAt = null;

        await worker.save();

        try {
            await sendOTPEmail({
                email: worker.email,
                otp
            });
        } catch (emailError) {
            // Do not leave an unsent OTP valid.
            worker.passwordResetOtpHash = null;
            worker.passwordResetOtpExpires = null;
            await worker.save();

            throw emailError;
        }

        return res.status(200).json({
            success: true,
            message: "A new password reset code has been sent to your email."
        });
    } catch (error) {
        console.error(
            "Worker resend password reset OTP error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "An error occurred while sending the password reset code."
        });
    }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
    verifyPasswordResetOTP,
    resendPasswordResetOTP
};