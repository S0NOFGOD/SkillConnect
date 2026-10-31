"use strict";

const express = require("express");

const {
    getWorkerDashboard,
    verifyWorkerPhone
} = require("../controllers/worker-dashboard");

const router = express.Router();

/* =========================================================
   WORKER DASHBOARD
========================================================= */

router.get(
    "/dashboard",
    getWorkerDashboard
);

/* =========================================================
   SEND PHONE OTP
========================================================= */

router.post(
    "/send-phone-otp",
    verifyWorkerPhone
);

module.exports = router;