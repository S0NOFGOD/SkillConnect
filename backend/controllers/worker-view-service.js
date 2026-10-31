"use strict";

const sharp = require("sharp");
const multer = require("multer");
const Worker = require("../models/worker");
const { authenticateWorker } = require("./worker-authentication");
const { v2: cloudinary } = require("cloudinary");

/* =========================================================
   CLOUDINARY CONFIGURATION
========================================================= */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_OPTIMIZED_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 3;
const MAX_WORDS = 150;

const SKILLS = [
    "Swimming Instructor", "Barber", "Hairdresser", "Makeup Artist",
    "Tailor", "Fashion Designer", "Plumber", "Electrician", "Painter",
    "Welder", "Carpenter", "Bricklayer", "Cleaner", "Laundry Service",
    "Mechanic", "Auto Electrician", "Phone Repair", "Computer Repair",
    "Graphic Designer", "Web Developer", "Photographer", "Videographer",
    "Caterer", "Baker", "Cook", "Event Planner", "Interior Decorator",
    "AC Technician", "Generator Repair", "POP Installer", "Tiler",
    "Furniture Maker", "Driver", "Tutor", "Fitness Trainer", "Other"
];

const EXPERIENCES = [
    "Less than 1 year", "1 year", "2 years",
    "3 years", "4 years", "5 years+"
];

/* =========================================================
   MULTER CONFIGURATION
========================================================= */

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: MAX_UPLOAD_SIZE,
        files: MAX_IMAGES
    },

    fileFilter: (req, file, callback) => {
        if (
            !["image/jpeg", "image/png", "image/webp"]
                .includes(file.mimetype)
        ) {
            return callback(
                new Error(
                    "Portfolio images must be JPG, PNG, or WebP."
                )
            );
        }

        callback(null, true);
    }
});

/* =========================================================
   AUTHENTICATION
========================================================= */

function authenticate(req, res) {
    const auth = authenticateWorker(req);

    if (!auth.valid) {
        res.status(auth.status || 401).json({
            success: false,
            message: auth.message ||
                "Authentication required. Please log in again."
        });

        return null;
    }

    return auth.userId;
}

/* =========================================================
   FIND WORKER AND SERVICE
========================================================= */

async function findWorkerAndService(workerId, serviceId, res) {
    if (!serviceId || !String(serviceId).trim()) {
        res.status(400).json({
            success: false,
            message: "A valid service ID is required."
        });

        return null;
    }

    const worker = await Worker.findById(workerId);

    if (!worker) {
        res.status(404).json({
            success: false,
            message: "Worker account could not be found."
        });

        return null;
    }

    const service = worker.services.find(
        item => String(item.id) === String(serviceId)
    );

    if (!service) {
        res.status(404).json({
            success: false,
            message: "Service not found."
        });

        return null;
    }

    return { worker, service };
}

/* =========================================================
   CLOUDINARY IMAGE URL
========================================================= */

function imageUrl(publicId) {
    if (!publicId) return null;

    if (/^https?:\/\//i.test(publicId)) {
        return publicId;
    }

    return cloudinary.url(publicId, {
        resource_type: "image",
        secure: true
    });
}

/* =========================================================
   UPLOAD IMAGE TO CLOUDINARY
========================================================= */

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "skillconnect/workers/services",
                resource_type: "image",
                format: "jpg"
            },

            (error, result) => {
                if (error) return reject(error);

                if (!result || !result.public_id) {
                    return reject(
                        new Error(
                            "Cloudinary did not return an image ID."
                        )
                    );
                }

                resolve(result.public_id);
            }
        );

        stream.end(buffer);
    });
}

/* =========================================================
   DELETE OLD CLOUDINARY IMAGE
========================================================= */

async function deleteCloudinaryImage(publicId) {
    if (
        !publicId ||
        /^https?:\/\//i.test(publicId)
    ) {
        return;
    }

    const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image"
    });

    if (!["ok", "not found"].includes(result.result)) {
        throw new Error(
            `Could not delete Cloudinary image ${publicId}.`
        );
    }
}

/* =========================================================
   OPTIMIZE PORTFOLIO IMAGE
========================================================= */

