"use strict";

const express = require("express");

const {
createWorkerService
} = require("../controllers/worker-create-service");

const router = express.Router();

router.post(
"/create-service",
createWorkerService
);

module.exports = router;