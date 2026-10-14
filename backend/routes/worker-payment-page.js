"use strict";

const express = require("express");

const {
    authenticateWorker
} = require("../controllers/worker-authentication");

const {
    initializePaystackPayment,
    verifyPaystackPaymentStatus,
    handlePaystackWebhook
} = require("../controllers/worker-payment-page");

const router = express.Router();

router.post(
    "/paystack/initialize",
    async (req, res, next) => {
        try {
            const authentication = authenticateWorker(req);

            if (!authentication.valid) {
                return res.status(authentication.status).json({
                    success: false,
                    message: authentication.message
                });
            }

            req.workerId = authentication.userId;

            return next();
        } catch (error) {
            return next(error);
        }
    },
    initializePaystackPayment
);


router.get(
    "/paystack/status/:reference",
    async (req, res, next) => {
        try {
            const authentication = authenticateWorker(req);

            if (!authentication.valid) {
                return res.status(authentication.status).json({
                    success: false,
                    message: authentication.message
                });
            }

            req.workerId = authentication.userId;

            return next();
        } catch (error) {
            return next(error);
        }
    },
    verifyPaystackPaymentStatus
);

router.post(
    "/paystack/webhook",
    handlePaystackWebhook
);

module.exports = router;