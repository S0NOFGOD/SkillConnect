/* =========================
   1. IMPORTS
========================= */

const Worker=require("../models/worker");


/* =========================
   2. GET ADMIN WORKER SERVICES
========================= */

const getAdminWorkerServices=async(req,res)=>{
    try{

        const workers=await Worker.find(
            {
                "services.adminApproval":"in review"
            },
            {
                services:1
            }
        ).lean();


        const services=[];


        workers.forEach(worker=>{

            worker.services.forEach(service=>{

                if(service.adminApproval==="in review"){

                    services.push({
                        workerId:worker._id,
                        serviceId:service.id,
                        skill:service.skill,
                        date:service.date,
                        adminApproval:service.adminApproval
                    });

                }

            });

        });


        return res.status(200).json({
            success:true,
            services
        });

    }catch(error){

        console.error(
            "Get admin worker services error:",
            error
        );

        return res.status(500).json({
            success:false,
            message:"Unable to load worker services. Please try again."
        });

    }
};


module.exports={
    getAdminWorkerServices
};