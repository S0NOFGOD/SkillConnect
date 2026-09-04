/* =========================================================
   1. IMPORT DEPENDENCIES
========================================================= */

const express = require("express");

const { refreshAccessToken } = require("../controllers/refreshToken");


/* =========================================================
   2. CREATE ROUTER
========================================================= */

const router = express.Router();


/* =========================================================
   3. REFRESH ACCESS TOKEN ROUTE
========================================================= */

router.post("/refresh", refreshAccessToken);


/* =========================================================
   4. EXPORT ROUTER
========================================================= */

module.exports = router;