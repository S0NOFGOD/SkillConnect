const express=require("express");

const router=express.Router();

const {
getClientDashboard
}=require("../controllers/client-dashboard");

router.get("/",getClientDashboard);

module.exports=router;