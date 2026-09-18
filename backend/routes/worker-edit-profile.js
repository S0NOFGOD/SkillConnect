/* =========================================================
   WORKER EDIT PROFILE ROUTES
========================================================= */

const express = require("express");
const multer = require("multer");

const router = express.Router();


/* =========================================================
   MULTER CONFIGURATION
   - Store uploaded profile photos in memory.
   - Cloudinary/controller handles the actual upload.
========================================================= */

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});


/* =========================================================
   WORKER EDIT PROFILE CONTROLLER
========================================================= */

const {
    getProfile,
    updateProfile,
    logout
} = require("../controllers/worker-edit-profile");


/* =========================================================
   ROUTES
========================================================= */

// Load current worker profile.
router.get(
    "/edit-profile",
    getProfile
);


// Update worker profile and optional profile photo.
router.put(
    "/edit-profile",
    upload.single("profilePhoto"),
    updateProfile
);


// Logout worker and revoke refresh-token session.
router.post(
    "/dashboard/logout",
    logout
);


module.exports = router;