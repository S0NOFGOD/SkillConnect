const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const {
    getProfile,
    updateProfile
} = require("../controllers/worker-edit-profile");

router.get(
    "/edit-profile",
    getProfile
);

router.put(
    "/edit-profile",
    upload.single("profilePhoto"),
    updateProfile
);

module.exports = router;