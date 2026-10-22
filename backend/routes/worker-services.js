"use strict";

const express = require("express");
const router = express.Router();

const {
    getWorkerServices,
    activateWorkerService
} = require("../controllers/worker-services");

router.get("/services", getWorkerServices);
router.post("/services/activate", activateWorkerService);

module.exports = router;