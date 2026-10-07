const express=require("express");

const {
    loginAdmin
}=require("../controllers/admin-authentication");

const router=express.Router();

router.post("/login",loginAdmin);

module.exports=router;