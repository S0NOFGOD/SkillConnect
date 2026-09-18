/* =========================================================
  1. LOAD ENVIRONMENT VARIABLES
========================================================= */

require("dotenv").config();

/* =========================================================
2. READ TERMII CONFIGURATION
========================================================= */

const TERMII_API_KEY =
process.env.TERMII_API_KEY;

const TERMII_BASE_URL =
process.env.TERMII_BASE_URL;

/* =========================================================
3. EXPORT TERMII CONFIGURATION
========================================================= */

module.exports = {

TERMII_API_KEY,

TERMII_BASE_URL

};