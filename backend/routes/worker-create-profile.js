"use strict";

const express = require("express");

const router = express.Router();

const {
    createWorkerProfile
} = require("../controllers/worker-create-profile");

router.post(
    "/create-profile",
    createWorkerProfile
);

module.exports = router;