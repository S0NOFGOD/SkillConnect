const express = require("express");

const router = express.Router();

const workerServicesController =
    require("../controllers/worker-services");

router.get(
    "/services",
    workerServicesController.getWorkerServices
);

module.exports = router;