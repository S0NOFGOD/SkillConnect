const Worker=require("../models/worker");

const {v2:cloudinary}=require("cloudinary");


/* =========================================================
   CLOUDINARY CONFIGURATION
========================================================= */

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});


/* =========================================================
   FIND WORKER SERVICE
========================================================= */

const findWorkerService=async(workerId,serviceId)=>{

    if(!workerId||!serviceId){
        return {
            error:"Worker ID and service ID are required."
        };
    }

    if(!/^\d+$/.test(String(serviceId))){
        return {
            error:"Invalid service ID."
        };
    }

    const worker=await Worker.findById(workerId);

    if(!worker){
        return {
            error:"Worker not found."
        };
    }

    const service=worker.services.find(
        item=>item.id===Number(serviceId)
    );

    if(!service){
        return {
            error:"Service not found."
        };
    }

    return {
        worker,
        service
    };

};


/* =========================================================
   CONVERT PORTFOLIO IDS TO IMAGE URLS
========================================================= */

const getPortfolioUrl=publicId=>{

    if(!publicId)return null;

    if(
        publicId.startsWith("https://")||
        publicId.startsWith("http://")
    ){
        return publicId;
    }

    return cloudinary.url(publicId,{
        secure:true
    });

};


/* =========================================================
   GET ADMIN VIEW SERVICE
========================================================= */

const getAdminViewService=async(req,res)=>{

    try{

        const {
            workerId
        }=req.query;

        const {
            serviceId
        }=req.params;

        const result=await findWorkerService(
            workerId,
            serviceId
        );

        if(result.error){

            const statusCode=
                result.error==="Worker not found."||
                result.error==="Service not found."
                    ?404
                    :400;

            return res.status(statusCode).json({
                success:false,
                message:result.error
            });

        }

        const {
            service
        }=result;

        const portfolios=(service.portfolios||[])
            .map(getPortfolioUrl)
            .filter(Boolean);

        return res.status(200).json({

            success:true,

            service:{
                id:service.id,
                skill:service.skill,
                experience:service.experience,
                description:service.description,
                portfolios,
                date:service.date
            }

        });

    }catch(error){

        console.error(
            "Get admin view service error:",
            error
        );

        return res.status(500).json({
            success:false,
            message:"Unable to load service. Please try again."
        });

    }

};


/* =========================================================
   APPROVE SERVICE
========================================================= */

const approveAdminViewService=async(req,res)=>{

    try{

        const {
            workerId,
            adminResponse
        }=req.body;

        const result=await findWorkerService(
            workerId,
            req.params.serviceId
        );

        if(result.error){

            const statusCode=
                result.error==="Worker not found."||
                result.error==="Service not found."
                    ?404
                    :400;

            return res.status(statusCode).json({
                success:false,
                message:result.error
            });

        }

        const {
            worker,
            service
        }=result;

        service.adminApproval="approved";

        service.adminResponse=
            typeof adminResponse==="string"
                ?adminResponse.trim()
                :"";

        worker.markModified("services");

        await worker.save();

        return res.status(200).json({

            success:true,

            message:"Service approved successfully."

        });

    }catch(error){

        console.error(
            "Approve admin service error:",
            error
        );

        return res.status(500).json({
            success:false,
            message:"Unable to approve service. Please try again."
        });

    }

};


/* =========================================================
   REJECT SERVICE
========================================================= */

const rejectAdminViewService=async(req,res)=>{

    try{

        const {
            workerId,
            adminResponse
        }=req.body;

        if(
            typeof adminResponse!=="string"||
            !adminResponse.trim()
        ){

            return res.status(400).json({
                success:false,
                message:"Please provide a reason for rejecting this service."
            });

        }

        const result=await findWorkerService(
            workerId,
            req.params.serviceId
        );

        if(result.error){

            const statusCode=
                result.error==="Worker not found."||
                result.error==="Service not found."
                    ?404
                    :400;

            return res.status(statusCode).json({
                success:false,
                message:result.error
            });

        }

        const {
            worker,
            service
        }=result;

        service.adminApproval="rejected";

        service.adminResponse=adminResponse.trim();

        worker.markModified("services");

        await worker.save();

        return res.status(200).json({

            success:true,

            message:"Service rejected successfully."

        });

    }catch(error){

        console.error(
            "Reject admin service error:",
            error
        );

        return res.status(500).json({
            success:false,
            message:"Unable to reject service. Please try again."
        });

    }

};


/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports={
    getAdminViewService,
    approveAdminViewService,
    rejectAdminViewService
};