const express=require("express");

const router=express.Router();

const {
    getWorkerDetails,
    contactWorker,
    getClientRating,
    saveClientRating
}=require("../controllers/client-worker-details");

router.post("/",getWorkerDetails);

router.post("/contact",contactWorker);

router.post("/rating",getClientRating);

router.put("/rating",saveClientRating);

module.exports=router;