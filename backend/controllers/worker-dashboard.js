"use strict";

const axios = require("axios");
const crypto = require("crypto");

const Worker = require("../models/worker");
const Client = require("../models/client");

const { authenticateWorker } =
    require("./worker-authentication");

const { v2: cloudinary } = require("cloudinary");

/* =========================================================
   1. CLOUDINARY CONFIGURATION
========================================================= */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/* =========================================================
   2. ROBASE CONFIGURATION
========================================================= */

const ROBASE_API_KEY = process.env.ROBASE_API_KEY;

const ROBASE_BASE_URL = "https://api.robase.dev";

/* =========================================================
   3. OTP CONFIGURATION
========================================================= */

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const MAX_OTP_SENDS = 4;

/* =========================================================
   4. AUTHENTICATION
========================================================= */

const authenticateRequest = (req, res) => {

    const auth = authenticateWorker(req);

    if (!auth || !auth.valid) {

        res.status(401).json({
            success: false,
            message: auth?.message ||
                "Authentication required. Please log in again."
        });

        return false;
    }

    req.workerId = auth.userId;

    return true;
};

/* =========================================================
   5. GENERATE OTP
========================================================= */

const generateOTP = () =>
    crypto.randomInt(100000, 1000000).toString();

/* =========================================================
   6. HASH OTP
========================================================= */

const hashOTP = otp =>
    crypto.createHash("sha256")
        .update(otp)
        .digest("hex");

/* =========================================================
   7. SEND PHONE OTP
========================================================= */

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

/* =========================================================
   8. FORMAT PROFILE PHOTO
========================================================= */

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
   9. COUNT CLIENTS WITHIN 10 KM
========================================================= */

const countNearbyClients = async (workerLatitude, workerLongitude) => {

    /*
     * Client documents must contain numeric latitude
     * and longitude fields.
     *
     * Haversine formula calculates the distance between
     * two geographic coordinates in kilometres.
     */

    return Client.countDocuments({

        latitude: {
            $type: "number"
        },

        longitude: {
            $type: "number"
        },

        $expr: {

            $let: {

                vars: {

                    workerLat: {
                        $degreesToRadians: workerLatitude
                    },

                    workerLon: {
                        $degreesToRadians: workerLongitude
                    },

                    clientLat: {
                        $degreesToRadians: "$latitude"
                    },

                    clientLon: {
                        $degreesToRadians: "$longitude"
                    }

                },

                in: {

                    $lte: [

                        {

                            $multiply: [

                                6371,

                                2,

                                {

                                    $asin: {

                                        $sqrt: {

                                            $add: [

                                                {

                                                    $pow: [

                                                        {

                                                            $sin: {

                                                                $divide: [

                                                                    {
                                                                        $subtract: [
                                                                            "$$clientLat",
                                                                            "$$workerLat"
                                                                        ]
                                                                    },

                                                                    2

                                                                ]

                                                            }

                                                        },

                                                        2

                                                    ]

                                                },

                                                {

                                                    $multiply: [

                                                        {
                                                            $cos: "$$workerLat"
                                                        },

                                                        {
                                                            $cos: "$$clientLat"
                                                        },

                                                        {

                                                            $pow: [

                                                                {

                                                                    $sin: {

                                                                        $divide: [

                                                                            {
                                                                                $subtract: [
                                                                                    "$$clientLon",
                                                                                    "$$workerLon"
                                                                                ]
                                                                            },

                                                                            2

                                                                        ]

                                                                    }

                                                                },

                                                                2

                                                            ]

                                                        }

                                                    ]

                                                }

                                            ]

                                        }

                                    }

                                }

                            ]

                        },

                        10

                    ]

                }

            }

        }

    });

};

/* =========================================================
   10. GET WORKER DASHBOARD
========================================================= */

