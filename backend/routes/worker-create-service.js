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
   3. UPLOAD LIMITS
========================= */

/* Allow each original portfolio image to be up to 15 MiB. */
const MAX_PORTFOLIO_IMAGE_SIZE=15*1024*1024;

/* Allow a maximum of 3 portfolio images. */
const MAX_PORTFOLIO_IMAGES=3;


/* =========================
   4. MULTER STORAGE
========================= */

/* Store uploaded images temporarily in memory. */
const storage=multer.memoryStorage();


/* =========================
   5. MULTER CONFIGURATION
========================= */

/* Configure Multer's file count and individual file-size limits. */
const upload=multer({
    storage,

    limits:{
        fileSize:MAX_PORTFOLIO_IMAGE_SIZE,
        files:MAX_PORTFOLIO_IMAGES
    }
});


/* =========================
   6. CREATE SERVICE
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

    /* Process portfolio images after authentication succeeds. */
    (req,res,next)=>{
        upload.array(
            "portfolioPhotos",
            MAX_PORTFOLIO_IMAGES
        )(req,res,error=>{

            /* Handle Multer-specific upload errors. */
            if(error instanceof multer.MulterError){

                /* An individual original image exceeds 15 MiB. */
                if(error.code==="LIMIT_FILE_SIZE"){
                    return res.status(400).json({
                        success:false,
                        message:"Each portfolio image must be 15 MB or smaller."
                    });
                }

                /* More than 3 portfolio images were submitted. */
                if(
                    error.code==="LIMIT_FILE_COUNT"||
                    error.code==="LIMIT_UNEXPECTED_FILE"
                ){
                    return res.status(400).json({
                        success:false,
                        message:"You can upload a maximum of 3 portfolio images."
                    });
                }

                /* Handle other Multer errors. */
                return res.status(400).json({
                    success:false,
                    message:"There was a problem processing your portfolio images."
                });
            }

            /* Handle other upload errors. */
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

            /* Continue to the controller if uploading succeeds. */
            next();
        });
    },

    /* Validate service details, compress images, and save the service. */
    createWorkerService
);


/* =========================
   7. EXPORT ROUTER
========================= */

/* Export this router so server.js can mount it. */
module.exports=router;