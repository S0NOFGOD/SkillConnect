const express=require("express");
const multer=require("multer");
const router=express.Router();

const{authenticateWorker}=require("../controllers/worker-authentication");
const{
    getWorkerService,
    updateWorkerService,
    deleteWorkerService
}=require("../controllers/worker-view-service");

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{
        fileSize:5*1024*1024,
        files:3
    },
    fileFilter:(req,file,callback)=>{
        if(!file.mimetype.startsWith("image/")){
            return callback(new Error("Only image files are allowed."));
        }

        callback(null,true);
    }
});

const requireWorker=(req,res,next)=>{
    const auth=authenticateWorker(req);

    if(!auth.valid){
        return res.status(auth.status).json({
            success:false,
            message:auth.message
        });
    }

    req.workerId=auth.userId;
    next();
};

router.get(
    "/view-service/:serviceId",
    requireWorker,
    getWorkerService
);

router.put(
    "/view-service/:serviceId",
    requireWorker,
    upload.array("portfolioPhotos",3),
    updateWorkerService
);

router.delete(
    "/view-service/:serviceId",
    requireWorker,
    deleteWorkerService
);

module.exports=router;