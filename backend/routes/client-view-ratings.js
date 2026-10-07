const express=require("express");

const router=express.Router();

const clientViewRatingsController=require(
    "../controllers/client-view-ratings"
);

router.post(
    "/",
    clientViewRatingsController
);

module.exports=router;