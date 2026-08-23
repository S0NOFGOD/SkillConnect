/* =========================================================
   IMPORT EXPRESS ROUTER
========================================================= */

/*
    Express Router allows us to create
    separate routes for this feature.
*/

const express =
    require("express");


/* =========================================================
   CREATE ROUTER
========================================================= */

/*
    Create a new Express router.
*/

const router =
    express.Router();


/* =========================================================
   IMPORT PASSWORD CHANGE CONTROLLER
========================================================= */

const {
    changeWorkerPassword
} = require(
    "../controllers/worker-password-change"
);


/* =========================================================
   CHANGE WORKER PASSWORD
========================================================= */

router.post(

    "/",

    changeWorkerPassword

);


/* =========================================================
   EXPORT ROUTER
========================================================= */


module.exports =
    router;