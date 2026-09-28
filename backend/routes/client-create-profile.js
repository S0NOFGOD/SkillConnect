const express=require("express");
const multer=require("multer");
const clientCreateProfileController=require("../controllers/client-create-profile");

const router=express.Router();

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{
        fileSize:5*1024*1024
    },
    fileFilter:(req,file,cb)=>{
        if(["image/jpeg","image/png","image/webp"].includes(file.mimetype)){
            cb(null,true);
        }else{
            cb(new Error("Profile photo must be JPG, PNG, or WebP."));
        }
    }
});

router.post(
    "/",
    upload.single("profilePhoto"),
    clientCreateProfileController
);

module.exports=router;