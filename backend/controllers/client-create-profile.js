"use strict";

const {Readable}=require("stream");
const multer=require("multer");
const crypto=require("crypto");
const jwt=require("jsonwebtoken");
const sharp=require("sharp");

const cloudinary=require("cloudinary").v2;
const Client=require("../models/client");


/* CLOUDINARY */

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});


/* MULTER */

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{
        fileSize:10*1024*1024
    },
    fileFilter:(req,file,cb)=>{

        if(["image/jpeg","image/png","image/webp"].includes(file.mimetype)){
            return cb(null,true);
        }

        cb(new Error("Profile photo must be JPG, PNG, or WebP."));

    }
}).single("profilePhoto");


/* NORMALIZE PHONE */

function normalizePhone(value){

    let phone=String(value||"").trim().replace(/[\s\-()]/g,"");

    if(phone.startsWith("+234")){
        phone="0"+phone.substring(4);
    }else if(phone.startsWith("234")){
        phone="0"+phone.substring(3);
    }

    return phone;

}


/* NORMALIZE NAME */

function normalizeFullName(value){

    const parts=String(value||"").trim().replace(/\s+/g," ").split(" ");
    const pattern=/^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

    if(parts.length!==2||!parts.every(part=>pattern.test(part))){
        return null;
    }

    return parts.map(name=>name.toLowerCase().split(/([-'])/).map(part=>{

        if(part==="-"||part==="'")return part;

        return part.charAt(0).toUpperCase()+part.slice(1);

    }).join("")).join(" ");

}


/* OPTIMIZE IMAGE */

async function optimizeImage(buffer){

    let width=1920;
    let height=1920;

    for(let attempt=0;attempt<8;attempt++){

        for(const quality of [85,75,65,55,45,35,25,15]){

            const optimized=await sharp(buffer)
                .rotate()
                .resize({
                    width,
                    height,
                    fit:"inside",
                    withoutEnlargement:true
                })
                .jpeg({
                    quality,
                    mozjpeg:true
                })
                .toBuffer();

            if(optimized.length<=5*1024*1024){
                return optimized;
            }

        }

        width=Math.floor(width*0.8);
        height=Math.floor(height*0.8);

    }

    throw new Error("Unable to optimize profile photo below 5 MB.");

}


/* CLOUDINARY UPLOAD */

function uploadProfilePhoto(buffer,clientId){

    return new Promise((resolve,reject)=>{

        const uploadStream=cloudinary.uploader.upload_stream(
            {
                folder:`skillconnect/clients/${clientId}`,
                resource_type:"image",
                format:"jpg"
            },
            (error,result)=>{

                if(error)return reject(error);

                resolve(result);

            }
        );

        Readable.from(buffer).pipe(uploadStream);

    });

}


/* GENERATE TOKENS */

function createTokens(client){

    const payload={
        userId:client._id.toString(),
        userType:"client"
    };

    const accessToken=jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRE||"15m"
        }
    );

    const refreshToken=jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRE||"7d"
        }
    );

    return{accessToken,refreshToken};

}


/* SET AUTH COOKIES */

function setAuthCookies(res,accessToken,refreshToken){

    const isProduction=process.env.NODE_ENV==="production";

    const options={
        httpOnly:true,
        secure:isProduction,
        sameSite:isProduction?"none":"lax",
        path:"/"
    };

    res.cookie("accessToken",accessToken,{
        ...options,
        maxAge:15*60*1000
    });

    res.cookie("refreshToken",refreshToken,{
        ...options,
        maxAge:7*24*60*60*1000
    });

}


/* CREATE CLIENT PROFILE */

