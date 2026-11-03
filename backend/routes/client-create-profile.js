"use strict";

const express=require("express");
const clientCreateProfileController=require("../controllers/client-create-profile");

const router=express.Router();

router.post("/",clientCreateProfileController);

module.exports=router;