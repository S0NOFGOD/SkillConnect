const express=require("express");

const router=express.Router();

const {
    authenticateAdmin
}=require("../controllers/admin-authentication");

const {
    getAdminViewService,
    approveAdminViewService,
    rejectAdminViewService
}=require("../controllers/admin-view-service");


/* =========================================================
   GET SERVICE DETAILS
========================================================= */

router.get(
    "/:serviceId",
    authenticateAdmin,
    getAdminViewService
);


/* =========================================================
   APPROVE SERVICE
========================================================= */

router.put(
    "/:serviceId/approve",
    authenticateAdmin,
    approveAdminViewService
);


/* =========================================================
   REJECT SERVICE
========================================================= */

router.put(
    "/:serviceId/reject",
    authenticateAdmin,
    rejectAdminViewService
);


module.exports=router;