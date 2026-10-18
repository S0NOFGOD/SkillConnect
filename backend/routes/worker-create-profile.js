const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
    createWorkerProfile
} = require("../controllers/worker-create-profile");

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    },

    fileFilter(req, file, callback) {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            const error = new Error(
                "Profile photo must be a JPG, PNG, or WebP image."
            );

            error.statusCode = 400;
            return callback(error);
        }

        callback(null, true);
    }
});

router.post(
    "/create-profile",
    upload.single("profilePhoto"),
    createWorkerProfile
);

module.exports = router;