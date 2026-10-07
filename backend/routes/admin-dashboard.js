const express=require("express");

const router=express.Router();

const {
    getAdminDashboard
}=require("../controllers/admin-dashboard");

const {
    authenticateAdmin
}=require("../controllers/admin-authentication");

router.get(
    "/",
    authenticateAdmin,
    getAdminDashboard
);

module.exports=router;