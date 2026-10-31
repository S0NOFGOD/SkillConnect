"use strict";

const express = require("express");
const router = express.Router();

const {
    getWorkerServices
} = require("../controllers/worker-services");

router.get("/services", getWorkerServices);

module.exports = router;