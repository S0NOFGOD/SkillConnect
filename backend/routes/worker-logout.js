const express=require("express");

const {
    logoutWorker
}=require("../controllers/worker-logout");

const router=express.Router();

router.post(
    "/logout",
    logoutWorker
);

module.exports=router;