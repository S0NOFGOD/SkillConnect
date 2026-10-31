"use strict";

const express = require("express");

const {
    getWorkerService,
    updateWorkerService
} = require("../controllers/worker-view-service");

const router = express.Router();

/* GET SERVICE */

router.get(
    "/view-service/:serviceId",
    getWorkerService
);

/* UPDATE SERVICE */

router.put(
    "/view-service/:serviceId",
    updateWorkerService
);

module.exports = router;