const express=require("express");

const router=express.Router();

const{
    authenticateWorker
}=require("../controllers/worker-authentication");

const{
    getWorkerServices
}=require("../controllers/worker-services");

router.get(
    "/services",
    (req,res)=>{
        const authentication=authenticateWorker(req);

        if(!authentication.valid){
            return res.status(
                authentication.status
            ).json({
                success:false,
                message:authentication.message
            });
        }

        req.workerId=authentication.userId;

        return getWorkerServices(req,res);
    }
);

module.exports=router;