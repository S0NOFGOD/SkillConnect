/* =========================
   1. IMPORTS
========================= */

/* Express is used to create the router. */
const express=require("express");

/* Multer handles multipart/form-data and uploaded images. */
const multer=require("multer");

/* Import the worker authentication middleware. */
const{
    authenticateWorker
}=require("../controllers/worker-authentication");

/* Import the create-service controller. */
const{
    createWorkerService
}=require("../controllers/worker-create-service");


/* =========================
   2. CREATE ROUTER
========================= */

/* Create a dedicated Express router. */
const router=express.Router();


/* =========================
   3. MULTER STORAGE
========================= */

/* Store uploaded images temporarily in memory. */
const storage=multer.memoryStorage();


/* =========================
   4. MULTER CONFIGURATION
========================= */

/* Limit the upload to a maximum of 3 portfolio images. */
const upload=multer({
    storage,

    limits:{
        files:3
    }
});


/* =========================
   5. CREATE SERVICE
========================= */

router.post(
    "/create-service",

    /* Authenticate the worker's accessToken cookie first. */
    (req,res,next)=>{
        const authentication=
            authenticateWorker(req);

        if(!authentication.valid){
            return res.status(
                authentication.status
            ).json({
                success:false,
                message:authentication.message
            });
        }

        req.workerId=authentication.userId;

        next();
    },

    /* Process the portfolio images after authentication succeeds. */
    (req,res,next)=>{
        upload.array(
            "portfolioPhotos",
            3
        )(req,res,error=>{

            if(error instanceof multer.MulterError){

                if(error.code==="LIMIT_FILE_COUNT"){
                    return res.status(400).json({
                        success:false,
                        message:"You can upload a maximum of 3 portfolio images."
                    });
                }

                if(error.code==="LIMIT_UNEXPECTED_FILE"){
                    return res.status(400).json({
                        success:false,
                        message:"You can upload a maximum of 3 portfolio images."
                    });
                }

                return res.status(400).json({
                    success:false,
                    message:"There was a problem processing your portfolio images."
                });
            }

            if(error){
                console.error(
                    "Multer upload error:",
                    error
                );

                return res.status(400).json({
                    success:false,
                    message:"Your portfolio images could not be uploaded. Please try again."
                });
            }

            next();
        });
    },

    createWorkerService
);


/* =========================
   6. EXPORT ROUTER
========================= */

/* Export this router so server.js can mount it. */
module.exports=router;