async function optimizeImage(buffer) {
    const metadata = await sharp(buffer).metadata();

    let width = Math.min(metadata.width || 1600, 1600);
    let quality = 82;

    for (let attempt = 0; attempt < 12; attempt++) {
        const output = await sharp(buffer)
            .rotate()
            .resize({
                width,
                withoutEnlargement: true
            })
            .jpeg({
                quality,
                mozjpeg: true
            })
            .toBuffer();

        if (output.length <= MAX_OPTIMIZED_SIZE) {
            return output;
        }

        if (quality > 45) {
            quality -= 7;
        } else {
            width = Math.max(
                160,
                Math.floor(width * 0.75)
            );
        }
    }

    throw new Error(
        "A portfolio image could not be optimized to 5 MB or less."
    );
}

/* =========================================================
   VALIDATE SERVICE INPUT
========================================================= */

function validateServiceInput(req, res) {
    const serviceId = String(
        req.params.serviceId || ""
    ).trim();

    if (!serviceId) {
        res.status(400).json({
            success: false,
            message: "A valid service ID is required."
        });

        return null;
    }

    if (
        req.body.serviceId &&
        String(req.body.serviceId).trim() !== serviceId
    ) {
        res.status(400).json({
            success: false,
            message: "The service IDs do not match."
        });

        return null;
    }

    const skill = typeof req.body.skill === "string"
        ? req.body.skill.trim()
        : "";

    const experience = typeof req.body.experience === "string"
        ? req.body.experience.trim()
        : "";

    const description = typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    if (!SKILLS.includes(skill)) {
        res.status(400).json({
            success: false,
            message: "Please select a valid skill."
        });

        return null;
    }

    if (!EXPERIENCES.includes(experience)) {
        res.status(400).json({
            success: false,
            message: "Please select a valid experience level."
        });

        return null;
    }

    if (!description) {
        res.status(400).json({
            success: false,
            message: "Please enter a service description."
        });

        return null;
    }

    if (description.split(/\s+/).length > MAX_WORDS) {
        res.status(400).json({
            success: false,
            message:
                "The service description cannot exceed 150 words."
        });

        return null;
    }

    return {
        serviceId,
        skill,
        experience,
        description
    };
}

/* =========================================================
   VALIDATE PORTFOLIO SLOTS
========================================================= */

function validatePortfolioSlots(files, indexes, res) {
    if (typeof indexes === "string") {
        indexes = [indexes];
    }

    if (!Array.isArray(indexes) || indexes.length !== files.length) {
        if (files.length === 0 && !indexes) {
            return [];
        }

        res.status(400).json({
            success: false,
            message: "Portfolio image information is invalid."
        });

        return null;
    }

    const slots = files.map((file, index) => ({
        file,
        slot: Number(indexes[index])
    }));

    if (
        slots.some(({ slot }) =>
            !Number.isInteger(slot) ||
            slot < 0 ||
            slot >= MAX_IMAGES
        ) ||
        new Set(slots.map(item => item.slot)).size !== slots.length
    ) {
        res.status(400).json({
            success: false,
            message:
                "Portfolio image slots are invalid or duplicated."
        });

        return null;
    }

    return slots;
}

/* =========================================================
   HANDLE UPLOAD ERRORS
========================================================= */

function handleUploadError(error, res) {
    const message =
        error.code === "LIMIT_FILE_SIZE"
            ? "Each portfolio image must not exceed 10 MB."
            : error.code === "LIMIT_FILE_COUNT"
                ? "You can upload a maximum of 3 portfolio images."
                : error.message || "Portfolio upload failed.";

    return res.status(400).json({
        success: false,
        message
    });
}

/* =========================================================
   GET WORKER SERVICE
========================================================= */

async function getWorkerService(req, res) {
    try {
        // Authenticate accessToken.

        const workerId = authenticate(req, res);

        if (!workerId) return;

        // Find service using serviceId.

        const found = await findWorkerAndService(
            workerId,
            req.params.serviceId,
            res
        );

        if (!found) return;

        const { service } = found;

        // Retrieve reviews and sort newest first.

        const allReviews = (service.ratingAndReview || [])
            .slice()
            .sort((a, b) =>
                new Date(b.date || 0).getTime() -
                new Date(a.date || 0).getTime()
            );

        // Retrieve only the three newest reviews.

        const latestReviews = allReviews
            .slice(0, 3)
            .map(review => ({
                fullName: review.fullName,
                rating: review.rating,
                review: review.review,
                date: review.date
            }));

        // Retrieve portfolio image URLs.

        const portfolios = (service.portfolios || [])
            .map(imageUrl)
            .filter(Boolean);

        // Return service details.

        return res.status(200).json({
            success: true,

            service: {
                id: service.id,
                adminApproval: service.adminApproval,
                adminResponse: service.adminResponse,
                skill: service.skill,
                experience: service.experience,
                description: service.description,
                portfolios,
                ratingAndReview: latestReviews
            }
        });

    } catch (error) {
        console.error("Get worker service error:", error);

        return res.status(500).json({
            success: false,
            message:
                "An error occurred while loading your service."
        });
    }
}

