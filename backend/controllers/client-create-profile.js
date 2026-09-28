const {Readable}=require("stream");
const cloudinary=require("cloudinary").v2;
const Client=require("../models/client");

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const createClientProfile=async(req,res,next)=>{
    try{

        const email=String(req.body.email||"")
            .trim()
            .toLowerCase();

        const fullName=String(req.body.fullName||"")
            .trim()
            .replace(/\s+/g," ");

        const phone=String(req.body.phone||"")
            .trim()
            .replace(/\s+/g,"");

        const country=String(req.body.country||"").trim();
        const state=String(req.body.state||"").trim();
        const city=String(req.body.city||"").trim();
        const lga=String(req.body.lga||"").trim();

        /* FIND CLIENT */

        const client=await Client.findOne({email});

        if(!client){
            return res.status(404).json({
                success:false,
                message:"Client account not found. Please sign in again."
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

        /* VALIDATE PROFILE PHOTO */

        if(!req.file){
            return res.status(400).json({
                success:false,
                message:"Profile photo is required."
            });
        }

        if(
            !["image/jpeg","image/png","image/webp"]
            .includes(req.file.mimetype)
        ){
            return res.status(400).json({
                success:false,
                message:"Profile photo must be JPG, PNG, or WebP."
            });
        }

        if(req.file.size>5*1024*1024){
            return res.status(400).json({
                success:false,
                message:"Profile photo must not exceed 5 MB."
            });
        }

        /* VALIDATE FULL NAME */

        const nameParts=fullName.split(" ");

        const namePattern=
            /^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

        if(
            nameParts.length!==2||
            !namePattern.test(nameParts[0])||
            !namePattern.test(nameParts[1])
        ){
            return res.status(400).json({
                success:false,
                message:"Full name must contain exactly two valid names with a space between them."
            });
        }

        /* VALIDATE PHONE */

        if(!/^\+234[789]\d{9}$/.test(phone)){
            return res.status(400).json({
                success:false,
                message:"Please enter a valid Nigerian phone number."
            });
        }

        /* VALIDATE LOCATION */

        if(!country){
            return res.status(400).json({
                success:false,
                message:"Country is required."
            });
        }

        if(!state){
            return res.status(400).json({
                success:false,
                message:"State is required."
            });
        }

        if(!city){
            return res.status(400).json({
                success:false,
                message:"City is required."
            });
        }

        if(!lga){
            return res.status(400).json({
                success:false,
                message:"LGA is required."
            });
        }

        /* UPLOAD PROFILE PHOTO */

        const uploadResult=await new Promise((resolve,reject)=>{

            const uploadStream=cloudinary.uploader.upload_stream(
                {
                    folder:`skillconnect/clients/${client._id}`,
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

            Readable.from(req.file.buffer).pipe(uploadStream);

        });

        /* SAVE PROFILE */

        client.profilePhoto=uploadResult.public_id;
        client.fullName=fullName;
        client.phone=phone;
        client.country=country;
        client.state=state;
        client.city=city;
        client.lga=lga;
        client.profileCompleted=true;

        await client.save();

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
};

module.exports=createClientProfile;