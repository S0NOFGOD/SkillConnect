"use strict";

const express = require("express");

const {
    initializePaystackPayment,
    handlePaystackCallback,
    handlePaystackWebhook
} = require("../controllers/worker-payment-page");

const router = express.Router();

router.post(
    "/paystack/initialize",
    initializePaystackPayment
);

router.get(
    "/paystack/callback",
    handlePaystackCallback
);

router.post(
    "/paystack/webhook",
    handlePaystackWebhook
);

module.exports = router;