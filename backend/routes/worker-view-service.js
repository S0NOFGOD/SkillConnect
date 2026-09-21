const express=require("express");
const multer=require("multer");

const router=express.Router();

const{getWorkerService,updateWorkerService,deleteWorkerService}=require("../controllers/worker-view-service");

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{fileSize:5*1024*1024}
});

router.get("/view-service/:serviceId",getWorkerService);

router.put(
    "/view-service/:serviceId",
    upload.fields([
        {name:"portfolioPhoto1",maxCount:1},
        {name:"portfolioPhoto2",maxCount:1},
        {name:"portfolioPhoto3",maxCount:1}
    ]),
    updateWorkerService
);

router.delete("/view-service/:serviceId",deleteWorkerService);

module.exports=router;