const sharp=require("sharp");
const Worker=require("../models/worker");
const{authenticateWorker}=require("./worker-authentication");
const{v2:cloudinary}=require("cloudinary");

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const MAX_PORTFOLIO_IMAGE_SIZE=5*1024*1024;
const MAX_PORTFOLIO_IMAGES=3;
const MAX_DESCRIPTION_WORDS=150;

const LOCAL_SKILLS=["Swimming Instructor","Barber","Hairdresser","Makeup Artist","Tailor","Fashion Designer","Plumber","Electrician","Painter","Welder","Carpenter","Bricklayer","Cleaner","Laundry Service","Mechanic","Auto Electrician","Phone Repair","Computer Repair","Graphic Designer","Web Developer","Photographer","Videographer","Caterer","Baker","Cook","Event Planner","Interior Decorator","AC Technician","Generator Repair","POP Installer","Tiler","Furniture Maker","Driver","Tutor","Fitness Trainer","Other"];

const EXPERIENCE_OPTIONS=["Less than 1 year","1 year","2 years","3 years","4 years","5 years+"];

const countWords=text=>text.trim()?text.trim().split(/\s+/).length:0;

const findWorkerService=(worker,serviceId)=>
    worker.services.find(service=>String(service.id)===String(serviceId));

const getAuthenticatedWorkerId=req=>{
    const auth=authenticateWorker(req);

    if(!auth.valid){
        return{
            error:{
                status:auth.status,
                message:auth.message
            }
        };
    }

    return{workerId:auth.userId};
};

const uploadImageToCloudinary=buffer=>new Promise((resolve,reject)=>{
    const uploadStream=cloudinary.uploader.upload_stream(
        {
            folder:"skillconnect/workers/services",
            resource_type:"image"
        },
        (error,result)=>{
            if(error)return reject(error);

            if(!result?.public_id){
                return reject(new Error("Cloudinary did not return a public ID."));
            }

            resolve(result.public_id);
        }
    );

    uploadStream.end(buffer);
});

const deleteCloudinaryImage=async publicId=>{
    if(!publicId)return;

    const result=await cloudinary.uploader.destroy(
        publicId,
        {resource_type:"image"}
    );

    if(result.result!=="ok"&&result.result!=="not found"){
        throw new Error(`Cloudinary could not delete image: ${publicId}`);
    }
};

const getCloudinaryImageUrl=publicId=>{
    if(!publicId)return null;

    return cloudinary.url(publicId,{
        resource_type:"image",
        secure:true
    });
};

/* GET WORKER SERVICE */

async function getWorkerService(req,res){
    try{
        const auth=getAuthenticatedWorkerId(req);

        if(auth.error){
            return res.status(auth.error.status).json({
                success:false,
                message:auth.error.message
            });
        }

        const worker=await Worker.findById(auth.workerId);

        if(!worker){
            return res.status(404).json({
                success:false,
                message:"Worker account could not be found."
            });
        }

        const service=findWorkerService(worker,req.params.serviceId);

        if(!service){
            return res.status(404).json({
                success:false,
                message:"Service not found."
            });
        }

        return res.status(200).json({
            success:true,
            service:{
                id:service.id,
                skill:service.skill,
                experience:service.experience,
                description:service.description,
                portfolios:(service.portfolios||[]).map(getCloudinaryImageUrl),
                adminApproval:service.adminApproval,
                adminResponse:service.adminResponse,
                date:service.date
            }
        });
    }catch(error){
        console.error("Get worker service error:",error);

        return res.status(500).json({
            success:false,
            message:"An error occurred while loading your service."
        });
    }
}

/* UPDATE WORKER SERVICE */

