"use strict";

const net = require("node:net");
const mongoose = require("mongoose");

const Client = require("../models/client");
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

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return earthRadius * c;
};

/* =========================================================
   3. GET NEARBY WORKERS
========================================================= */

const getNearbyWorkers = async (req, res) => {
    try {
        const { ipAddress, latitude, longitude } = req.body;

        /* VALIDATE IP ADDRESS */

        if (
            typeof ipAddress !== "string" ||
            !net.isIP(ipAddress.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid IP address is required."
            });
        }

        /* VALIDATE LATITUDE */

        if (
            typeof latitude !== "number" ||
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid latitude is required."
            });
        }

        /* VALIDATE LONGITUDE */

        if (
            typeof longitude !== "number" ||
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid longitude is required."
            });
        }

        /* =================================================
           4. FIND OR CREATE CLIENT
        ================================================= */

        const client = await Client.findOneAndUpdate(
            {
                ipAddress: ipAddress.trim()
            },
            {
                $set: {
                    latitude,
                    longitude
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        if (!client) {
            return res.status(500).json({
                success: false,
                message: "Unable to save your location."
            });
        }

        /* =================================================
           5. FIND WORKERS WITHIN 10 KM
        ================================================= */

        const radius = 10;
        const earthRadius = 6371;

        const latitudeRange = radius / 111.32;

        const longitudeRange =
            Math.abs(Math.cos(latitude * Math.PI / 180)) < 0.000001
                ? 180
                : radius / (
                    111.32 *
                    Math.abs(Math.cos(latitude * Math.PI / 180))
                );

        const minLatitude = Math.max(
            -90,
            latitude - latitudeRange
        );

        const maxLatitude = Math.min(
            90,
            latitude + latitudeRange
        );

        const minLongitude = Math.max(
            -180,
            longitude - longitudeRange
        );

        const maxLongitude = Math.min(
            180,
            longitude + longitudeRange
        );

        const now = new Date();

        const workers = await Worker.find({
            latitude: {
                $gte: minLatitude,
                $lte: maxLatitude
            },

            longitude: {
                $gte: minLongitude,
                $lte: maxLongitude
            },

            profileVerificationExpires: {
                $gt: now
            }
        }).select(
            "fullName profilePhoto latitude longitude services"
        );

        /* =================================================
           6. FILTER AND FORMAT NEARBY WORKERS
        ================================================= */

        const nearbyWorkers = [];

        for (const worker of workers) {
            if (
                !Number.isFinite(worker.latitude) ||
                !Number.isFinite(worker.longitude)
            ) {
                continue;
            }

            const distance = calculateDistance(
                latitude,
                longitude,
                worker.latitude,
                worker.longitude
            );

            if (distance > radius) {
                continue;
            }

            if (!Array.isArray(worker.services)) {
                continue;
            }

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
                    !service.skill
                ) {
                    continue;
                }

                nearbyWorkers.push({
                    fullName: worker.fullName,
                    profilePhoto,
                    skill: service.skill,
                    latitude: worker.latitude,
                    serviceId: service.id,
                    distance
                });
            }
        }

        /* =================================================
           7. SORT NEAREST WORKERS FIRST
        ================================================= */

        nearbyWorkers.sort(
            (a, b) => a.distance - b.distance
        );

        /* REMOVE INTERNAL DISTANCE FIELD */

        const formattedWorkers = nearbyWorkers.map(
            ({
                fullName,
                profilePhoto,
                skill,
                latitude,
                serviceId
            }) => ({
                fullName,
                profilePhoto,
                skill,
                latitude,
                serviceId
            })
        );

        /* =================================================
           8. RETURN WORKERS
        ================================================= */

        return res.status(200).json({
            success: true,
            workers: formattedWorkers
        });

    } catch (error) {
        console.error(
            "Get Nearby Workers Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to find nearby workers."
        });
    }
};

/* =========================================================
   9. EXPORT CONTROLLER
========================================================= */

module.exports = {
    getNearbyWorkers
};