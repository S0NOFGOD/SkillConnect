const express=require("express");
const router=express.Router();

const{
searchWorkers
}=require("../controllers/client-workers-search");

router.get("/",searchWorkers);

module.exports=router;