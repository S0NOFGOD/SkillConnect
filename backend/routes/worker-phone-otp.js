"use strict";

const express = require("express");

const {
authenticateWorker
} = require("../controllers/worker-authentication");

const {
getWorkerPhone,
verifyWorkerPhone,
resendWorkerPhoneOTP
} = require("../controllers/worker-phone-otp");

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
"/phone-otp",
requireWorker,
getWorkerPhone
);

router.post(
"/verify-phone",
requireWorker,
verifyWorkerPhone
);

router.post(
"/resend-phone-otp",
requireWorker,
resendWorkerPhoneOTP
);

module.exports = router;