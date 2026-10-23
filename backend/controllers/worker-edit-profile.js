"use strict";

const jwt=require("jsonwebtoken");
const multer=require("multer");
const Worker=require("../models/worker");
const {v2:cloudinary}=require("cloudinary");

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

/* MULTIPART PHOTO HANDLING: CONTROLLER ONLY */
const MAX_PHOTO_SIZE=10*1024*1024;
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

/* AUTHENTICATION */
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

/* PHONE */
function normalizePhone(phone){
    let value=String(phone||"").trim().replace(/[\s()-]/g,"");

    if(value.startsWith("+234"))value=value.slice(1);
    else if(value.startsWith("0"))value="234"+value.slice(1);

    return value;
}

function isValidPhone(phone){
    return /^234[789]\d{9}$/.test(phone);
}

/* FULL NAME */
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

/* PHOTO VALIDATION */
function validatePhoto(file){
    if(!file)return null;

    if(!ALLOWED_PHOTO_TYPES.includes(file.mimetype))
        return"Profile photo must be a JPG, PNG, or WebP image.";

    if(file.size>MAX_PHOTO_SIZE)
        return"Profile photo must not exceed 10 MB.";

    return null;
}

/* PROFILE VALIDATION */
function validateProfile({fullName,phone,country,state,city,lga}){
    if(!fullName)
        return"Please enter exactly two names separated by a space.";

    if(!isValidPhone(phone))
        return"Please provide a valid Nigerian phone number.";

    if(!country)return"Country is required.";
    if(!state)return"State is required.";
    if(!city)return"City is required.";
    if(!lga)return"LGA is required.";

    return null;
}

/* WORKER RESPONSE */
function workerResponse(worker){
    return{
        profilePhoto:worker.profilePhoto
            ?cloudinary.url(worker.profilePhoto,{secure:true})
            :null,
        fullName:worker.fullName,
        phone:worker.phone,
        country:worker.country,
        state:worker.state,
        city:worker.city,
        lga:worker.lga
    };
}

/* LOAD PROFILE */
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

/* UPDATE PROFILE */
async function updateProfile(req,res){
    let uploadedPublicId=null;

    try{
        /* AUTHENTICATE BEFORE PROCESSING THE UPLOAD */
        const worker=await authenticate(req);

        if(!worker){
            return res.status(401).json({
                success:false,
                message:"Your authentication session has expired. Please log in again."
            });
        }

        /* PROCESS MULTIPART REQUEST INSIDE THE CONTROLLER */
        upload(req,res,async uploadError=>{
            if(uploadError){
                const isSizeError=uploadError instanceof multer.MulterError&&
                    uploadError.code==="LIMIT_FILE_SIZE";

                return res.status(isSizeError||uploadError.code==="INVALID_PHOTO_TYPE"?400:500).json({
                    success:false,
                    message:isSizeError
                        ?"Profile photo must not exceed 10 MB."
                        :uploadError.code==="INVALID_PHOTO_TYPE"
                            ?uploadError.message
                            :"Unable to process your profile photo."
                });
            }

            try{
                await processProfileUpdate(req,res,worker,id=>{
                    uploadedPublicId=id;
                });
            }catch(error){
                console.error("Update worker profile error:",error);

                if(uploadedPublicId){
                    try{
                        await cloudinary.uploader.destroy(uploadedPublicId,{
                            resource_type:"image"
                        });
                    }catch(cleanupError){
                        console.error("Cloudinary upload cleanup error:",cleanupError);
                    }
                }

                if(!res.headersSent){
                    return res.status(500).json({
                        success:false,
                        message:"Unable to update your profile."
                    });
                }
            }
        });
    }catch(error){
        console.error("Worker profile authentication error:",error);

        return res.status(500).json({
            success:false,
            message:"Unable to update your profile."
        });
    }
}

/* PROFILE UPDATE BUSINESS LOGIC */
async function processProfileUpdate(req,res,worker,setUploadedPublicId){
    const fullName=normalizeFullName(req.body.fullName);
    const phone=normalizePhone(req.body.phone);
    const country=String(req.body.country||"").trim();
    const state=String(req.body.state||"").trim();
    const city=String(req.body.city||"").trim();
    const lga=String(req.body.lga||"").trim();

    /* VALIDATE ALL FIELDS */
    const photoError=validatePhoto(req.file);

    if(photoError){
        return res.status(400).json({
            success:false,
            message:photoError
        });
    }

    const validationError=validateProfile({
        fullName,phone,country,state,city,lga
    });

    if(validationError){
        return res.status(400).json({
            success:false,
            message:validationError
        });
    }

    /* CHECK PHONE UNIQUENESS */
    const phoneChanged=normalizePhone(worker.phone)!==phone;

    const existingWorker=await Worker.findOne({
        phone,
        _id:{$ne:worker._id}
    });

    if(existingWorker){
        return res.status(409).json({
            success:false,
            message:"This phone number is already registered."
        });
    }

    /* UPLOAD AND OPTIMIZE PHOTO */
    const oldPhotoPublicId=worker.profilePhoto;
    let newPhotoPublicId=oldPhotoPublicId;

    if(req.file){
        const result=await new Promise((resolve,reject)=>{
            const stream=cloudinary.uploader.upload_stream({
                folder:"skillconnect/workers/profile-photos",
                resource_type:"image",
                transformation:[{
                    width:1600,
                    height:1600,
                    crop:"limit",
                    quality:"auto:eco",
                    fetch_format:"auto"
                }]
            },(error,uploadResult)=>{
                if(error)return reject(error);
                resolve(uploadResult);
            });

            stream.end(req.file.buffer);
        });

        newPhotoPublicId=result.public_id;
        setUploadedPublicId(newPhotoPublicId);
    }

    /* SAVE PROFILE */
    worker.fullName=fullName;
    worker.phone=phone;
    worker.country=country;
    worker.state=state;
    worker.city=city;
    worker.lga=lga;

    if(req.file)worker.profilePhoto=newPhotoPublicId;

    if(phoneChanged){
        worker.profileVerificationExpires=null;
    }

    await worker.save();

    /* REMOVE OLD PHOTO AFTER SUCCESSFUL SAVE */
    if(req.file&&oldPhotoPublicId&&oldPhotoPublicId!==newPhotoPublicId){
        try{
            await cloudinary.uploader.destroy(oldPhotoPublicId,{
                resource_type:"image"
            });
        }catch(error){
            console.error("Old Cloudinary photo deletion error:",error);
        }
    }

    return res.status(200).json({
        success:true,
        message:"Your profile was updated successfully.",
        worker:workerResponse(worker)
    });
}

module.exports={getProfile,updateProfile};