"use strict";

/* =========================================================
   1. IMPORTS
========================================================= */

const { Readable } = require("stream");
const sharp = require("sharp");
const Worker = require("../models/worker");
const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");

const {
    authenticateWorker
} = require("./worker-authentication");


/* =========================================================
   2. CLOUDINARY CONFIGURATION
========================================================= */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


/* =========================================================
   3. LIMITS AND ALLOWED VALUES
========================================================= */

const MAX_PORTFOLIO_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_COMPRESSED_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PORTFOLIO_IMAGES = 3;
const MAX_DESCRIPTION_WORDS = 150;
const MAX_IMAGE_DIMENSION = 1600;
const MAX_COMPRESSION_ATTEMPTS = 20;

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

const ALLOWED_IMAGE_FORMATS = new Set([
    "jpeg",
    "png",
    "webp"
]);

const LOCAL_SKILLS = [
    "Swimming Instructor",
    "Barber",
    "Hairdresser",
    "Makeup Artist",
    "Tailor",
    "Bricklayer",
    "Plumber",
    "Electrician",
    "Painter",
    "Welder",
    "Carpenter",
    "Cleaner",
    "Laundry Service",
    "Mechanic",
    "Auto Electrician",
    "Phone Repair",
    "Computer Repair",
    "Graphic Designer",
    "Web Developer",
    "Photographer",
    "Videographer",
    "Caterer",
    "Baker",
    "Cook",
    "Event Planner",
    "Interior Decorator",
    "AC Technician",
    "Generator Repair",
    "POP Installer",
    "Tiler",
    "Furniture Maker",
    "Driver",
    "Tutor",
    "Fitness Trainer",
    "Other"
];

const EXPERIENCE_OPTIONS = [
    "Less than 1 year",
    "1 year",
    "2 years",
    "3 years",
    "4 years",
    "5 years+"
];


/* =========================================================
   4. RESPONSE HELPER
========================================================= */

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}


/* =========================================================
   5. DESCRIPTION VALIDATION
========================================================= */

function countWords(text) {
    if (!text || !text.trim()) {
        return 0;
    }

    return text.trim().split(/\s+/).length;
}


/* =========================================================
   6. IMAGE VALIDATION
========================================================= */

function validatePortfolioFiles(files) {
    if (
        !Array.isArray(files) ||
        files.length !== MAX_PORTFOLIO_IMAGES
    ) {
        return {
            valid: false,
            message: "Please upload exactly 3 portfolio images."
        };
    }

    for (let index = 0; index < files.length; index++) {
        const file = files[index];

        if (
            !file ||
            !file.buffer ||
            !Buffer.isBuffer(file.buffer)
        ) {
            return {
                valid: false,
                message: `Portfolio image ${index + 1} could not be processed.`
            };
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            return {
                valid: false,
                message: `Portfolio image ${index + 1} must be a JPG, PNG, or WebP image.`
            };
        }

        if (file.size > MAX_PORTFOLIO_IMAGE_SIZE) {
            return {
                valid: false,
                message: `Portfolio image ${index + 1} must be 10 MB or smaller.`
            };
        }
    }

    return { valid: true };
}


/* =========================================================
   7. OPTIMIZE PORTFOLIO IMAGES
========================================================= */

async function convertAndCompressImage(fileBuffer) {
    const image = sharp(fileBuffer, {
        limitInputPixels: 40000000
    });

    const metadata = await image.metadata();

    if (
        !metadata.width ||
        !metadata.height ||
        !ALLOWED_IMAGE_FORMATS.has(metadata.format)
    ) {
        throw new Error(
            "Only valid JPG, PNG, and WebP portfolio images are supported."
        );
    }

    const resizeScale = Math.min(
        MAX_IMAGE_DIMENSION / metadata.width,
        MAX_IMAGE_DIMENSION / metadata.height,
        1
    );

    let width = Math.max(
        1,
        Math.floor(metadata.width * resizeScale)
    );

    let height = Math.max(
        1,
        Math.floor(metadata.height * resizeScale)
    );

    let quality = 80;

    for (
        let attempt = 0;
        attempt < MAX_COMPRESSION_ATTEMPTS;
        attempt++
    ) {
        const outputBuffer = await sharp(fileBuffer, {
            limitInputPixels: 40000000,
            sequentialRead: true
        })
            .rotate()
            .resize({
                width,
                height,
                fit: "inside",
                withoutEnlargement: true
            })
            .jpeg({
                quality,
                mozjpeg: true
            })
            .toBuffer();

        if (outputBuffer.length <= MAX_COMPRESSED_IMAGE_SIZE) {
            return outputBuffer;
        }

        if (quality > 30) {
            quality -= 10;
        } else {
            width = Math.floor(width * 0.75);
            height = Math.floor(height * 0.75);
            quality = 80;
        }

        if (width < 1 || height < 1) {
            break;
        }
    }

    throw new Error(
        "Unable to compress a portfolio image to 5 MB or less."
    );
}


