"use strict";

const Worker = require("../models/worker");
const { authenticateWorker } = require("./worker-authentication");

/* ACCESS TOKEN AUTHENTICATION */
const authenticateRequest = (req, res) => {
    const auth = authenticateWorker(req);

    if (!auth.valid) {
        res.status(auth.status || 401).json({
            success: false,
            message: auth.message || "Authentication required."
        });

        return null;
    }

    return auth.userId;
};

/* GET WORKER SERVICES */
const getWorkerServices = async (req, res) => {
    try {
        // Authenticate the access-token credential.
        const workerId = authenticateRequest(req, res);

        if (!workerId) return;

        // Retrieve the worker's services.
        const worker = await Worker.findById(workerId)
            .select("services");

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account was not found."
            });
        }

        // Retrieve only the required service information.
        const services = (worker.services || []).map(service => ({
            id: service.id,
            skill: service.skill,
            date: service.date,
            adminApproval: service.adminApproval
        }));

        // Most recent service date first.
        services.sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();

            const aValid = Number.isFinite(aTime) ? aTime : 0;
            const bValid = Number.isFinite(bTime) ? bTime : 0;

            return bValid - aValid;
        });

        return res.status(200).json({
            success: true,
            services: services.length ? services : null
        });

    } catch (error) {
        console.error("Get worker services error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load your services."
        });
    }
};

module.exports = {
    getWorkerServices
};