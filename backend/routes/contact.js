/* =========================================================
   SKILLCONNECT CONTACT ROUTES
   Defines API endpoints for the Contact page.
========================================================= */


/* =========================================================
   IMPORT EXPRESS
========================================================= */

const express = require("express");


/* =========================================================
   IMPORT CONTACT CONTROLLER
========================================================= */

const {
    createContactMessage
} = require("../controllers/contact");


/* =========================================================
   CREATE ROUTER
========================================================= */

const router =
    express.Router();


/* =========================================================
   CREATE CONTACT MESSAGE
========================================================= */

/*
    POST /api/contact

    When the frontend sends a POST request to:

    http://localhost:5000/api/contact

    Express will execute:

    createContactMessage
*/

router.post(
    "/",
    createContactMessage
);


/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;