const express=require("express");

const{
    signupWorker,
    loginWorker,
    forgotPassword,
    googleAuthentication,
    googleCallback,
    exchangeGoogleCode
}=require("../controllers/worker-authentication");

const router=express.Router();

router.post("/signup",signupWorker);

router.post("/login",loginWorker);

router.post("/forgot-password",forgotPassword);

router.get("/google",googleAuthentication);

router.get("/google/callback",googleCallback);

router.post("/google/exchange",exchangeGoogleCode);

module.exports=router;