/* =========================================================
   WORKER EDIT PROFILE CONTROLLER
========================================================= */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Worker = require("../models/worker");
const cloudinary = require("../config/cloudinary");


/* =========================================================
   HELPERS
========================================================= */

// Extract worker ID from the access token.
const authenticate = async (req) => {

    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return null;
    }

    const token = header.split(" ")[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        const workerId =
            decoded.workerId ||
            decoded.id ||
            decoded.userId;

        if (!workerId) {
            return null;
        }

        return await Worker.findById(workerId);

    } catch (error) {

        return null;
    }
};


// Create a usable Cloudinary URL from public_id.
const getPhotoUrl = (publicId) => {

    if (!publicId) {
        return null;
    }

    return cloudinary.url(publicId, {
        secure: true
    });
};


// Normalize Nigerian phone numbers.
const normalizePhone = (phone) => {

    let value =
        String(phone || "")
            .trim()
            .replace(/[\s()-]/g, "");

    if (value.startsWith("234")) {
        value = `+${value}`;
    }

    if (
        value.startsWith("0") &&
        value.length === 11
    ) {
        value =
            `+234${value.slice(1)}`;
    }

    return value;
};


// Validate normalized Nigerian phone.
const isValidPhone = (phone) =>
    /^\+234\d{10}$/.test(phone);


// Validate required profile fields.
const validateProfile = ({
    fullName,
    phone,
    country,
    state,
    city,
    lga
}) => {

    if (
        !fullName ||
        fullName.length < 2 ||
        fullName.length > 100
    ) {
        return "Please provide a valid full name.";
    }

    if (!isValidPhone(phone)) {
        return "Please provide a valid Nigerian phone number.";
    }

    if (!country) {
        return "Country is required.";
    }

    if (!state) {
        return "State is required.";
    }

    if (!city) {
        return "City is required.";
    }

    if (!lga) {
        return "LGA is required.";
    }

    return null;
};


// Build the worker response without exposing sensitive fields.
const workerResponse = (worker) => ({

    fullName: worker.fullName,

    profilePhoto:
        getPhotoUrl(worker.profilePhoto),

    phone: worker.phone,

    phoneVerificationExpires:
        worker.phoneVerificationExpires,

    email: worker.email,

    country: worker.country,

    state: worker.state,

    city: worker.city,

    lga: worker.lga,

    skills: worker.skills,

    services: worker.services,

    experience: worker.experience,

    socialProfile: worker.socialProfile,

    description: worker.description

});


/* =========================================================
   GET WORKER PROFILE
========================================================= */

const getProfile = async (req, res) => {

    try {

        const worker =
            await authenticate(req);

        if (!worker) {

            return res.status(401).json({
                success: false,
                message:
                    "Your authentication session has expired. Please log in again."
            });

        }

        return res.status(200).json({

            success: true,

            worker:
                workerResponse(worker)

        });

    } catch (error) {

        console.error(
            "Get worker edit profile error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load your profile."
        });

    }
};


/* =========================================================
   UPDATE WORKER PROFILE
========================================================= */

const updateProfile = async (req, res) => {

    try {

        const worker =
            await authenticate(req);

        if (!worker) {

            return res.status(401).json({
                success: false,
                message:
                    "Your authentication session has expired. Please log in again."
            });

        }


        /* =================================================
           READ & NORMALIZE DATA
        ================================================= */

        const fullName =
            String(req.body.fullName || "").trim();

        const phone =
            normalizePhone(req.body.phone);

        const country =
            String(req.body.country || "").trim();

        const state =
            String(req.body.state || "").trim();

        const city =
            String(req.body.city || "").trim();

        const lga =
            String(req.body.lga || "").trim();


        /* =================================================
           VALIDATE PROFILE
        ================================================= */

        const validationError =
            validateProfile({
                fullName,
                phone,
                country,
                state,
                city,
                lga
            });

        if (validationError) {

            return res.status(400).json({
                success: false,
                message: validationError
            });

        }


        /* =================================================
           CHECK CHANGED PHONE
        ================================================= */

        const phoneChanged =
            worker.phone !== phone;

        if (phoneChanged) {

            const existingWorker =
                await Worker.findOne({
                    phone,
                    _id: {
                        $ne: worker._id
                    }
                });

            if (existingWorker) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This phone number is already registered."
                });

            }

        }


        /* =================================================
           SAVE NEW PROFILE PHOTO
        ================================================= */

        let newPhotoPublicId =
            worker.profilePhoto;

        let uploadedNewPhoto = false;


        if (req.file) {

            if (
                req.file.size >
                5 * 1024 * 1024
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Profile photo must not exceed 5MB."
                });

            }


            try {

                const uploadResult =
                    await new Promise(
                        (resolve, reject) => {

                            const stream =
                                cloudinary.uploader.upload_stream(
                                    {
                                        folder:
                                            "skillconnect/workers/profile-photos"
                                    },

                                    (error, result) => {

                                        if (error) {
                                            return reject(
                                                error
                                            );
                                        }

                                        resolve(result);
                                    }
                                );

                            stream.end(
                                req.file.buffer
                            );
                        }
                    );


                newPhotoPublicId =
                    uploadResult.public_id;

                uploadedNewPhoto = true;

            } catch (error) {

                console.error(
                    "Cloudinary upload error:",
                    error
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "Unable to upload your profile photo."
                });

            }

        }


        /* =================================================
           UPDATE DATABASE
        ================================================= */

        const oldPhotoPublicId =
            worker.profilePhoto;

        worker.fullName =
            fullName;

        worker.phone =
            phone;

        worker.country =
            country;

        worker.state =
            state;

        worker.city =
            city;

        worker.lga =
            lga;


        if (uploadedNewPhoto) {

            worker.profilePhoto =
                newPhotoPublicId;

        }


        // Changing the phone requires re-verification.
        if (phoneChanged) {

            worker.phoneVerificationExpires =
                null;

        }


        await worker.save();


        /* =================================================
           DELETE OLD CLOUDINARY PHOTO
        ================================================= */

        if (
            uploadedNewPhoto &&
            oldPhotoPublicId &&
            oldPhotoPublicId !== newPhotoPublicId
        ) {

            try {

                await cloudinary.uploader.destroy(
                    oldPhotoPublicId
                );

            } catch (error) {

                // The database update has already succeeded.
                console.error(
                    "Old Cloudinary photo deletion error:",
                    error
                );

            }

        }


        /* =================================================
           SUCCESS RESPONSE
        ================================================= */

        return res.status(200).json({

            success: true,

            message:
                "Your profile was updated successfully.",

            worker:
                workerResponse(worker)

        });

    } catch (error) {

        console.error(
            "Update worker profile error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update your profile."
        });

    }
};


/* =========================================================
   LOGOUT
========================================================= */

const logout = async (req, res) => {

    try {

        const worker =
            await authenticate(req);

        if (!worker) {

            return res.status(401).json({
                success: false,
                message:
                    "Your authentication session has expired. Please log in again."
            });

        }


        // Revoke the stored refresh-token session.
        worker.refreshTokenHash = null;

        await worker.save();


        // Remove the HTTP-only refresh-token cookie.
        res.clearCookie(
            "refreshToken",
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    "production",
                sameSite:
                    process.env.NODE_ENV ===
                    "production"
                        ? "none"
                        : "lax"
            }
        );


        return res.status(200).json({

            success: true,

            message:
                "You have been logged out successfully."

        });

    } catch (error) {

        console.error(
            "Worker logout error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to log out."
        });

    }
};


/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
    getProfile,
    updateProfile,
    logout
};