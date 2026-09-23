const{Readable}=require("stream");
const jwt=require("jsonwebtoken");
const Worker=require("../models/worker");

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

function countWords(text){if(!text||!text.trim())return 0;return text.trim().split(/\s+/).length}
function findWorkerService(worker,serviceId){return worker.services.find(service=>String(service.id)===String(serviceId))}

function uploadImageToCloudinary(fileBuffer,workerId){
    return new Promise((resolve,reject)=>{
        const uploadStream=cloudinary.uploader.upload_stream(
            {folder:`skillconnect/workers/${workerId}/services`,resource_type:"image"},
            (error,result)=>{
                if(error)return reject(error);
                if(!result||!result.public_id)return reject(new Error("Cloudinary did not return a public_id."));
                resolve({public_id:result.public_id});
            }
        );
        Readable.from(fileBuffer).pipe(uploadStream);
    });
}

async function deleteCloudinaryImage(publicId){
    if(!publicId)return;
    try{await cloudinary.uploader.destroy(publicId,{resource_type:"image"})}
    catch(error){console.error("Cloudinary image deletion failed:",error)}
}

function getCloudinaryImageUrl(publicId){
    if(!publicId)return null;
    return cloudinary.url(publicId,{resource_type:"image",secure:true});
}

async function getWorkerService(req,res){
    try{
        const authorization=req.headers.authorization;

        if(!authorization||!authorization.startsWith("Bearer "))
            return res.status(401).json({success:false,message:"Authentication required. Please log in again."});

        const accessToken=authorization.split(" ")[1];

        if(!accessToken)
            return res.status(401).json({success:false,message:"Authentication required. Please log in again."});

        let decodedToken;

        try{decodedToken=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET)}
        catch(error){return res.status(401).json({success:false,message:"Your access token is invalid or expired."})}

        const workerId=decodedToken.userId||decodedToken.id;

        if(decodedToken.userType!=="worker"||!workerId)
            return res.status(403).json({success:false,message:"You are not authorized to view this service."});

        const worker=await Worker.findById(workerId);

        if(!worker)
            return res.status(404).json({success:false,message:"Worker account could not be found."});

        if(worker.accountStatus!=="active")
            return res.status(403).json({success:false,message:"Your worker account is not active."});

        const service=findWorkerService(worker,req.params.serviceId);

        if(!service)
            return res.status(404).json({success:false,message:"Service not found."});

        return res.status(200).json({
            success:true,
            service:{
                id:service.id,
                skill:service.skill,
                experience:service.experience,
                description:service.description,
                portfolios:(service.portfolios||[]).map(getCloudinaryImageUrl),
                date:service.date
            }
        });
    }catch(error){
        console.error("Get worker service error:",error);
        return res.status(500).json({success:false,message:"An error occurred while loading your service."});
    }
}

