"use strict";

const express = require("express");
const router = express.Router();

const {
    getNearbyWorkers
} = require("../controllers/services");

/* GET NEARBY WORKERS */

router.post("/", getNearbyWorkers);

module.exports = router;