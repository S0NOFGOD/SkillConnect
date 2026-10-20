"use strict";

const Worker = require("../models/worker");

const getWorkerServices = async (req, res) => {
    try {
        const workerId = req.workerId;

        if (!workerId) {
            return res.status(401).json({
                success: false,
                message: "Worker authentication is required."
            });
        }

        const worker = await Worker.findById(workerId)
            .select("services");

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account was not found."
            });
        }

        if (
            !Array.isArray(worker.services) ||
            worker.services.length === 0
        ) {
            return res.status(200).json({
                success: true,
                services: null
            });
        }

        const now = Date.now();

        // Delete services whose countdown has expired
        // or whose serviceCountDown is missing or invalid.
        worker.services = worker.services.filter(service => {
            if (!service.serviceCountDown) {
                return false;
            }

            const expiryTime = new Date(
                service.serviceCountDown
            ).getTime();

            return (
                Number.isFinite(expiryTime) &&
                expiryTime > now
            );
        });

        // Save the worker after removing expired services.
        await worker.save();

        // Return only services whose countdown is still valid.
        const services = worker.services
            .map(service => ({
                id: service.id,
                skill: service.skill,
                serviceCountDown: service.serviceCountDown,
                adminApproval: service.adminApproval
            }));

        return res.status(200).json({
            success: true,
            services: services.length > 0
                ? services
                : null
        });

    } catch (error) {
        console.error(
            "Get worker services error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load your services."
        });
    }
};

module.exports = {
    getWorkerServices
};