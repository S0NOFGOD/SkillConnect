const express = require("express");

const {
    getWorkerDashboard,
    verifyWorkerPhone
} = require("../controllers/worker-dashboard");

const router = express.Router();

router.get(
    "/dashboard",
    getWorkerDashboard
);

router.post(
    "/send-phone-otp",
    verifyWorkerPhone
);

module.exports = router;