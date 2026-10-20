"use strict";

/* =========================================================
   SKILLCONNECT WORKER CREATE PROFILE CONTROLLER
========================================================= */

const Worker = require("../models/worker");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const { v2: cloudinary } = require("cloudinary");

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_COMPRESSED_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp"
};

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/* =========================================================
   AUTHENTICATION TOKEN FUNCTIONS
========================================================= */

const generateAccessToken = ({ userId, userType }) => jwt.sign(
    { userId, userType },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || "15m" }
);

const generateRefreshToken = ({ userId, userType }) => jwt.sign(
    { userId, userType },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d" }
);

const hashRefreshToken = token => crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

/* =========================================================
   HELPERS
========================================================= */

const sendError = (res, status, code, message) =>
    res.status(status).json({
        success: false,
        code,
        message
    });

const normalizeNamePart = name => name
    .toLowerCase()
    .split(/([-'])/)
    .map(part => {
        if (part === "-" || part === "'") return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");

/* =========================================================
   NORMALIZE NIGERIAN PHONE TO LOCAL FORMAT
========================================================= */

const normalizePhone = value => {
    const phone = value.replace(/[\s\-()]/g, "");

    // Already in local Nigerian format: 07012345678
    if (/^0[789]\d{9}$/.test(phone)) {
        return phone;
    }

    // International format: +2347012345678 or 2347012345678
    if (/^\+?234[789]\d{9}$/.test(phone)) {
        return "0" + phone.replace(/^\+?234/, "");
    }

    return null;
};

const uploadToCloudinary = buffer => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        {
            folder: "skillconnect/workers/profile-photos",
            resource_type: "image",
            format: "jpg"
        },
        (error, result) => {
            if (error) return reject(error);
            resolve(result);
        }
    );

    stream.end(buffer);
});

/* =========================================================
   CREATE WORKER PROFILE
========================================================= */

const createWorkerProfile = async (req, res) => {
    let uploadedPublicId = null;
    let profileSaved = false;

    try {
        const {
            email,
            fullName,
            phone,
            country,
            state,
            city,
            lga
        } = req.body || {};

        /* VALIDATE EMAIL */

        if (typeof email !== "string" || !email.trim()) {
            return sendError(
                res, 400, "EMAIL_REQUIRED",
                "Worker email is required."
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const worker = await Worker.findOne({
            email: normalizedEmail
        });

        if (!worker) {
            return sendError(
                res, 404, "WORKER_NOT_FOUND",
                "Worker account could not be found."
            );
        }

        if (worker.emailVerified !== true) {
            return sendError(
                res, 403, "EMAIL_NOT_VERIFIED",
                "Please verify your email address before completing your profile."
            );
        }

        /* VALIDATE PHOTO */

        if (!req.file || !req.file.buffer) {
            return sendError(
                res, 400, "PROFILE_PHOTO_REQUIRED",
                "Profile photo is required."
            );
        }

        if (
            !Number.isFinite(req.file.size) ||
            req.file.size > MAX_UPLOAD_SIZE
        ) {
            return sendError(
                res, 413, "PROFILE_PHOTO_TOO_LARGE",
                "Profile photo must not exceed 10 MB."
            );
        }

        if (!ALLOWED_IMAGE_TYPES[req.file.mimetype]) {
            return sendError(
                res, 400, "INVALID_PROFILE_PHOTO",
                "Profile photo must be a JPG, PNG, or WebP image."
            );
        }

        /* VALIDATE ACTUAL IMAGE CONTENTS */

        let imageMetadata;

        try {
            imageMetadata = await sharp(req.file.buffer).metadata();
        } catch {
            return sendError(
                res, 400, "INVALID_PROFILE_PHOTO",
                "The uploaded file is not a valid image."
            );
        }

        if (
            !imageMetadata.format ||
            imageMetadata.format !== ALLOWED_IMAGE_TYPES[req.file.mimetype]
        ) {
            return sendError(
                res, 400, "INVALID_PROFILE_PHOTO",
                "The image contents do not match the uploaded file type."
            );
        }

        /* VALIDATE FULL NAME */

        const cleanName = typeof fullName === "string"
            ? fullName.trim().replace(/\s+/g, " ")
            : "";

        const nameParts = cleanName.split(" ");
        const namePattern = /^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

        if (
            nameParts.length !== 2 ||
            !namePattern.test(nameParts[0]) ||
            !namePattern.test(nameParts[1])
        ) {
            return sendError(
                res, 400, "INVALID_FULL_NAME",
                "Please enter exactly two names with a space between them, for example: Destiny Okpone."
            );
        }

        const normalizedFullName = nameParts
            .map(normalizeNamePart)
            .join(" ");

        /* VALIDATE PHONE */

        if (typeof phone !== "string" || !phone.trim()) {
            return sendError(
                res, 400, "PHONE_REQUIRED",
                "Phone number is required."
            );
        }

        const normalizedPhone = normalizePhone(phone.trim());

        if (!normalizedPhone) {
            return sendError(
                res, 400, "INVALID_PHONE",
                "Please provide a valid Nigerian phone number."
            );
        }

        /* VALIDATE LOCATION FIELDS */

        const cleanCountry = typeof country === "string"
            ? country.trim()
            : "";

        const cleanState = typeof state === "string"
            ? state.trim()
            : "";

        const cleanCity = typeof city === "string"
            ? city.trim()
            : "";

        const cleanLga = typeof lga === "string"
            ? lga.trim()
            : "";

        if (!cleanCountry) {
            return sendError(
                res, 400, "COUNTRY_REQUIRED",
                "Country is required."
            );
        }

        if (cleanCountry.toLowerCase() !== "nigeria") {
            return sendError(
                res, 400, "INVALID_COUNTRY",
                "Country must be Nigeria."
            );
        }

        if (!cleanState) {
            return sendError(
                res, 400, "STATE_REQUIRED",
                "State is required."
            );
        }

        if (!cleanCity) {
            return sendError(
                res, 400, "CITY_REQUIRED",
                "City is required."
            );
        }

        if (!cleanLga) {
            return sendError(
                res, 400, "LGA_REQUIRED",
                "Local Government Area is required."
            );
        }

        /* CHECK DUPLICATE PHONE */

        const existingPhoneWorker = await Worker.findOne({
            phone: normalizedPhone,
            _id: { $ne: worker._id }
        }).select("_id");

        if (existingPhoneWorker) {
            return sendError(
                res, 409, "PHONE_ALREADY_EXISTS",
                "This phone number is already registered to another worker."
            );
        }

        /* RESIZE AND COMPRESS PHOTO */

        const compressImage = quality => sharp(req.file.buffer)
            .rotate()
            .resize({
                width: 1920,
                height: 1920,
                fit: "inside",
                withoutEnlargement: true
            })
            .jpeg({
                quality,
                mozjpeg: true
            })
            .toBuffer();

        let compressedImageBuffer = await compressImage(80);

        if (compressedImageBuffer.length > MAX_COMPRESSED_SIZE) {
            compressedImageBuffer = await compressImage(65);
        }

        if (compressedImageBuffer.length > MAX_COMPRESSED_SIZE) {
            return sendError(
                res, 400, "PROFILE_PHOTO_TOO_LARGE",
                "Unable to compress the profile photo to 5 MB or less. Please select a smaller image."
            );
        }

        /* UPLOAD PHOTO */

        const uploadedImage = await uploadToCloudinary(
            compressedImageBuffer
        );

        if (!uploadedImage || !uploadedImage.public_id) {
            throw new Error("Cloudinary did not return an image public ID.");
        }

        uploadedPublicId = uploadedImage.public_id;

        /* SAVE PROFILE */

        worker.fullName = normalizedFullName;
        worker.profilePhoto = uploadedPublicId;
        worker.phone = normalizedPhone;
        worker.country = "Nigeria";
        worker.state = cleanState;
        worker.city = cleanCity;
        worker.lga = cleanLga;
        worker.profileCompleted = true;

        /* GENERATE AND SAVE TOKENS */

        const accessToken = generateAccessToken({
            userId: worker._id.toString(),
            userType: "worker"
        });

        const refreshToken = generateRefreshToken({
            userId: worker._id.toString(),
            userType: "worker"
        });

        worker.refreshTokenHash = hashRefreshToken(refreshToken);

        await worker.save();
        profileSaved = true;

        /* SET AUTHENTICATION COOKIES */

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
            path: "/"
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/"
        });

        return res.status(200).json({
            success: true,
            code: "PROFILE_COMPLETED",
            message: "Your worker profile has been completed successfully."
        });

    } catch (error) {
        /* DO NOT DELETE A PHOTO AFTER THE PROFILE WAS SAVED */

        if (uploadedPublicId && !profileSaved) {
            try {
                await cloudinary.uploader.destroy(
                    uploadedPublicId,
                    { resource_type: "image" }
                );
            } catch (cleanupError) {
                console.error("Cloudinary cleanup failed:", cleanupError);
            }
        }

        if (error.code === 11000) {
            return sendError(
                res, 409, "DUPLICATE_VALUE",
                "Some of the information provided is already registered."
            );
        }

        if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];

            return sendError(
                res, 400, "VALIDATION_ERROR",
                firstError?.message ||
                    "The profile information provided is invalid."
            );
        }

        if (error.http_code || error.name === "Error") {
            console.error("Create worker profile operation failed:", error);
        } else {
            console.error("Create worker profile error:", error);
        }

        return sendError(
            res, 500, "SERVER_ERROR",
            "Unable to complete your worker profile at this time."
        );
    }
};

module.exports = {
    createWorkerProfile
};