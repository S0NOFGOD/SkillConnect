"use strict";

/* =========================================================
   1. IMPORTS
========================================================= */

const express = require("express");
const multer = require("multer");

const {
    authenticateWorker
} = require("../controllers/worker-authentication");

const {
    createWorkerService
} = require("../controllers/worker-create-service");


/* =========================================================
   2. ROUTER
========================================================= */

const router = express.Router();


/* =========================================================
   3. UPLOAD LIMITS
========================================================= */

const MAX_PORTFOLIO_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PORTFOLIO_IMAGES = 3;


/* =========================================================
   4. MULTER CONFIGURATION
========================================================= */

const storage = multer.memoryStorage();

const upload = multer({
    storage,

    limits: {
        fileSize: MAX_PORTFOLIO_IMAGE_SIZE,
        files: MAX_PORTFOLIO_IMAGES
    }
});


/* =========================================================
   5. CREATE SERVICE
========================================================= */

router.post(
    "/create-service",

    /*
       Authenticate the accessToken credential first.
       authenticateWorker must verify the access token,
       not the refresh token.
    */

    (req, res, next) => {
        const authentication = authenticateWorker(req);

        if (!authentication.valid) {
            return res.status(401).json({
                success: false,
                message: authentication.message ||
                    "Authentication required. Please log in again."
            });
        }

        req.workerId = authentication.userId;

        next();
    },

    /*
       Parse multipart/form-data only after authentication.
    */

    (req, res, next) => {
        upload.array(
            "portfolioPhotos",
            MAX_PORTFOLIO_IMAGES
        )(req, res, error => {

            if (error instanceof multer.MulterError) {

                if (error.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        success: false,
                        message: "Each portfolio image must be 10 MB or smaller."
                    });
                }

                if (
                    error.code === "LIMIT_FILE_COUNT" ||
                    error.code === "LIMIT_UNEXPECTED_FILE"
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "You can upload a maximum of 3 portfolio images."
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: "There was a problem processing your portfolio images."
                });
            }

            if (error) {
                console.error("Portfolio upload error:", error);

                return res.status(400).json({
                    success: false,
                    message: "Your portfolio images could not be uploaded. Please try again."
                });
            }

            next();
        });
    },

    /*
       Validate service data, verify the phone-verification
       expiry, optimize the images, and save the service.
    */

    createWorkerService
);


/* =========================================================
   6. EXPORT
========================================================= */

module.exports = router;