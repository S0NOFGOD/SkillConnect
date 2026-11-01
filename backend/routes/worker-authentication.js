"use strict";

const express = require("express");
const {
    signupWorker,
    loginWorker,
    forgotPassword,
    googleAuthentication,
    googleCallback
} = require("../controllers/worker-authentication");

const router = express.Router();

router.post("/signup", signupWorker);
router.post("/login", loginWorker);
router.post("/forgot-password", forgotPassword);

router.post("/google", googleAuthentication);
router.get("/google/callback", googleCallback);

module.exports = router;