/* =========================================================
   UPDATE SERVICE - AUTHENTICATION
========================================================= */

async function updateWorkerService(req, res) {
    try {
        // Authenticate accessToken.

        const workerId = authenticate(req, res);

        if (!workerId) return;

        // Process portfolio uploads.

        processUpdateUpload(req, res, workerId);

    } catch (error) {
        console.error(
            "Prepare worker service update error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "An error occurred while preparing your service update."
        });
    }
}

/* =========================================================
   PROCESS PORTFOLIO UPLOAD
========================================================= */

function processUpdateUpload(req, res, workerId) {
    upload.array("portfolioPhotos", MAX_IMAGES)(
        req,
        res,
        error => {
            if (error) {
                return handleUploadError(error, res);
            }

            updateWorkerServiceData(req, res, workerId);
        }
    );
}

/* =========================================================
   UPDATE SERVICE DATA
========================================================= */

async function updateWorkerServiceData(req, res, workerId) {
    const newlyUploadedIds = [];

    try {
        // Validate service information.

        const input = validateServiceInput(req, res);

        if (!input) return;

        const {
            serviceId,
            skill,
            experience,
            description
        } = input;

        // Validate portfolio information.

        const files = req.files || [];

        const slots = validatePortfolioSlots(
            files,
            req.body.portfolioIndexes,
            res
        );

        if (!slots) return;

        // Optimize uploaded images before Cloudinary upload.

        const optimizedImages = [];

        for (const { file, slot } of slots) {
            if (!Buffer.isBuffer(file.buffer)) {
                throw new Error(
                    "A portfolio image could not be processed."
                );
            }

            const optimized = await optimizeImage(file.buffer);

            optimizedImages.push({
                buffer: optimized,
                slot
            });
        }

        // Find worker and service by serviceId.

        const found = await findWorkerAndService(
            workerId,
            serviceId,
            res
        );

        if (!found) return;

        const { worker, service } = found;

        // Prevent duplicate skills across services.

        const duplicate = worker.services.some(item =>
            String(item.id) !== serviceId &&
            String(item.skill || "").trim().toLowerCase() ===
                skill.toLowerCase()
        );

        if (duplicate) {
            return res.status(400).json({
                success: false,
                message:
                    "You have already added a service with this skill."
            });
        }

        // Retrieve existing Cloudinary public IDs.

        const oldPortfolios = [...(service.portfolios || [])];

        const newPortfolios = [...oldPortfolios];

        const replacedIds = [];

        // Upload replacement images to Cloudinary.

        for (const { buffer, slot } of optimizedImages) {
            const publicId = await uploadToCloudinary(buffer);

            newlyUploadedIds.push(publicId);

            if (
                oldPortfolios[slot] &&
                oldPortfolios[slot] !== publicId
            ) {
                replacedIds.push(oldPortfolios[slot]);
            }

            newPortfolios[slot] = publicId;
        }

        // Update service details.

        service.skill = skill;
        service.experience = experience;
        service.description = description;

        service.portfolios = newPortfolios.filter(Boolean);

        service.adminApproval = "Under Review";

        service.adminResponse =
            "It may take up to 24 hours for admin update";

        // Save updated service.

        await worker.save();

        // Database now references the newly uploaded images.

        newlyUploadedIds.length = 0;

        // Delete replaced Cloudinary images.

        for (const publicId of replacedIds) {
            try {
                await deleteCloudinaryImage(publicId);

            } catch (error) {
                console.error(
                    "Old portfolio cleanup failed:",
                    publicId,
                    error.message
                );
            }
        }

        // Return success response.

        return res.status(200).json({
            success: true,
            message: "Service updated successfully."
        });

    } catch (error) {
        // Clean up newly uploaded images if update fails.

        await Promise.all(
            newlyUploadedIds.map(async publicId => {
                try {
                    await deleteCloudinaryImage(publicId);

                } catch (cleanupError) {
                    console.error(
                        "New portfolio cleanup failed:",
                        publicId,
                        cleanupError.message
                    );
                }
            })
        );

        console.error("Update worker service error:", error);

        return res.status(500).json({
            success: false,
            message:
                "An error occurred while updating your service."
        });
    }
}

/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
    getWorkerService,
    updateWorkerService
};