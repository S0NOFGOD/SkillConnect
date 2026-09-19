/* =========================
   1. IMPORTS
========================= */

/* Express is used to create the router. */
const express = require("express");

/* Multer handles multipart/form-data and uploaded images. */
const multer = require("multer");

/* Import the create-service controller. */
const {
    createWorkerService
} = require("../controllers/worker-create-service");


/* =========================
   2. CREATE ROUTER
========================= */

/* Create a dedicated Express router. */
const router = express.Router();


/* =========================
   3. MULTER STORAGE
========================= */
const storage = multer.memoryStorage();


/* =========================
   4. MULTER CONFIGURATION
========================= */
const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    }
});


/* =========================
   5. CREATE SERVICE
========================= */

router.post(
    "/create-service",
    upload.array("portfolioPhotos", 3),
    createWorkerService
);


/* =========================
   6. EXPORT ROUTER
========================= */

/* Export this router so server.js can mount it. */
module.exports = router;