const getWorkerDashboard = async (req, res) => {

    /*
     * FLOW:
     * Validate accessToken inside the controller.
     */

    if (!authenticateRequest(req, res)) {
        return;
    }

    try {

        /*
         * Retrieve authenticated worker.
         */

        const worker = await Worker.findById(req.workerId);

        if (!worker) {

            return res.status(404).json({
                success: false,
                message: "Worker account not found."
            });

        }

        /*
         * Retrieve worker coordinates.
         */

        const workerLatitude = worker.latitude;

        const workerLongitude = worker.longitude;

        /*
         * Count clients within 10 km.
         *
         * If the worker has no valid coordinates,
         * nearby client count is zero.
         */

        let totalClients = 0;

        if (
            Number.isFinite(workerLatitude) &&
            Number.isFinite(workerLongitude) &&
            workerLatitude >= -90 &&
            workerLatitude <= 90 &&
            workerLongitude >= -180 &&
            workerLongitude <= 180
        ) {

            totalClients = await countNearbyClients(
                workerLatitude,
                workerLongitude
            );

        }

        /*
         * Count worker services.
         *
         * Preserve the existing dashboard counting logic.
         */

        const totalSkills = Array.isArray(worker.services)
            ? worker.services.length
            : 0;

        /*
         * Convert Cloudinary public ID to URL.
         */

        const profilePhoto =
            formatProfilePhoto(worker.profilePhoto);

        /*
         * Prepare dashboard response.
         */

        const workerData = {

            profileVerificationExpires:
                worker.profileVerificationExpires || null,

            profilePhoto,

            fullName:
                worker.fullName || "",

            phone:
                worker.phone || "",

            latitude:
                worker.latitude ?? null,

            longitude:
                worker.longitude ?? null,

            totalClients,

            totalSkills

        };

        return res.status(200).json({

            success: true,

            worker: workerData

        });

    } catch (error) {

        console.error(
            "Get worker dashboard error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load your dashboard. Please try again."

        });

    }

};

/* =========================================================
   11. SEND PHONE OTP
========================================================= */

const verifyWorkerPhone = async (req, res) => {

    /*
     * FLOW:
     * Validate accessToken inside the controller.
     */

    if (!authenticateRequest(req, res)) {
        return;
    }

    try {

        const worker = await Worker.findById(req.workerId);

        if (!worker) {

            return res.status(404).json({

                success: false,

                message: "Worker account not found."

            });

        }

        /*
         * Check whether worker has a phone number.
         */

        if (!worker.phone) {

            return res.status(400).json({

                success: false,

                message:
                    "Please add a phone number before verifying your profile."

            });

        }

        /*
         * Retrieve OTP resend settings.
         */

        const attempts = worker.phoneOtpResendAttempts;

        if (!attempts) {

            return res.status(500).json({

                success: false,

                message:
                    "Phone verification settings are unavailable. Please try again."

            });

        }

        const now = Date.now();

        const cooldownUntil = attempts.coolDownUntil
            ? new Date(attempts.coolDownUntil)
            : null;

        /* =============================================
           STEP 1: CHECK EXISTING COOLDOWN
        ============================================= */

        if (
            cooldownUntil &&
            Number.isFinite(cooldownUntil.getTime()) &&
            cooldownUntil.getTime() > now
        ) {

            return res.status(429).json({

                success: false,

                message:
                    "You have reached the phone verification limit. Please try again in",

                coolDownUntil:
                    cooldownUntil.toISOString()

            });

        }

        /* =============================================
           STEP 2: RESET EXPIRED COOLDOWN
        ============================================= */

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

        /* =============================================
           STEP 3: CHECK OTP REQUEST LIMIT
        ============================================= */

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

        /* =============================================
           STEP 4: INCREMENT OTP RESEND COUNT
        ============================================= */

        attempts.phoneOtpResendCount =
            resendCount + 1;

        await worker.save();

        /* =============================================
           STEP 5: GENERATE OTP
        ============================================= */

        const otp = generateOTP();

        /* =============================================
           STEP 6: SEND OTP TO PHONE
        ============================================= */

        await sendPhoneOtp(worker.phone, otp);

        /* =============================================
           STEP 7: HASH OTP
        ============================================= */

        worker.phoneOtpHash = hashOTP(otp);

        /* =============================================
           STEP 8: GENERATE 10-MINUTE EXPIRY
        ============================================= */

        const otpExpires = new Date(
            Date.now() + OTP_EXPIRY_MS
        );

        /* =============================================
           STEP 9: SAVE OTP HASH AND EXPIRY
        ============================================= */

        worker.phoneOtpExpires = otpExpires;

        await worker.save();

        /* =============================================
           STEP 10: RETURN SUCCESS
        ============================================= */

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

/* =========================================================
   12. EXPORT CONTROLLERS
========================================================= */

module.exports = {

    getWorkerDashboard,

    verifyWorkerPhone

};