"use strict";

const Client = require("../models/client");
const Worker = require("../models/worker");

const {
    authenticateClient
} = require("./client-authentication");

const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/* Calculate distance between two coordinates */

function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371;

    const toRadians = degrees => degrees * Math.PI / 180;

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
}

/* Convert Cloudinary public ID to image URL */

function getProfilePhoto(photo) {
    if (!photo) return null;

    if (/^https?:\/\//i.test(photo)) {
        return photo;
    }

    return cloudinary.url(photo, {
        secure: true
    });
}

/* Search workers */

const searchWorkers = async (req, res) => {
    try {
        // Authenticate client inside the controller.

        const auth = await authenticateClient(req);

        if (!auth.valid) {
            return res.status(auth.status || 401).json({
                success: false,
                message: auth.message || "Unauthorized."
            });
        }

        const clientId = auth.userId;

        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        // Retrieve client location.

        const client = await Client.findById(clientId).select(
            "fullName profileCompleted latitude longitude"
        );

        if (!client) {
            return res.status(401).json({
                success: false,
                message: "Client account not found."
            });
        }

        if (!client.profileCompleted) {
            return res.status(400).json({
                success: false,
                message: "Please complete your client profile before searching for workers."
            });
        }

        if (
            !Number.isFinite(client.latitude) ||
            !Number.isFinite(client.longitude) ||
            client.latitude < -90 ||
            client.latitude > 90 ||
            client.longitude < -180 ||
            client.longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Your location is unavailable. Please update your profile."
            });
        }

        // Retrieve workers with valid profile verification
        // and at least one approved service.

        const now = new Date();

        const eligibleWorkers = await Worker.find({
            profileCompleted: true,
            profileVerificationExpires: { $gt: now },
            latitude: { $ne: null, $exists: true },
            longitude: { $ne: null, $exists: true },
            "services.adminApproval": "approved"
        })
            .select(
                "fullName profilePhoto latitude longitude services"
            )
            .lean();

        const workerData = [];

        // Calculate distance and collect approved services.

        for (const worker of eligibleWorkers) {
            if (
                !Number.isFinite(worker.latitude) ||
                !Number.isFinite(worker.longitude) ||
                worker.latitude < -90 ||
                worker.latitude > 90 ||
                worker.longitude < -180 ||
                worker.longitude > 180
            ) {
                continue;
            }

            const distanceKm = calculateDistance(
                client.latitude,
                client.longitude,
                worker.latitude,
                worker.longitude
            );

            if (distanceKm > 10) continue;

            const approvedServices = (worker.services || [])
                .filter(service =>
                    service.adminApproval === "approved" &&
                    service.skill &&
                    service.id !== undefined &&
                    service.id !== null
                );

            if (!approvedServices.length) continue;

            const profilePhoto = getProfilePhoto(
                worker.profilePhoto
            );

            // Each approved service becomes an individual result.

            for (const service of approvedServices) {
                workerData.push({
                    workerId: worker._id.toString(),
                    fullName: worker.fullName,
                    profilePhoto,
                    skill: service.skill,
                    latitude: Number(worker.latitude.toFixed(5)),
                    serviceId: service.id,
                    distanceKm: Number(distanceKm.toFixed(3))
                });
            }
        }

        // Nearest workers first.

        workerData.sort((a, b) =>
            a.distanceKm - b.distanceKm
        );

        return res.status(200).json({
            success: true,
            message: workerData.length
                ? "Workers found within your location."
                : "No workers found within your location.",
            workers: workerData
        });

    } catch (error) {
        console.error("Client worker search error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to find workers. Please try again."
        });
    }
};

module.exports = {
    searchWorkers
};