const express=require("express");
const router=express.Router();
const clientPasswordChange=require("../controllers/client-password-change");

router.post("/",clientPasswordChange);

module.exports=router;