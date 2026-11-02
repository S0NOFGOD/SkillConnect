"use strict";

const express=require("express");
const router=express.Router();

const auth=require("../controllers/client-authentication");

router.post("/signup",auth.signup);
router.post("/login",auth.login);
router.post("/forgot-password",auth.forgotPassword);

router.get("/google",auth.googleAuthentication);
router.get("/google/callback",auth.googleCallback);

module.exports=router;