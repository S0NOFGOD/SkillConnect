/* =========================================================
   SKILLCONNECT WORKER CREATE PROFILE CONTROLLER
========================================================= */

const Worker=require("../models/worker");

const{v2:cloudinary}=require("cloudinary");
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

/* =========================================================
   CREATE WORKER PROFILE
========================================================= */

const createWorkerProfile=async(req,res)=>{
    let uploadedPublicId=null;

    try{
        const{email,fullName,phone,country,state,city,lga}=req.body;

        if(!email||typeof email!=="string"){
            return res.status(400).json({
                success:false,
                code:"EMAIL_REQUIRED",
                message:"Worker email is required."
            });
        }

        const normalizedEmail=email.trim().toLowerCase();

        const worker=await Worker.findOne({email:normalizedEmail});

        if(!worker){
            return res.status(404).json({
                success:false,
                code:"WORKER_NOT_FOUND",
                message:"Worker account could not be found."
            });
        }

        if(worker.isEmailVerified!==true){
            return res.status(403).json({
                success:false,
                code:"EMAIL_NOT_VERIFIED",
                message:"Please verify your email address before completing your profile."
            });
        }

        if(worker.accountStatus&&worker.accountStatus.toLowerCase()==="suspended"){
            return res.status(403).json({
                success:false,
                code:"ACCOUNT_SUSPENDED",
                message:"Your worker account is currently suspended."
            });
        }

        if(!req.file){
            return res.status(400).json({
                success:false,
                code:"PROFILE_PHOTO_REQUIRED",
                message:"Profile photo is required."
            });
        }

        const allowedImageTypes=["image/jpeg","image/png","image/webp"];

        if(!allowedImageTypes.includes(req.file.mimetype)){
            return res.status(400).json({
                success:false,
                code:"INVALID_PROFILE_PHOTO",
                message:"Profile photo must be a JPG, PNG, or WebP image."
            });
        }

        const maximumFileSize=5*1024*1024;

        if(req.file.size>maximumFileSize){
            return res.status(400).json({
                success:false,
                code:"PROFILE_PHOTO_TOO_LARGE",
                message:"Profile photo must not exceed 5 MB."
            });
        }

        const trimmedFullName=typeof fullName==="string"?fullName.trim():"";
        const trimmedPhone=typeof phone==="string"?phone.trim():"";
        const trimmedCountry=typeof country==="string"?country.trim():"";
        const trimmedState=typeof state==="string"?state.trim():"";
        const trimmedCity=typeof city==="string"?city.trim():"";
        const trimmedLga=typeof lga==="string"?lga.trim():"";
        const trimmedLocation=typeof location==="string"?location.trim():"";

        if(!trimmedFullName){
            return res.status(400).json({
                success:false,
                code:"FULL_NAME_REQUIRED",
                message:"Full name is required."
            });
        }

        if(trimmedFullName.length<2){
            return res.status(400).json({
                success:false,
                code:"INVALID_FULL_NAME",
                message:"Full name must contain at least 2 characters."
            });
        }

        if(!trimmedPhone){
            return res.status(400).json({
                success:false,
                code:"PHONE_REQUIRED",
                message:"Phone number is required."
            });
        }

        if(!/^\+234[789]\d{9}$/.test(trimmedPhone)){
            return res.status(400).json({
                success:false,
                code:"INVALID_PHONE",
                message:"Please provide a valid Nigerian phone number in the format +234XXXXXXXXXX."
            });
        }

        if(!trimmedCountry){
            return res.status(400).json({
                success:false,
                code:"COUNTRY_REQUIRED",
                message:"Country is required."
            });
        }

        if(!trimmedState){
            return res.status(400).json({
                success:false,
                code:"STATE_REQUIRED",
                message:"State is required."
            });
        }

        if(!trimmedCity){
            return res.status(400).json({
                success:false,
                code:"CITY_REQUIRED",
                message:"City is required."
            });
        }

        if(!trimmedLga){
            return res.status(400).json({
                success:false,
                code:"LGA_REQUIRED",
                message:"Local Government Area is required."
            });
        }

        const existingPhoneWorker=await Worker.findOne({
            phone:trimmedPhone,
            _id:{$ne:worker._id}
        });

        if(existingPhoneWorker){
            return res.status(409).json({
                success:false,
                code:"PHONE_ALREADY_EXISTS",
                message:"This phone number is already registered to another worker."
            });
        }

        const cloudinaryUpload=()=>{
            return new Promise((resolve,reject)=>{
                const uploadStream=cloudinary.uploader.upload_stream(
                    {
                        folder:"skillconnect/workers/profile-photos",
                        resource_type:"image"
                    },
                    (error,result)=>{
                        if(error){
                            reject(error);
                            return;
                        }
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
        };

        const uploadedImage=await cloudinaryUpload();
        const profilePhotoPublicId=uploadedImage.public_id;
        uploadedPublicId=profilePhotoPublicId;

        worker.fullName=trimmedFullName;
        worker.profilePhoto=profilePhotoPublicId
        worker.phone=trimmedPhone;
        worker.country=trimmedCountry;
        worker.state=trimmedState;
        worker.city=trimmedCity;
        worker.lga=trimmedLga;
        worker.profileCompleted=true;

        await worker.save();

        return res.status(200).json({
            success:true,
            code:"PROFILE_COMPLETED",
            message:"Your worker profile has been completed successfully."
        });

    }catch(error){
        if(uploadedPublicId){
            try{
                await cloudinary.uploader.destroy(
                    uploadedPublicId,
                    {resource_type:"image"}
                );
            }catch(cleanupError){
                console.error("Cloudinary cleanup failed:",cleanupError);
            }
        }

        if(error.http_code&&error.message){
            console.error("Cloudinary profile photo upload error:",error);
            return res.status(500).json({
                success:false,
                code:"PROFILE_PHOTO_UPLOAD_FAILED",
                message:"Unable to upload your profile photo. Please try again."
            });
        }

        if(error.code===11000){
            return res.status(409).json({
                success:false,
                code:"DUPLICATE_VALUE",
                message:"Some of the information provided is already registered."
            });
        }

        if(error.name==="ValidationError"){
            const firstError=Object.values(error.errors)[0];
            return res.status(400).json({
                success:false,
                code:"VALIDATION_ERROR",
                message:firstError?.message||"The profile information provided is invalid."
            });
        }

        console.error("Create worker profile error:",error);

        return res.status(500).json({
            success:false,
            code:"SERVER_ERROR",
            message:"Unable to complete your worker profile at this time."
        });
    }
};

module.exports={createWorkerProfile};