async function updateWorkerService(req,res){
    const uploadedPublicIds=[];

    try{
        const auth=getAuthenticatedWorkerId(req);

        if(auth.error){
            return res.status(auth.error.status).json({
                success:false,
                message:auth.error.message
            });
        }

        const worker=await Worker.findById(auth.workerId);

        if(!worker){
            return res.status(404).json({
                success:false,
                message:"Worker account could not be found."
            });
        }

        const service=findWorkerService(worker,req.params.serviceId);

        if(!service){
            return res.status(404).json({
                success:false,
                message:"Service not found."
            });
        }

        const skill=typeof req.body.skill==="string"?req.body.skill.trim():"";
        const experience=typeof req.body.experience==="string"?req.body.experience.trim():"";
        const description=typeof req.body.description==="string"?req.body.description.trim():"";

        if(!skill){
            return res.status(400).json({success:false,message:"Please select a skill."});
        }

        if(!LOCAL_SKILLS.includes(skill)){
            return res.status(400).json({success:false,message:"The selected skill is not valid."});
        }

        if(worker.services.some(item=>item!==service&&item.skill===skill)){
            return res.status(400).json({
                success:false,
                message:"You have already added a service with this skill."
            });
        }

        if(!experience){
            return res.status(400).json({success:false,message:"Please select your experience."});
        }

        if(!EXPERIENCE_OPTIONS.includes(experience)){
            return res.status(400).json({success:false,message:"The selected experience is not valid."});
        }

        if(!description){
            return res.status(400).json({success:false,message:"Please enter a service description."});
        }

        if(countWords(description)>MAX_DESCRIPTION_WORDS){
            return res.status(400).json({
                success:false,
                message:"The service description cannot exceed 150 words."
            });
        }

        const files=Array.isArray(req.files)?req.files:[];
        const currentPortfolios=[...(service.portfolios||[])];

        if(currentPortfolios.length>MAX_PORTFOLIO_IMAGES){
            currentPortfolios.length=MAX_PORTFOLIO_IMAGES;
        }

        if(files.length>MAX_PORTFOLIO_IMAGES){
            return res.status(400).json({
                success:false,
                message:"You can upload a maximum of 3 portfolio images."
            });
        }

        /*
        The frontend can send portfolioIndexes alongside portfolioPhotos
        to identify the selected slots, using zero-based indexes: 0, 1, 2.
        If indexes are omitted, uploaded files fill slots from the beginning.
        */
        let indexes=req.body.portfolioIndexes;

        if(typeof indexes==="string"){
            indexes=[indexes];
        }

        if(Array.isArray(indexes)&&indexes.length!==files.length){
            return res.status(400).json({
                success:false,
                message:"Portfolio image information is invalid."
            });
        }

        const slots=files.map((file,index)=>{
            const slot=indexes?.length
                ?Number(indexes[index])
                :index;

            if(!Number.isInteger(slot)||slot<0||slot>=MAX_PORTFOLIO_IMAGES){
                throw new Error("Invalid portfolio image slot.");
            }

            return{file,slot};
        });

        if(new Set(slots.map(item=>item.slot)).size!==slots.length){
            return res.status(400).json({
                success:false,
                message:"A portfolio slot cannot be uploaded more than once."
            });
        }

        for(const{file}of slots){
            if(!file.buffer||!Buffer.isBuffer(file.buffer)){
                return res.status(400).json({
                    success:false,
                    message:"One or more portfolio images could not be processed."
                });
            }

            if(file.size>MAX_PORTFOLIO_IMAGE_SIZE){
                return res.status(400).json({
                    success:false,
                    message:"Each portfolio image must not be larger than 5 MB."
                });
            }

            if(!file.mimetype?.startsWith("image/")){
                return res.status(400).json({
                    success:false,
                    message:"Only image files can be uploaded."
                });
            }
        }

        const previousPublicIds=[];

        for(const{file,slot}of slots){
            const oldPublicId=currentPortfolios[slot];

            const compressedBuffer=await sharp(file.buffer)
                .rotate()
                .jpeg({quality:80})
                .toBuffer();

            const newPublicId=await uploadImageToCloudinary(compressedBuffer);

            uploadedPublicIds.push(newPublicId);

            currentPortfolios[slot]=newPublicId;

            if(oldPublicId){
                previousPublicIds.push(oldPublicId);
            }
        }

        service.skill=skill;
        service.experience=experience;
        service.description=description;
        service.portfolios=currentPortfolios.filter(Boolean);

        await worker.save();

        uploadedPublicIds.length=0;

        for(const publicId of previousPublicIds){
            try{
                await deleteCloudinaryImage(publicId);
            }catch(error){
                console.error("Old portfolio image cleanup failed:",error.message);
            }
        }

        return res.status(200).json({
            success:true,
            message:"Service updated successfully."
        });
    }catch(error){
        await Promise.all(
            uploadedPublicIds.map(async publicId=>{
                try{
                    await deleteCloudinaryImage(publicId);
                }catch(cleanupError){
                    console.error("New portfolio image cleanup failed:",cleanupError.message);
                }
            })
        );

        console.error("Update worker service error:",error);

        if(error.message==="Invalid portfolio image slot."){
            return res.status(400).json({
                success:false,
                message:"Portfolio image information is invalid."
            });
        }

        return res.status(500).json({
            success:false,
            message:"An error occurred while updating your service. Please try again."
        });
    }
}

/* DELETE WORKER SERVICE */

async function deleteWorkerService(req,res){
    try{
        const auth=getAuthenticatedWorkerId(req);

        if(auth.error){
            return res.status(auth.error.status).json({
                success:false,
                message:auth.error.message
            });
        }

        const worker=await Worker.findById(auth.workerId);

        if(!worker){
            return res.status(404).json({
                success:false,
                message:"Worker account could not be found."
            });
        }

        const service=findWorkerService(worker,req.params.serviceId);

        if(!service){
            return res.status(404).json({
                success:false,
                message:"Service not found."
            });
        }

        const publicIds=[...(service.portfolios||[])];

        worker.services=worker.services.filter(
            item=>String(item.id)!==String(req.params.serviceId)
        );

        const stillHasSkill=worker.services.some(
            item=>item.skill===service.skill
        );

        if(!stillHasSkill&&Array.isArray(worker.skills)){
            worker.skills=worker.skills.filter(
                existingSkill=>existingSkill!==service.skill
            );
        }

        await worker.save();

        for(const publicId of publicIds){
            try{
                await deleteCloudinaryImage(publicId);
            }catch(error){
                console.error("Deleted service image cleanup failed:",error.message);
            }
        }

        return res.status(200).json({
            success:true,
            message:"Service deleted successfully."
        });
    }catch(error){
        console.error("Delete worker service error:",error);

        return res.status(500).json({
            success:false,
            message:"An error occurred while deleting your service."
        });
    }
}

module.exports={
    getWorkerService,
    updateWorkerService,
    deleteWorkerService
};