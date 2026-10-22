"use strict";

const Worker = require("../models/worker");
const { authenticateWorker } = require("./worker-authentication");

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

const getWorkerServices = async (req, res) => {
    try {
        const workerId = authenticateRequest(req, res);
        if (!workerId) return;

        const worker = await Worker.findById(workerId).select("services");

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account was not found."
            });
        }

        const services = (worker.services || []).map(service => ({
            id: service.id,
            skill: service.skill,
            serviceCountDown: service.serviceCountDown,
            adminApproval: service.adminApproval
        }));

        // Keep expired services so workers can activate them again.
        services.sort((a, b) => {
            const aTime = new Date(a.serviceCountDown).getTime();
            const bTime = new Date(b.serviceCountDown).getTime();
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

const activateWorkerService = async (req, res) => {
    try {
        const workerId = authenticateRequest(req, res);
        if (!workerId) return;

        const { serviceId } = req.body || {};

        if (serviceId === undefined || serviceId === null || serviceId === "") {
            return res.status(400).json({
                success: false,
                message: "Service ID is required."
            });
        }

        const worker = await Worker.findById(workerId).select("services");

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account was not found."
            });
        }

        const service = worker.services.find(
            item => String(item.id) === String(serviceId)
        );

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service was not found."
            });
        }

        service.serviceCountDown = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        );

        await worker.save();

        return res.status(200).json({
            success: true,
            message: "Service activated successfully.",
            service: {
                id: service.id,
                skill: service.skill,
                serviceCountDown: service.serviceCountDown,
                adminApproval: service.adminApproval
            }
        });
    } catch (error) {
        console.error("Activate worker service error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to activate this service."
        });
    }
};

module.exports = {
    getWorkerServices,
    activateWorkerService
};