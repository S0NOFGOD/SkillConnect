"use strict";

/* =========================================================
   1. IMPORTS
========================================================= */

const { Readable } = require("stream");
const sharp = require("sharp");
const Worker = require("../models/worker");
const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");

const { authenticateWorker } = require("./worker-authentication");


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
    "Swimming Instructor", "Barber", "Hairdresser",
    "Makeup Artist", "Tailor", "Bricklayer", "Plumber",
    "Electrician", "Painter", "Welder", "Carpenter",
    "Cleaner", "Laundry Service", "Mechanic",
    "Auto Electrician", "Phone Repair", "Computer Repair",
    "Graphic Designer", "Web Developer", "Photographer",
    "Videographer", "Caterer", "Baker", "Cook",
    "Event Planner", "Interior Decorator", "AC Technician",
    "Generator Repair", "POP Installer", "Tiler",
    "Furniture Maker", "Driver", "Tutor",
    "Fitness Trainer", "Other"
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
   4. RESPONSE HELPERS
========================================================= */

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

function portfolioProcessingMessage(numbers) {
    if (numbers.length === 3) {
        return "Unable to process all 3 portfolios. Please upload 3 different images and try again.";
    }

    const names = numbers.map(number => `portfolio ${number}`);

    const portfolioNames = names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

    return `Unable to process ${portfolioNames}. Please upload different image(s) and try again.`;
}

function countWords(text) {
    return text && text.trim()
        ? text.trim().split(/\s+/).length
        : 0;
}


/* =========================================================
   5. IMAGE VALIDATION
========================================================= */

