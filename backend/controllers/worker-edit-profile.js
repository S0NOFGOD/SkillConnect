"use strict";

const jwt=require("jsonwebtoken");
const multer=require("multer");
const sharp=require("sharp");
const Worker=require("../models/worker");
const {v2:cloudinary}=require("cloudinary");

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

/* =========================================================
   1. PHOTO UPLOAD CONFIGURATION
========================================================= */

const MAX_PHOTO_SIZE=10*1024*1024;
const MAX_OPTIMIZED_SIZE=5*1024*1024;
const ALLOWED_PHOTO_TYPES=["image/jpeg","image/png","image/webp"];

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{fileSize:MAX_PHOTO_SIZE},
    fileFilter(req,file,callback){
        if(!ALLOWED_PHOTO_TYPES.includes(file.mimetype)){
            const error=new Error("Profile photo must be a JPG, PNG, or WebP image.");
            error.code="INVALID_PHOTO_TYPE";
            return callback(error);
        }
        callback(null,true);
    }
}).single("profilePhoto");

/* =========================================================
   2. AUTHENTICATION
========================================================= */

async function authenticate(req){
    const token=req.cookies?.accessToken;
    if(!token)return null;

    try{
        const decoded=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        if(decoded.userType!=="worker"||!decoded.userId)return null;
        return await Worker.findById(decoded.userId);
    }catch{
        return null;
    }
}

/* =========================================================
   3. PHONE
========================================================= */

function normalizePhone(phone){
    let value=String(phone||"").trim().replace(/[\s()-]/g,"");

    if(value.startsWith("+234"))value="0"+value.slice(4);
    else if(value.startsWith("234"))value="0"+value.slice(3);

    return value;
}

function isValidPhone(phone){
    return /^0[789]\d{9}$/.test(phone);
}

/* =========================================================
   4. FULL NAME
========================================================= */

