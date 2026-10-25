"use strict";

const express = require("express");

const {
    initializePaystackPayment,
    verifyPaystackPaymentStatus,
    handlePaystackWebhook
} = require("../controllers/worker-payment-page");

const router = express.Router();

router.post(
    "/paystack/initialize",
    initializePaystackPayment
);

router.get(
    "/paystack/status/:reference",
    verifyPaystackPaymentStatus
);

router.post(
    "/paystack/webhook",
    handlePaystackWebhook
);

module.exports = router;