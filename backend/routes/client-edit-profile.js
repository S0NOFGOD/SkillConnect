const express=require("express");

const router=express.Router();

const clientEditProfileController=require("../controllers/client-edit-profile");

router.get(
    "/edit-profile",
    clientEditProfileController.getClientProfile
);

router.put(
    "/edit-profile",
    clientEditProfileController.updateClientProfile
);

module.exports=router;