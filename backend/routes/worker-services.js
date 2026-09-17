/* =========================================================
   1. IMPORT EXPRESS ROUTER
========================================================= */

const express =
    require("express");



/* =========================================================
   2. CREATE ROUTER
========================================================= */

const router =
    express.Router();



/* =========================================================
   3. IMPORT WORKER SERVICES CONTROLLER
========================================================= */

const workerServicesController =
    require("../controllers/worker-services");



/* =========================================================
   4. GET WORKER SERVICES
========================================================= */

router.get(

    "/services",

    workerServicesController.getWorkerServices

);



/* =========================================================
   5. LOGOUT WORKER
========================================================= */

router.post(

    "/logout",

    workerServicesController.logoutWorker

);



/* =========================================================
   6. EXPORT ROUTER
========================================================= */

module.exports =
    router;