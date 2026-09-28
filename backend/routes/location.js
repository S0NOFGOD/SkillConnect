/* =========================================================
   SKILLCONNECT LOCATION ROUTES
========================================================= */

const express=require("express");

const router=express.Router();

const {
    getLocation
}=require("../controllers/location");


/* =========================================================
   GET LOCATION
========================================================= */

router.get(
    "/",
    getLocation
);


module.exports=router;