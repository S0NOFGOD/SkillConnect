/* =========================
   1. IMPORTS
========================= */

const express=require("express");

const{
    authenticateAdmin
}=require("../controllers/admin-authentication");

const{
    getAdminWorkerServices
}=require("../controllers/admin-worker-services");


/* =========================
   2. ROUTER
========================= */

const router=express.Router();


/* =========================
   3. GET WORKER SERVICES
========================= */

router.get(
    "/",
    authenticateAdmin,
    getAdminWorkerServices
);


/* =========================
   4. EXPORT
========================= */

module.exports=router;