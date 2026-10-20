"use strict";

const axios = require("axios");
const crypto = require("crypto");
const Worker = require("../models/worker");
const Client = require("../models/client");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const ROBASE_API_KEY = process.env.ROBASE_API_KEY;
const ROBASE_BASE_URL = "https://api.robase.dev";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_OTP_SENDS = 4;

const generateOTP = () =>
    crypto.randomInt(100000, 1000000).toString();

const hashOTP = otp =>
    crypto.createHash("sha256").update(otp).digest("hex");

const sendPhoneOtp = async (phone, otp) => {
    if (!phone) {
        throw new Error("Phone number is required.");
    }

    if (!ROBASE_API_KEY) {
        throw new Error("ROBASE_API_KEY is not configured.");
    }

    const message =
        `Your SkillConnect verification code is ${otp}. ` +
        "This code expires in 10 minutes. Do not share this code with anyone.";

    await axios.post(
        `${ROBASE_BASE_URL}/v1/sms/send`,
        {
            phone_number: phone,
            message
        },
        {
            headers: {
                Authorization: `Bearer ${ROBASE_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );
};

const formatProfilePhoto = publicId => {
    if (!publicId) return null;

    if (/^https?:\/\//i.test(publicId)) {
        return publicId;
    }

    return cloudinary.url(publicId, {
        secure: true
    });
};

/* =========================================================
   GET WORKER DASHBOARD
========================================================= */

const getWorkerDashboard = async (req, res) => {
    try {
        const worker = await Worker.findById(req.workerId);

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account not found."
            });
        }

        let totalClients = 0;

        if (typeof worker.lga === "string" && worker.lga.trim()) {
            const escapedLga = worker.lga.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            totalClients = await Client.countDocuments({
                lga: {
                    $regex: `^${escapedLga}$`,
                    $options: "i"
                }
            });
        }

        const workerData = {
            phoneVerificationExpires:
                worker.phoneVerificationExpires || null,

            profilePhoto:
                formatProfilePhoto(worker.profilePhoto),

            fullName: worker.fullName || "",
            phone: worker.phone || "",
            country: worker.country || "",
            state: worker.state || "",
            city: worker.city || "",
            lga: worker.lga || "",

            totalSkill: Array.isArray(worker.skills)
                ? worker.skills.length
                : 0,

            totalClients
        };

        return res.status(200).json({
            success: true,
            worker: workerData
        });
    } catch (error) {
        console.error("Get worker dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load your dashboard. Please try again."
        });
    }
};

/* =========================================================
   SEND PHONE OTP
========================================================= */

const verifyWorkerPhone = async (req, res) => {
    try {
        const worker = await Worker.findById(req.workerId);

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account not found."
            });
        }

        if (!worker.phone) {
            return res.status(400).json({
                success: false,
                message: "Please add a phone number before verifying your profile."
            });
        }

        const verificationExpiry = worker.phoneVerificationExpires
            ? new Date(worker.phoneVerificationExpires)
            : null;

        if (
            verificationExpiry &&
            Number.isFinite(verificationExpiry.getTime()) &&
            verificationExpiry.getTime() > Date.now()
        ) {
            return res.status(400).json({
                success: false,
                message: "Your phone number is already verified."
            });
        }

        const attempts = worker.phoneOtpResendAttempts;

        if (!attempts) {
            return res.status(500).json({
                success: false,
                message: "Phone verification settings are unavailable. Please try again."
            });
        }

        const now = Date.now();

        const cooldownUntil = attempts.coolDownUntil
            ? new Date(attempts.coolDownUntil)
            : null;

        /*
         * FLOW STEP:
         * Check whether the 24-hour cooldown is active.
         */

        if (
            cooldownUntil &&
            Number.isFinite(cooldownUntil.getTime()) &&
            cooldownUntil.getTime() > now
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "You have reached the phone verification limit. Please try again in",
                coolDownUntil: cooldownUntil.toISOString()
            });
        }

        /*
         * FLOW STEP:
         * Reset the resend count after the cooldown expires.
         */

        if (
            cooldownUntil &&
            Number.isFinite(cooldownUntil.getTime()) &&
            cooldownUntil.getTime() <= now
        ) {
            attempts.phoneOtpResendCount = 0;
            attempts.coolDownUntil = null;
        }

        const resendCount =
            Number(attempts.phoneOtpResendCount) || 0;

        /*
         * FLOW STEP:
         * If the count is 4 or greater, start a new
         * 24-hour cooldown and return its timestamp.
         */

        if (resendCount >= MAX_OTP_SENDS) {
            attempts.coolDownUntil = new Date(
                now + COOLDOWN_MS
            );

            await worker.save();

            return res.status(429).json({
                success: false,
                message:
                    "You have reached the phone verification OTP limit. Please try again after 24 hours.",
                coolDownUntil:
                    attempts.coolDownUntil.toISOString()
            });
        }

        /*
         * FLOW STEP:
         * Increment the resend count before sending the OTP.
         */

        attempts.phoneOtpResendCount = resendCount + 1;
        await worker.save();

        /*
         * FLOW STEP:
         * Generate the OTP and its 10-minute expiry.
         */

        const otp = generateOTP();
        const otpExpires = new Date(
            Date.now() + OTP_EXPIRY_MS
        );

        /*
         * FLOW STEP:
         * Send the OTP to the worker's phone.
         */

        await sendPhoneOtp(worker.phone, otp);

        /*
         * FLOW STEP:
         * Hash the OTP and save the hash and expiry.
         */

        worker.phoneOtpHash = hashOTP(otp);
        worker.phoneOtpExpires = otpExpires;

        await worker.save();

        /*
         * FLOW STEP:
         * Return success so the frontend can show its
         * success modal and redirect to the OTP page.
         */

        return res.status(200).json({
            success: true,
            message:
                "A verification code has been sent to your phone.",
            phone: worker.phone,
            expiresAt: otpExpires
        });
    } catch (error) {
        console.error(
            "Worker phone verification error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to send your phone verification code. Please try again."
        });
    }
};

module.exports = {
    getWorkerDashboard,
    verifyWorkerPhone
};