/* =========================================================
   8. CLOUDINARY UPLOAD
========================================================= */

function uploadImageToCloudinary(fileBuffer, workerId) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `skillconnect/workers/${workerId}/services`,
                resource_type: "image",
                format: "jpg"
            },

            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!result || !result.public_id) {
                    reject(
                        new Error("Cloudinary did not return a public_id.")
                    );
                    return;
                }

                resolve({
                    public_id: result.public_id
                });
            }
        );

        Readable.from(fileBuffer).pipe(uploadStream);
    });
}


/* =========================================================
   9. CLEAN UP FAILED UPLOADS
========================================================= */

async function deleteCloudinaryImages(publicIds) {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
        return;
    }

    for (const publicId of publicIds) {
        try {
            await cloudinary.uploader.destroy(
                publicId,
                { resource_type: "image" }
            );
        } catch (error) {
            console.error(
                "Cloudinary cleanup failed:",
                error
            );
        }
    }
}


/* =========================================================
   10. CREATE SERVICE
========================================================= */

async function createWorkerService(req, res) {
    const uploadedPublicIds = [];

    try {
        /* -----------------------------------------------
           A. AUTHENTICATE ACCESS TOKEN
        ----------------------------------------------- */

        const authentication = authenticateWorker(req);

        if (!authentication.valid) {
            return sendError(
                res,
                401,
                authentication.message ||
                    "Authentication required. Please log in again."
            );
        }

        const workerId = authentication.userId;

        if (!workerId) {
            return sendError(
                res,
                401,
                "Authentication required. Please log in again."
            );
        }

        /* -----------------------------------------------
           B. PARSE PORTFOLIO IMAGES
        ----------------------------------------------- */

        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: MAX_PORTFOLIO_IMAGE_SIZE,
                files: MAX_PORTFOLIO_IMAGES
            }
        }).array("portfolioPhotos", MAX_PORTFOLIO_IMAGES);

        await new Promise((resolve, reject) => {
            upload(req, res, error => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        const worker = await Worker.findById(workerId);

        if (!worker) {
            return sendError(
                res,
                404,
                "Worker account could not be found."
            );
        }

        /* -----------------------------------------------
           C. VALIDATE PORTFOLIO IMAGES
        ----------------------------------------------- */

        const portfolioFiles = Array.isArray(req.files)
            ? req.files
            : [];

        const portfolioResult =
            validatePortfolioFiles(portfolioFiles);

        if (!portfolioResult.valid) {
            return sendError(
                res,
                400,
                portfolioResult.message
            );
        }

        /* -----------------------------------------------
           D. VALIDATE SKILL
        ----------------------------------------------- */

        const skill = typeof req.body.skill === "string"
            ? req.body.skill.trim()
            : "";

        if (!skill) {
            return sendError(
                res,
                400,
                "Please select your skill."
            );
        }

        if (!LOCAL_SKILLS.includes(skill)) {
            return sendError(
                res,
                400,
                "The selected skill is not valid."
            );
        }

        /* -----------------------------------------------
           E. VALIDATE EXPERIENCE
        ----------------------------------------------- */

        const experience =
            typeof req.body.experience === "string"
                ? req.body.experience.trim()
                : "";

        if (!experience) {
            return sendError(
                res,
                400,
                "Please select your experience."
            );
        }

        if (!EXPERIENCE_OPTIONS.includes(experience)) {
            return sendError(
                res,
                400,
                "The selected experience is not valid."
            );
        }

        /* -----------------------------------------------
           F. VALIDATE DESCRIPTION
        ----------------------------------------------- */

        const description =
            typeof req.body.description === "string"
                ? req.body.description.trim()
                : "";

        if (!description) {
            return sendError(
                res,
                400,
                "Please enter a description for the service."
            );
        }

        if (countWords(description) > MAX_DESCRIPTION_WORDS) {
            return sendError(
                res,
                400,
                "The service description cannot exceed 150 words."
            );
        }

        /* -----------------------------------------------
           G. VERIFY ACTUAL IMAGE CONTENT
        ----------------------------------------------- */

        for (
            let index = 0;
            index < portfolioFiles.length;
            index++
        ) {
            const file = portfolioFiles[index];

            try {
                const metadata = await sharp(file.buffer, {
                    limitInputPixels: 40000000
                }).metadata();

                if (
                    !metadata.width ||
                    !metadata.height ||
                    !ALLOWED_IMAGE_FORMATS.has(metadata.format)
                ) {
                    return sendError(
                        res,
                        400,
                        `Portfolio image ${index + 1} must be a valid JPG, PNG, or WebP image.`
                    );
                }
            } catch (error) {
                return sendError(
                    res,
                    400,
                    `Portfolio image ${index + 1} is invalid or corrupted.`
                );
            }
        }

        /* -----------------------------------------------
           H. CHECK PROFILE VERIFICATION EXPIRY
        ----------------------------------------------- */

        const profileVerificationExpires =
            worker.profileVerificationExpires;

        if (
            !profileVerificationExpires ||
            !Number.isFinite(
                new Date(profileVerificationExpires).getTime()
            ) ||
            new Date(profileVerificationExpires).getTime() <= Date.now()
        ) {
            return sendError(
                res,
                403,
                "Please verify your profile and try again."
            );
        }

        /* -----------------------------------------------
           I. CHECK DUPLICATE SERVICE SKILL
        ----------------------------------------------- */

        const skillAlreadyExists =
            Array.isArray(worker.services) &&
            worker.services.some(service =>
                typeof service.skill === "string" &&
                service.skill.trim().toLowerCase() ===
                    skill.toLowerCase()
            );

        if (skillAlreadyExists) {
            return sendError(
                res,
                400,
                `You already have a service for ${skill}.`
            );
        }

        /* -----------------------------------------------
           J. GENERATE SERVICE ID
        ----------------------------------------------- */

        let nextServiceId = 1;

        if (
            Array.isArray(worker.services) &&
            worker.services.length > 0
        ) {
            const highestServiceId = worker.services.reduce(
                (highest, service) => {
                    const serviceId = Number(service.id);

                    return Number.isFinite(serviceId) &&
                        serviceId > highest
                        ? serviceId
                        : highest;
                },
                0
            );

            nextServiceId = highestServiceId + 1;
        }

        /* -----------------------------------------------
           K. OPTIMIZE AND UPLOAD PORTFOLIOS
        ----------------------------------------------- */

        const portfolioPublicIds = [];

        for (const file of portfolioFiles) {
            const compressedImage =
                await convertAndCompressImage(file.buffer);

            const uploadedImage = await uploadImageToCloudinary(
                compressedImage,
                worker._id.toString()
            );

            portfolioPublicIds.push(uploadedImage.public_id);
            uploadedPublicIds.push(uploadedImage.public_id);
        }

        /* -----------------------------------------------
           L. PREPARE SERVICE DATA
        ----------------------------------------------- */

        const now = new Date();

        const newService = {
            id: nextServiceId,
            skill,
            experience,
            description,
            portfolios: portfolioPublicIds,
            date: now,

            serviceCountDown: new Date(
                now.getTime() + 30 * 24 * 60 * 60 * 1000
            ),

            adminApproval: "in review",

            adminResponse:
                "It may take up to 24 hours for admin update"
        };

        /* -----------------------------------------------
           M. SAVE SERVICE AND WORKER SKILL
        ----------------------------------------------- */

        worker.services.push(newService);

        if (!Array.isArray(worker.skills)) {
            worker.skills = [];
        }

        const hasSkill = worker.skills.some(existingSkill =>
            typeof existingSkill === "string" &&
            existingSkill.trim().toLowerCase() ===
                skill.toLowerCase()
        );

        if (!hasSkill) {
            worker.skills.push(skill);
        }

        await worker.save();

        /* -----------------------------------------------
           N. SUCCESS RESPONSE
        ----------------------------------------------- */

        return res.status(201).json({
            success: true,
            message: "Your service has been added successfully."
        });

    } catch (error) {
        await deleteCloudinaryImages(uploadedPublicIds);

        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return sendError(
                    res,
                    400,
                    "Each portfolio image must be 10 MB or smaller."
                );
            }

            if (
                error.code === "LIMIT_FILE_COUNT" ||
                error.code === "LIMIT_UNEXPECTED_FILE"
            ) {
                return sendError(
                    res,
                    400,
                    "Please upload exactly 3 portfolio images."
                );
            }

            return sendError(
                res,
                400,
                "There was a problem processing your portfolio images."
            );
        }

        console.error(
            "Create worker service error:",
            error
        );

        return sendError(
            res,
            500,
            "An error occurred while creating your service. Please try again."
        );
    }
}


/* =========================================================
   11. EXPORT
========================================================= */

module.exports = {
    createWorkerService
};