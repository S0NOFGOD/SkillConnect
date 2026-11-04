"use strict";

const Worker = require("../models/worker");
const { v2: cloudinary } = require("cloudinary");

/* =========================================================
   1. CLOUDINARY CONFIGURATION
========================================================= */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/* =========================================================
   2. DISTANCE CALCULATION
========================================================= */

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = value => value * Math.PI / 180;
    const earthRadius = 6371;

    const latitudeDifference = toRadians(lat2 - lat1);
    const longitudeDifference = toRadians(lon2 - lon1);

    const a =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(longitudeDifference / 2) ** 2;

    return earthRadius * 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );
};

/* =========================================================
   3. VALIDATE CLIENT LOCATION
========================================================= */

const validateCoordinates = (latitude, longitude) => {
    if (
        typeof latitude !== "number" ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {
        return {
            valid: false,
            message: "A valid latitude is required."
        };
    }

    if (
        typeof longitude !== "number" ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        return {
            valid: false,
            message: "A valid longitude is required."
        };
    }

    return { valid: true };
};

/* =========================================================
   4. GET NEARBY WORKERS
========================================================= */

const getNearbyWorkers = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        /* VALIDATE COORDINATES */

        const validation = validateCoordinates(
            latitude,
            longitude
        );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        /* FIND WORKERS WITHIN 10 KM */

        const radius = 10;
        const latitudeRange = radius / 111.32;

        const longitudeRange =
            Math.abs(Math.cos(latitude * Math.PI / 180)) < 0.000001
                ? 180
                : radius / (
                    111.32 *
                    Math.abs(Math.cos(latitude * Math.PI / 180))
                );

        const now = new Date();

        const locationQuery = {
            latitude: {
                $gte: Math.max(-90, latitude - latitudeRange),
                $lte: Math.min(90, latitude + latitudeRange)
            },

            longitude: {
                $gte: Math.max(-180, longitude - longitudeRange),
                $lte: Math.min(180, longitude + longitudeRange)
            }
        };

        /* =================================================
           5. WORKER SEARCH DIAGNOSTICS
        ================================================= */

        const totalWorkers = await Worker.countDocuments();

        /* DISPLAY ALL SAVED WORKER LOCATIONS */

        const allWorkerLocations = await Worker.find({})
            .select(
                "_id fullName latitude longitude profileVerificationExpires"
            );

        console.log(
            "ALL SAVED WORKER LOCATIONS:",
            allWorkerLocations.map(worker => ({
                workerId: worker._id.toString(),
                fullName: worker.fullName,
                latitude: worker.latitude,
                longitude: worker.longitude,
                latitudeType: typeof worker.latitude,
                longitudeType: typeof worker.longitude,
                profileVerificationExpires:
                    worker.profileVerificationExpires
            }))
        );

        /* COUNT WORKERS WITHIN CLIENT LOCATION */

        const workersWithCoordinates = await Worker.countDocuments(
            locationQuery
        );

        /* COUNT WORKERS WITH VALID PROFILE VERIFICATION */

        const workersWithValidVerification = await Worker.countDocuments({
            ...locationQuery,

            profileVerificationExpires: {
                $gt: now
            }
        });

        /* COUNT WORKERS WITH APPROVED SERVICES */

        const workersWithApprovedServices = await Worker.countDocuments({
            ...locationQuery,

            profileVerificationExpires: {
                $gt: now
            },

            "services.adminApproval": "approved"
        });

        console.log("WORKER SEARCH DIAGNOSTICS:", {
            clientLocation: {
                latitude,
                longitude
            },
            searchRadius: radius,
            totalWorkers,
            workersWithCoordinates,
            workersWithValidVerification,
            workersWithApprovedServices
        });

        /* =================================================
           6. FIND ELIGIBLE WORKERS
        ================================================= */

        const workers = await Worker.find({
            ...locationQuery,

            profileVerificationExpires: {
                $gt: now
            },

            "services.adminApproval": "approved"
        }).select(
            "_id fullName profilePhoto latitude longitude services"
        );

        /* FILTER AND FORMAT NEARBY WORKERS */

        const nearbyWorkers = [];

        for (const worker of workers) {
            if (
                !Number.isFinite(worker.latitude) ||
                !Number.isFinite(worker.longitude) ||
                !Array.isArray(worker.services)
            ) {
                continue;
            }

            const distance = calculateDistance(
                latitude,
                longitude,
                worker.latitude,
                worker.longitude
            );

            if (distance > radius) continue;

            const profilePhoto = worker.profilePhoto
                ? cloudinary.url(worker.profilePhoto, {
                    resource_type: "image",
                    secure: true
                })
                : null;

            for (const service of worker.services) {
                if (
                    service.id === undefined ||
                    service.id === null ||
                    !service.skill ||
                    service.adminApproval !== "approved"
                ) {
                    continue;
                }

                nearbyWorkers.push({
                    workerId: worker._id.toString(),
                    fullName: worker.fullName || null,
                    profilePhoto,
                    skill: service.skill,
                    latitude: Number(worker.latitude.toFixed(5)),
                    serviceId: service.id,
                    distance
                });
            }
        }

        /* SORT NEAREST WORKERS FIRST */

        nearbyWorkers.sort((a, b) => a.distance - b.distance);

        /* REMOVE INTERNAL DISTANCE FIELD */

        const formattedWorkers = nearbyWorkers.map(({
            workerId,
            fullName,
            profilePhoto,
            skill,
            latitude,
            serviceId
        }) => ({
            workerId,
            fullName,
            profilePhoto,
            skill,
            latitude,
            serviceId
        }));

        /* RETURN WORKERS */

        return res.status(200).json({
            success: true,
            workers: formattedWorkers
        });

    } catch (error) {
        console.error("Get Nearby Workers Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to find nearby workers."
        });
    }
};

/* =========================================================
   7. EXPORT CONTROLLER
========================================================= */

module.exports = {
    getNearbyWorkers
};