const createClientProfile=(req,res,next)=>{

    upload(req,res,async multerError=>{

        if(multerError){

            const message=multerError.code==="LIMIT_FILE_SIZE"
                ?"Profile photo must not exceed 10 MB."
                :multerError.message;

            return res.status(400).json({
                success:false,
                message
            });

        }

        try{

            const email=String(req.body.email||"").trim().toLowerCase();
            const fullName=String(req.body.fullName||"").trim().replace(/\s+/g," ");
            const phone=normalizePhone(req.body.phone);

            const latitude=Number(req.body.latitude);
            const longitude=Number(req.body.longitude);


            /* VALIDATE EMAIL */

            if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){

                return res.status(400).json({
                    success:false,
                    message:"Please provide a valid email address."
                });

            }


            /* VALIDATE PROFILE PHOTO */

            if(!req.file){

                return res.status(400).json({
                    success:false,
                    message:"Please select a profile photo."
                });

            }

            if(!["image/jpeg","image/png","image/webp"].includes(req.file.mimetype)){

                return res.status(400).json({
                    success:false,
                    message:"Profile photo must be JPG, PNG, or WebP."
                });

            }


            /* VALIDATE FULL NAME */

            const normalizedFullName=normalizeFullName(fullName);

            if(!normalizedFullName){

                return res.status(400).json({
                    success:false,
                    message:"Full name must contain exactly two valid names with a space between them."
                });

            }


            /* VALIDATE PHONE */

            if(!/^0[789]\d{9}$/.test(phone)){

                return res.status(400).json({
                    success:false,
                    message:"Please enter a valid Nigerian phone number."
                });

            }


            /* VALIDATE LATITUDE */

            if(
                req.body.latitude===undefined||
                String(req.body.latitude).trim()===""||
                !Number.isFinite(latitude)||
                latitude<-90||
                latitude>90
            ){

                return res.status(400).json({
                    success:false,
                    message:"Please provide a valid latitude between -90 and 90."
                });

            }


            /* VALIDATE LONGITUDE */

            if(
                req.body.longitude===undefined||
                String(req.body.longitude).trim()===""||
                !Number.isFinite(longitude)||
                longitude<-180||
                longitude>180
            ){

                return res.status(400).json({
                    success:false,
                    message:"Please provide a valid longitude between -180 and 180."
                });

            }


            /* VALIDATE IMAGE READABILITY */

            let imageMetadata;

            try{

                imageMetadata=await sharp(req.file.buffer).metadata();

                if(!["jpeg","png","webp"].includes(imageMetadata.format)){
                    throw new Error("Unsupported image format.");
                }

            }catch{

                return res.status(400).json({
                    success:false,
                    message:"The selected image is corrupted or unreadable. Please upload another image."
                });

            }


            /* FIND CLIENT */

            const client=await Client.findOne({email});

            if(!client){

                return res.status(404).json({
                    success:false,
                    message:"Client account not found. Please sign in again."
                });

            }


            /* CHECK EMAIL VERIFICATION */

            if(!client.emailVerified){

                return res.status(403).json({
                    success:false,
                    message:"Your email address has not been verified. Please sign in again.",
                    redirectToLogin:true
                });

            }


            /* CHECK PHONE */

            const phoneExists=await Client.findOne({
                phone,
                _id:{$ne:client._id}
            });

            if(phoneExists){

                return res.status(409).json({
                    success:false,
                    message:"This phone number is already associated with another account."
                });

            }


            /* OPTIMIZE PROFILE PHOTO */

            let optimizedPhoto;

            try{

                optimizedPhoto=await optimizeImage(req.file.buffer);

            }catch(error){

                return res.status(400).json({
                    success:false,
                    message:"Unable to optimize your profile photo below 5 MB. Please upload another image."
                });

            }


            /* UPLOAD PROFILE PHOTO */

            const uploadResult=await uploadProfilePhoto(
                optimizedPhoto,
                client._id
            );


            /* SAVE PROFILE */

            client.profilePhoto=uploadResult.public_id;
            client.fullName=normalizedFullName;
            client.phone=phone;
            client.latitude=latitude;
            client.longitude=longitude;
            client.profileCompleted=true;


            /* GENERATE TOKENS */

            const {accessToken,refreshToken}=createTokens(client);


            /* HASH REFRESH TOKEN */

            client.refreshTokenHash=crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");


            /* SAVE CLIENT */

            await client.save();


            /* SET AUTH COOKIES */

            setAuthCookies(
                res,
                accessToken,
                refreshToken
            );


            /* SUCCESS */

            return res.status(200).json({
                success:true,
                message:"Your client profile has been completed successfully."
            });


        }catch(error){

            console.error(
                "Client profile creation failed:",
                error
            );

            return next(error);

        }

    });

};

module.exports=createClientProfile;