async function updateWorkerService(req,res){
    const uploadedPublicIds=[];

    try{
        const authorization=req.headers.authorization;

        if(!authorization||!authorization.startsWith("Bearer "))
            return res.status(401).json({success:false,message:"Authentication required. Please log in again."});

        const accessToken=authorization.split(" ")[1];

        if(!accessToken)
            return res.status(401).json({success:false,message:"Authentication required. Please log in again."});

        let decodedToken;

        try{decodedToken=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET)}
        catch(error){return res.status(401).json({success:false,message:"Your access token is invalid or expired."})}

        const workerId=decodedToken.userId||decodedToken.id;

        if(decodedToken.userType!=="worker"||!workerId)
            return res.status(403).json({success:false,message:"You are not authorized to update this service."});

        const worker=await Worker.findById(workerId);

        if(!worker)
            return res.status(404).json({success:false,message:"Worker account could not be found."});

        if(worker.accountStatus!=="active")
            return res.status(403).json({success:false,message:"Your worker account is not active."});

        const service=findWorkerService(worker,req.params.serviceId);

        if(!service)
            return res.status(404).json({success:false,message:"Service not found."});

        const skill=typeof req.body.skill==="string"?req.body.skill.trim():"";
        const experience=typeof req.body.experience==="string"?req.body.experience.trim():"";
        const description=typeof req.body.description==="string"?req.body.description.trim():"";

        if(!skill)return res.status(400).json({success:false,message:"Please select a skill."});
        if(!LOCAL_SKILLS.includes(skill))return res.status(400).json({success:false,message:"The selected skill is not valid."});
        if(!experience)return res.status(400).json({success:false,message:"Please select your experience."});
        if(!EXPERIENCE_OPTIONS.includes(experience))return res.status(400).json({success:false,message:"The selected experience is not valid."});
        if(!description)return res.status(400).json({success:false,message:"Please enter a service description."});

        if(countWords(description)>MAX_DESCRIPTION_WORDS)
            return res.status(400).json({success:false,message:"The service description cannot exceed 150 words."});

        const files=req.files||{};
        const portfolioFiles=[
            files.portfolioPhoto1?.[0]||null,
            files.portfolioPhoto2?.[0]||null,
            files.portfolioPhoto3?.[0]||null
        ];

        for(const file of portfolioFiles){
            if(!file)continue;
            if(!file.mimetype||!file.mimetype.startsWith("image/"))
                return res.status(400).json({success:false,message:"Only image files can be uploaded."});
            if(file.size>MAX_PORTFOLIO_IMAGE_SIZE)
                return res.status(400).json({success:false,message:"Each portfolio image must not be larger than 5 MB."});
            if(!file.buffer||!Buffer.isBuffer(file.buffer))
                return res.status(400).json({success:false,message:"One or more portfolio images could not be processed."});
        }

        service.skill=skill;
        service.experience=experience;
        service.description=description;

        const currentPortfolios=[...(service.portfolios||[])];

        for(let index=0;index<MAX_PORTFOLIO_IMAGES;index++){
            const file=portfolioFiles[index];
            if(!file)continue;

            const uploadedImage=await uploadImageToCloudinary(file.buffer,worker._id.toString());
            const newPublicId=uploadedImage.public_id;

            uploadedPublicIds.push(newPublicId);

            if(currentPortfolios[index])
                await deleteCloudinaryImage(currentPortfolios[index]);

            currentPortfolios[index]=newPublicId;
        }

        service.portfolios=currentPortfolios.filter(Boolean);
        await worker.save();

        uploadedPublicIds.length=0;

        return res.status(200).json({success:true,message:"Service updated successfully."});
    }catch(error){
        await Promise.all(uploadedPublicIds.map(publicId=>deleteCloudinaryImage(publicId)));
        console.error("Update worker service error:",error);
        return res.status(500).json({success:false,message:"An error occurred while updating your service. Please try again."});
    }
}

async function deleteWorkerService(req,res){
    try{
        const authorization=req.headers.authorization;

        if(!authorization||!authorization.startsWith("Bearer "))
            return res.status(401).json({success:false,message:"Authentication required. Please log in again."});

        const accessToken=authorization.split(" ")[1];

        if(!accessToken)
            return res.status(401).json({success:false,message:"Authentication required. Please log in again."});

        let decodedToken;

        try{decodedToken=jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET)}
        catch(error){return res.status(401).json({success:false,message:"Your access token is invalid or expired."})}

        const workerId=decodedToken.userId||decodedToken.id;

        if(decodedToken.userType!=="worker"||!workerId)
            return res.status(403).json({success:false,message:"You are not authorized to delete this service."});

        const worker=await Worker.findById(workerId);

        if(!worker)
            return res.status(404).json({success:false,message:"Worker account could not be found."});

        if(worker.accountStatus!=="active")
            return res.status(403).json({success:false,message:"Your worker account is not active."});

        const service=findWorkerService(worker,req.params.serviceId);

        if(!service)
            return res.status(404).json({success:false,message:"Service not found."});

        if(Array.isArray(service.portfolios))
            for(const publicId of service.portfolios)
                await deleteCloudinaryImage(publicId);

        worker.services=worker.services.filter(existingService=>String(existingService.id)!==String(req.params.serviceId));

        const stillHasSkill=worker.services.some(existingService=>existingService.skill===service.skill);

        if(!stillHasSkill&&Array.isArray(worker.skills))
            worker.skills=worker.skills.filter(existingSkill=>existingSkill!==service.skill);

        await worker.save();

        return res.status(200).json({success:true,message:"Service deleted successfully."});
    }catch(error){
        console.error("Delete worker service error:",error);
        return res.status(500).json({success:false,message:"An error occurred while deleting your service. Please try again."});
    }
}

module.exports={getWorkerService,updateWorkerService,deleteWorkerService};