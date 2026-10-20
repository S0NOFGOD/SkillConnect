"use strict";

const express = require("express");

const {
    authenticateWorker
} = require("../controllers/worker-authentication");

const {
    getWorkerDashboard,
    verifyWorkerPhone
} = require("../controllers/worker-dashboard");

const router = express.Router();

const requireWorker = (req, res, next) => {
    const auth = authenticateWorker(req);

    if (!auth.valid) {
        return res.status(auth.status).json({
            success: false,
            message: auth.message
        });
    }

    req.workerId = auth.userId;
    next();
};

router.get(
    "/dashboard",
    requireWorker,
    getWorkerDashboard
);

router.post(
    "/send-phone-otp",
    requireWorker,
    verifyWorkerPhone
);

module.exports = router;