"use strict";

const Worker = require("../models/worker");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const multer = require("multer");
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

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
    fileFilter(req, file, callback) {
        if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
            const error = new Error(
                "Profile photo must be a JPG, PNG, or WebP image."
            );
            error.code = "INVALID_PROFILE_PHOTO";
            return callback(error);
        }
        callback(null, true);
    }
});

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

const hashRefreshToken = token =>
    crypto.createHash("sha256").update(token).digest("hex");

const sendError = (res, status, code, message) =>
    res.status(status).json({ success: false, code, message });

const normalizeNamePart = name => name
    .toLowerCase()
    .split(/([-'])/)
    .map(part => ["-", "'"].includes(part)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");

const normalizePhone = value => {
    const phone = value.replace(/[\s\-()]/g, "");

    if (/^0[789]\d{9}$/.test(phone)) return phone;

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
        (error, result) => error ? reject(error) : resolve(result)
    );

    stream.end(buffer);
});

const handleCreateWorkerProfile = async (req, res) => {
    let uploadedPublicId = null;
    let profileSaved = false;

    try {
        const { email, fullName, phone, latitude, longitude } = req.body || {};

        // Validate email
        if (typeof email !== "string" || !email.trim()) {
            return sendError(res, 400, "EMAIL_REQUIRED", "Worker email is required.");
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return sendError(res, 400, "INVALID_EMAIL", "Please provide a valid email address.");
        }

        // Validate profile photo
        if (!req.file?.buffer) {
            return sendError(res, 400, "PROFILE_PHOTO_REQUIRED", "Profile photo is required.");
        }

        if (!Number.isFinite(req.file.size) || req.file.size > MAX_UPLOAD_SIZE) {
            return sendError(res, 413, "PROFILE_PHOTO_TOO_LARGE", "Profile photo must not exceed 10 MB.");
        }

        const expectedFormat = ALLOWED_IMAGE_TYPES[req.file.mimetype];

        if (!expectedFormat) {
            return sendError(res, 400, "INVALID_PROFILE_PHOTO", "Profile photo must be a JPG, PNG, or WebP image.");
        }

        // Validate actual image contents
        let imageMetadata;

        try {
            imageMetadata = await sharp(req.file.buffer).metadata();
        } catch {
            return sendError(res, 400, "INVALID_PROFILE_PHOTO", "The uploaded file is not a valid image.");
        }

        if (imageMetadata.format !== expectedFormat) {
            return sendError(res, 400, "INVALID_PROFILE_PHOTO", "The image contents do not match the uploaded file type.");
        }

        // Validate full name
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

        const normalizedFullName = nameParts.map(normalizeNamePart).join(" ");

        // Validate phone
        if (typeof phone !== "string" || !phone.trim()) {
            return sendError(res, 400, "PHONE_REQUIRED", "Phone number is required.");
        }

        const normalizedPhone = normalizePhone(phone.trim());

        if (!normalizedPhone) {
            return sendError(res, 400, "INVALID_PHONE", "Please provide a valid Nigerian phone number.");
        }

        // Validate coordinates
        if (latitude === undefined || latitude === null || String(latitude).trim() === "") {
            return sendError(res, 400, "LATITUDE_REQUIRED", "Latitude is required.");
        }

        const cleanLatitude = Number(latitude);

        if (!Number.isFinite(cleanLatitude) || cleanLatitude < -90 || cleanLatitude > 90) {
            return sendError(res, 400, "INVALID_LATITUDE", "Please provide a valid latitude.");
        }

        if (longitude === undefined || longitude === null || String(longitude).trim() === "") {
            return sendError(res, 400, "LONGITUDE_REQUIRED", "Longitude is required.");
        }

        const cleanLongitude = Number(longitude);

        if (!Number.isFinite(cleanLongitude) || cleanLongitude < -180 || cleanLongitude > 180) {
            return sendError(res, 400, "INVALID_LONGITUDE", "Please provide a valid longitude.");
        }

        // Find worker
        const worker = await Worker.findOne({ email: normalizedEmail });

        if (!worker) {
            return sendError(res, 404, "WORKER_NOT_FOUND", "Worker account could not be found.");
        }

        // Check email verification
        if (worker.emailVerified !== true) {
            return sendError(
                res, 403, "EMAIL_NOT_VERIFIED",
                "Please verify your email address before completing your profile."
            );
        }

        // Check duplicate phone
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

        // Compress profile photo
        const compressImage = quality => sharp(req.file.buffer)
            .rotate()
            .resize({
                width: 1920,
                height: 1920,
                fit: "inside",
                withoutEnlargement: true
            })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();

        let compressedImageBuffer = await compressImage(80);

        if (compressedImageBuffer.length > MAX_COMPRESSED_SIZE) {
            compressedImageBuffer = await compressImage(65);
        }

        if (compressedImageBuffer.length > MAX_COMPRESSED_SIZE) {
            return sendError(
                res, 400, "PROFILE_PHOTO_COMPRESSION_FAILED",
                "Unable to compress the profile photo to 5 MB or less. Please select a smaller image."
            );
        }

        // Upload to Cloudinary
        const uploadedImage = await uploadToCloudinary(compressedImageBuffer);

        if (!uploadedImage?.public_id) {
            throw new Error("Cloudinary did not return an image public ID.");
        }

        uploadedPublicId = uploadedImage.public_id;

        // Save worker profile
        worker.profilePhoto = uploadedPublicId;
        worker.fullName = normalizedFullName;
        worker.phone = normalizedPhone;
        worker.latitude = cleanLatitude;
        worker.longitude = cleanLongitude;
        worker.profileCompleted = true;

        const tokenPayload = {
            userId: worker._id.toString(),
            userType: "worker"
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        worker.refreshTokenHash = hashRefreshToken(refreshToken);

        await worker.save();
        profileSaved = true;

        // Set authentication cookies
        const isProduction = process.env.NODE_ENV === "production";

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/"
        };

        res.cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            code: "PROFILE_COMPLETED",
            message: "Your worker profile has been completed successfully."
        });

    } catch (error) {
        // Clean up uploaded photo if profile was not saved
        if (uploadedPublicId && !profileSaved) {
            try {
                await cloudinary.uploader.destroy(uploadedPublicId, {
                    resource_type: "image"
                });
            } catch (cleanupError) {
                console.error("Cloudinary cleanup failed:", cleanupError);
            }
        }

        if (error.code === 11000) {
            return sendError(res, 409, "DUPLICATE_VALUE", "Some of the information provided is already registered.");
        }

        if (error.name === "ValidationError") {
            const firstError = Object.values(error.errors)[0];

            return sendError(
                res, 400, "VALIDATION_ERROR",
                firstError?.message || "The profile information provided is invalid."
            );
        }

        console.error("Create worker profile error:", error);

        return sendError(
            res, 500, "SERVER_ERROR",
            "Unable to complete your worker profile at this time."
        );
    }
};

const createWorkerProfile = (req, res) => {
    upload.single("profilePhoto")(req, res, error => {
        if (error) {
            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return sendError(res, 413, "PROFILE_PHOTO_TOO_LARGE", "Profile photo must not exceed 10 MB.");
                }

                if (error.code === "LIMIT_FILE_COUNT") {
                    return sendError(res, 400, "INVALID_PROFILE_PHOTO", "Only one profile photo is allowed.");
                }

                return sendError(res, 400, "PROFILE_PHOTO_UPLOAD_ERROR", "Unable to process the uploaded profile photo.");
            }

            if (error.code === "INVALID_PROFILE_PHOTO") {
                return sendError(res, 400, "INVALID_PROFILE_PHOTO", error.message);
            }

            console.error("Profile photo upload error:", error);

            return sendError(res, 500, "UPLOAD_ERROR", "Unable to process your profile photo.");
        }

        return handleCreateWorkerProfile(req, res);
    });
};

module.exports = { createWorkerProfile };