function normalizeNamePart(name){
    return name.toLowerCase().split(/([-'])/).map(part=>{
        if(part==="-"||part==="'")return part;
        return part.charAt(0).toUpperCase()+part.slice(1);
    }).join("");
}

function normalizeFullName(value){
    const parts=String(value||"").trim().replace(/\s+/g," ").split(" ");
    const pattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

    if(parts.length!==2||!parts.every(part=>pattern.test(part)))return null;
    return parts.map(normalizeNamePart).join(" ");
}

/* =========================================================
   5. VALIDATION
========================================================= */

function validatePhoto(file){
    if(!file)return null;

    if(!ALLOWED_PHOTO_TYPES.includes(file.mimetype)){
        return "Profile photo must be a JPG, PNG, or WebP image.";
    }

    if(file.size>MAX_PHOTO_SIZE){
        return "Profile photo must not exceed 10 MB.";
    }

    return null;
}

function validateCoordinates(latitude,longitude){
    if(latitude===undefined||latitude===null||String(latitude).trim()===""){
        return "Latitude is required.";
    }

    if(longitude===undefined||longitude===null||String(longitude).trim()===""){
        return "Longitude is required.";
    }

    if(!Number.isFinite(latitude)||latitude<-90||latitude>90){
        return "Please provide a valid latitude.";
    }

    if(!Number.isFinite(longitude)||longitude<-180||longitude>180){
        return "Please provide a valid longitude.";
    }

    return null;
}

function validateProfile({fullName,phone,latitude,longitude}){
    if(!fullName)return "Please enter exactly two names separated by a space.";
    if(!isValidPhone(phone))return "Please provide a valid Nigerian phone number.";
    return validateCoordinates(latitude,longitude);
}

/* =========================================================
   6. WORKER RESPONSE
========================================================= */

function workerResponse(worker){
    return{
        profilePhoto:worker.profilePhoto
            ?cloudinary.url(worker.profilePhoto,{secure:true})
            :null,
        fullName:worker.fullName,
        phone:worker.phone,
        latitude:worker.latitude,
        longitude:worker.longitude
    };
}

/* =========================================================
   7. GET PROFILE
========================================================= */

async function getProfile(req,res){
    try{
        const worker=await authenticate(req);

        if(!worker){
            return res.status(401).json({
                success:false,
                message:"Your authentication session has expired. Please log in again."
            });
        }

        return res.status(200).json({
            success:true,
            worker:workerResponse(worker)
        });

    }catch(error){
        console.error("Get worker edit profile error:",error);
        return res.status(500).json({
            success:false,
            message:"Unable to load your profile."
        });
    }
}

/* =========================================================
   8. UPLOAD MIDDLEWARE PROMISE
========================================================= */

function processUpload(req,res){
    return new Promise((resolve,reject)=>{
        upload(req,res,error=>{
            if(error)return reject(error);
            resolve();
        });
    });
}

/* =========================================================
   9. SHARP PHOTO OPTIMIZATION + CLOUDINARY UPLOAD
========================================================= */

async function uploadProfilePhoto(file){
    let optimizedBuffer;
    let quality=85;

    do{
        optimizedBuffer=await sharp(file.buffer)
            .rotate()
            .resize({
                width:1600,
                height:1600,
                fit:"inside",
                withoutEnlargement:true
            })
            .webp({quality,effort:5})
            .toBuffer();

        quality-=10;

    }while(optimizedBuffer.length>MAX_OPTIMIZED_SIZE&&quality>=45);

    if(optimizedBuffer.length>MAX_OPTIMIZED_SIZE){
        throw new Error("Your optimized profile photo exceeds 5 MB. Please upload a smaller image.");
    }

    const result=await new Promise((resolve,reject)=>{
        const stream=cloudinary.uploader.upload_stream({
            folder:"skillconnect/workers/profile-photos",
            resource_type:"image",
            format:"webp"
        },(error,uploadResult)=>{
            if(error)return reject(error);
            resolve(uploadResult);
        });

        stream.end(optimizedBuffer);
    });

    return result.public_id;
}

/* =========================================================
   10. UPDATE PROFILE
========================================================= */

async function updateProfile(req,res){
    let newPhotoPublicId=null;

    try{
        /* AUTHENTICATE BEFORE PROCESSING REQUEST */

        const worker=await authenticate(req);

        if(!worker){
            return res.status(401).json({
                success:false,
                message:"Your authentication session has expired. Please log in again."
            });
        }

        /* PROCESS MULTIPART REQUEST */

        try{
            await processUpload(req,res);
        }catch(error){
            const isSizeError=error instanceof multer.MulterError&&error.code==="LIMIT_FILE_SIZE";
            const isTypeError=error.code==="INVALID_PHOTO_TYPE";

            return res.status(isSizeError||isTypeError?400:500).json({
                success:false,
                message:isSizeError
                    ?"Profile photo must not exceed 10 MB."
                    :isTypeError
                        ?error.message
                        :"Unable to process your profile photo."
            });
        }

        /* READ REQUEST DATA */

        const fullName=normalizeFullName(req.body.fullName);
        const phone=normalizePhone(req.body.phone);
        const latitude=Number(req.body.latitude);
        const longitude=Number(req.body.longitude);

        /* VALIDATE PHOTO */

        const photoError=validatePhoto(req.file);

        if(photoError){
            return res.status(400).json({
                success:false,
                message:photoError
            });
        }

        /* VALIDATE PROFILE */

        const validationError=validateProfile({fullName,phone,latitude,longitude});

        if(validationError){
            return res.status(400).json({
                success:false,
                message:validationError
            });
        }

        /* CHECK PHONE UNIQUENESS ONLY IF PHONE CHANGED */

        const phoneChanged=normalizePhone(worker.phone)!==phone;

        if(phoneChanged){
            const existingWorkers=await Worker.find({
                _id:{$ne:worker._id},
                phone:{
                    $in:[
                        phone,
                        "234"+phone.slice(1),
                        "+234"+phone.slice(1)
                    ]
                }
            }).select("_id");

            if(existingWorkers.length){
                return res.status(409).json({
                    success:false,
                    message:"This phone number is already registered."
                });
            }
        }

        /* RETRIEVE OLD PROFILE PHOTO */

        const oldPhotoPublicId=worker.profilePhoto;

        /* UPLOAD OPTIMIZED NEW PROFILE PHOTO */

        if(req.file){
            newPhotoPublicId=await uploadProfilePhoto(req.file);
        }

        /* SAVE PROFILE */

        worker.fullName=fullName;
        worker.phone=phone;
        worker.latitude=latitude;
        worker.longitude=longitude;

        if(newPhotoPublicId){
            worker.profilePhoto=newPhotoPublicId;
        }

        if(phoneChanged){
            worker.profileVerificationExpires=null;
        }

        await worker.save();

        /* DELETE OLD PHOTO AFTER SUCCESSFUL SAVE */

        if(newPhotoPublicId&&oldPhotoPublicId&&oldPhotoPublicId!==newPhotoPublicId){
            try{
                await cloudinary.uploader.destroy(oldPhotoPublicId,{
                    resource_type:"image"
                });
            }catch(error){
                console.error("Old Cloudinary photo deletion error:",error);
            }
        }

        /* SUCCESS RESPONSE */

        return res.status(200).json({
            success:true,
            message:"Your profile was updated successfully.",
            worker:workerResponse(worker)
        });

    }catch(error){
        console.error("Update worker profile error:",error);

        /* CLEAN UP NEW PHOTO IF DATABASE UPDATE FAILS */

        if(newPhotoPublicId){
            try{
                await cloudinary.uploader.destroy(newPhotoPublicId,{
                    resource_type:"image"
                });
            }catch(cleanupError){
                console.error("Cloudinary cleanup error:",cleanupError);
            }
        }

        return res.status(500).json({
            success:false,
            message:error.message==="Your optimized profile photo exceeds 5 MB. Please upload a smaller image."
                ?error.message
                :"Unable to update your profile."
        });
    }
}

/* =========================================================
   11. EXPORT CONTROLLERS
========================================================= */

module.exports={
    getProfile,
    updateProfile
};