const express=require("express");
const multer=require("multer");

const router=express.Router();

const upload=multer({
    storage:multer.memoryStorage()
});

const clientEditProfileController=require("../controllers/client-edit-profile");

router.get(
    "/edit-profile",
    clientEditProfileController.getClientProfile
);

router.put(
    "/edit-profile",
    upload.single("profilePhoto"),
    clientEditProfileController.updateClientProfile
);

module.exports=router;