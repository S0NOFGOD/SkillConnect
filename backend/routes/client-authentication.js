const express=require("express");
const router=express.Router();
const{signup,login,forgotPassword,googleAuthentication,googleCallback,googleExchange}=require("../controllers/client-authentication");

router.post("/signup",signup);
router.post("/login",login);
router.post("/forgot-password",forgotPassword);
router.get("/google",googleAuthentication);
router.get("/google/callback",googleCallback);
router.post("/google/exchange",googleExchange);

module.exports=router;