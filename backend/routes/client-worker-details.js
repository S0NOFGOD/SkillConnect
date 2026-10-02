const express=require("express");

const router=express.Router();

const {
    getWorkerDetails,
    getClientRating,
    saveClientRating
}=require("../controllers/client-worker-details");

router.post("/",getWorkerDetails);

router.post("/rating",getClientRating);

router.put("/rating",saveClientRating);

module.exports=router;