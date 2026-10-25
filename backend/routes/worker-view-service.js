"use strict";

const express = require("express");

const {
    getWorkerService,
    updateWorkerService,
    activateWorkerService
} = require("../controllers/worker-view-service");

const router = express.Router();

router.get(
    "/view-service/:serviceId",
    getWorkerService
);

router.put(
    "/view-service/:serviceId",
    updateWorkerService
);

router.post(
    "/activate-service/:serviceId",
    activateWorkerService
);

module.exports = router;