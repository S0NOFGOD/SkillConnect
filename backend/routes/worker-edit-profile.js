"use strict";

const express=require("express");
const router=express.Router();

const {
    getProfile,
    updateProfile
}=require("../controllers/worker-edit-profile");

router.get("/edit-profile",getProfile);
router.put("/edit-profile",updateProfile);

module.exports=router;