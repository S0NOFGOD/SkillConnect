"use strict";

const express = require("express");
const router = express.Router();

const {
    getWorkerDetails,
    contactWorker
} = require("../controllers/worker-details");

router.post("/", getWorkerDetails);

router.post("/contact", contactWorker);

module.exports = router;