function validatePortfolioFiles(files) {
    if (!Array.isArray(files) || files.length !== MAX_PORTFOLIO_IMAGES) {
        return {
            valid: false,
            message: "Please upload exactly 3 portfolio images."
        };
    }

    for (let index = 0; index < files.length; index++) {
        const file = files[index];

        if (!file || !Buffer.isBuffer(file.buffer)) {
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
   6. OPTIMIZE PORTFOLIO IMAGES
========================================================= */

async function convertAndCompressImage(fileBuffer) {
    const metadata = await sharp(fileBuffer, {
        limitInputPixels: 40000000
    }).metadata();

    if (
        !metadata.width ||
        !metadata.height ||
        !ALLOWED_IMAGE_FORMATS.has(metadata.format)
    ) {
        throw new Error("Invalid portfolio image.");
    }

    const resizeScale = Math.min(
        MAX_IMAGE_DIMENSION / metadata.width,
        MAX_IMAGE_DIMENSION / metadata.height,
        1
    );

    let width = Math.max(1, Math.floor(metadata.width * resizeScale));
    let height = Math.max(1, Math.floor(metadata.height * resizeScale));
    let quality = 80;

    for (let attempt = 0; attempt < MAX_COMPRESSION_ATTEMPTS; attempt++) {
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

        if (width < 1 || height < 1) break;
    }

    throw new Error("Portfolio compression failed.");
}


/* =========================================================
   7. CLOUDINARY UPLOAD
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
                if (error) return reject(error);

                if (!result || !result.public_id) {
                    return reject(new Error("Cloudinary upload failed."));
                }

                resolve({ public_id: result.public_id });
            }
        );

        Readable.from(fileBuffer).pipe(uploadStream);
    });
}


/* =========================================================
   8. CLEAN UP FAILED UPLOADS
========================================================= */

async function deleteCloudinaryImages(publicIds) {
    if (!Array.isArray(publicIds) || !publicIds.length) return;

    for (const publicId of publicIds) {
        try {
            await cloudinary.uploader.destroy(publicId, {
                resource_type: "image"
            });
        } catch (error) {
            console.error("Cloudinary cleanup failed:", error);
        }
    }
}


/* =========================================================
   9. CREATE SERVICE
========================================================= */

async function createWorkerService(req, res) {
    const uploadedPublicIds = [];

    try {

        /* A. AUTHENTICATION */

        const authentication = authenticateWorker(req);

        if (!authentication.valid || !authentication.userId) {
            return sendError(
                res,
                401,
                authentication.message ||
                    "Authentication required. Please log in again."
            );
        }

        const workerId = authentication.userId;


        /* B. PARSE PORTFOLIO IMAGES */

        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: MAX_PORTFOLIO_IMAGE_SIZE,
                files: MAX_PORTFOLIO_IMAGES
            }
        }).array("portfolioPhotos", MAX_PORTFOLIO_IMAGES);

        await new Promise((resolve, reject) => {
            upload(req, res, error => {
                if (error) return reject(error);
                resolve();
            });
        });


        /* C. FIND WORKER */

        const worker = await Worker.findById(workerId);

        if (!worker) {
            return sendError(
                res,
                404,
                "Worker account could not be found."
            );
        }


        /* D. VALIDATE PORTFOLIO FILES */

        const portfolioFiles = Array.isArray(req.files)
            ? req.files
            : [];

        const portfolioResult = validatePortfolioFiles(portfolioFiles);

        if (!portfolioResult.valid) {
            return sendError(res, 400, portfolioResult.message);
        }


        /* E. VALIDATE SKILL */

        const skill = typeof req.body.skill === "string"
            ? req.body.skill.trim()
            : "";

        if (!skill) {
            return sendError(res, 400, "Please select your skill.");
        }

        if (!LOCAL_SKILLS.includes(skill)) {
            return sendError(res, 400, "The selected skill is not valid.");
        }


        /* F. VALIDATE EXPERIENCE */

        const experience = typeof req.body.experience === "string"
            ? req.body.experience.trim()
            : "";

        if (!experience) {
            return sendError(res, 400, "Please select your experience.");
        }

        if (!EXPERIENCE_OPTIONS.includes(experience)) {
            return sendError(res, 400, "The selected experience is not valid.");
        }


        /* G. VALIDATE DESCRIPTION */

        const description = typeof req.body.description === "string"
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


        /* H. VERIFY ACTUAL IMAGE CONTENT */

        const invalidPortfolios = [];

        for (let index = 0; index < portfolioFiles.length; index++) {
            try {
                const metadata = await sharp(portfolioFiles[index].buffer, {
                    limitInputPixels: 40000000
                }).metadata();

                if (
                    !metadata.width ||
                    !metadata.height ||
                    !ALLOWED_IMAGE_FORMATS.has(metadata.format)
                ) {
                    invalidPortfolios.push(index + 1);
                }

            } catch (error) {
                invalidPortfolios.push(index + 1);
            }
        }

        if (invalidPortfolios.length) {
            return sendError(
                res,
                400,
                portfolioProcessingMessage(invalidPortfolios)
            );
        }


        /* I. CHECK PROFILE VERIFICATION */

        const profileVerificationExpires =
            worker.profileVerificationExpires;

        if (
            !profileVerificationExpires ||
            !Number.isFinite(new Date(profileVerificationExpires).getTime()) ||
            new Date(profileVerificationExpires).getTime() <= Date.now()
        ) {
            return sendError(
                res,
                403,
                "Please verify your profile and try again."
            );
        }


        /* J. CHECK DUPLICATE SERVICE */

        const skillAlreadyExists =
            Array.isArray(worker.services) &&
            worker.services.some(service =>
                typeof service.skill === "string" &&
                service.skill.trim().toLowerCase() === skill.toLowerCase()
            );

        if (skillAlreadyExists) {
            return sendError(
                res,
                400,
                `You already have a service for ${skill}.`
            );
        }


        /* K. GENERATE SERVICE ID */

        let nextServiceId = 1;

        if (Array.isArray(worker.services) && worker.services.length) {
            const highestServiceId = worker.services.reduce(
                (highest, service) => {
                    const id = Number(service.id);
                    return Number.isFinite(id) && id > highest ? id : highest;
                },
                0
            );

            nextServiceId = highestServiceId + 1;
        }


        /* L. COMPRESS AND UPLOAD PORTFOLIOS */

        const portfolioPublicIds = [];

        for (let index = 0; index < portfolioFiles.length; index++) {
            let compressedImage;

            try {
                compressedImage = await convertAndCompressImage(
                    portfolioFiles[index].buffer
                );
            } catch (error) {
                error.portfolioProcessingNumber = index + 1;
                throw error;
            }

            let uploadedImage;

            try {
                uploadedImage = await uploadImageToCloudinary(
                    compressedImage,
                    worker._id.toString()
                );
            } catch (error) {
                error.portfolioUploadNumber = index + 1;
                throw error;
            }

            portfolioPublicIds.push(uploadedImage.public_id);
            uploadedPublicIds.push(uploadedImage.public_id);
        }


        /* M. PREPARE SERVICE DATA */

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
            adminApproval: "Under Review",
            adminResponse: "It may take up to 24 hours for admin update"
        };


        /* N. SAVE SERVICE AND WORKER SKILL */

        worker.services.push(newService);

        if (!Array.isArray(worker.skills)) {
            worker.skills = [];
        }

        const hasSkill = worker.skills.some(existingSkill =>
            typeof existingSkill === "string" &&
            existingSkill.trim().toLowerCase() === skill.toLowerCase()
        );

        if (!hasSkill) {
            worker.skills.push(skill);
        }

        await worker.save();


        /* O. SUCCESS RESPONSE */

        return res.status(201).json({
            success: true,
            message: "Your service has been added successfully."
        });

    } catch (error) {

        await deleteCloudinaryImages(uploadedPublicIds);


        /* PORTFOLIO PROCESSING ERROR */

        if (error.portfolioProcessingNumber) {
            return sendError(
                res,
                400,
                portfolioProcessingMessage([
                    error.portfolioProcessingNumber
                ])
            );
        }


        /* CLOUDINARY UPLOAD ERROR */

        if (error.portfolioUploadNumber) {
            return sendError(
                res,
                503,
                `Unable to upload portfolio ${error.portfolioUploadNumber}. Please try again.`
            );
        }


        /* MULTER ERRORS */

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


        /* GENERAL ERROR */

        console.error("Create worker service error:", error);

        return sendError(
            res,
            500,
            "An error occurred while creating your service. Please try again."
        );
    }
}


/* =========================================================
   10. EXPORT
========================================================= */

module.exports = {
    createWorkerService
};