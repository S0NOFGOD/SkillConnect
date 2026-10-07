const Worker=require("../models/worker");
const Client=require("../models/client");


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

const getAdminDashboard=async(req,res)=>{
try{

    const totalWorkers=await Worker.countDocuments();

    const totalClients=await Client.countDocuments();

    const verifiedWorkers=await Worker.countDocuments({
        phoneVerificationExpires:{
            $gt:new Date()
        }
    });

    const workers=await Worker.find(
        {},
        {
            services:1,
            contacts:1
        }
    ).lean();

    let totalServices=0;
    let totalRating=0;

    const uniqueClientIds=new Set();

    workers.forEach(worker=>{

        totalServices+=worker.services?.length||0;

        worker.services?.forEach(service=>{
            totalRating+=service.ratingAndReview?.length||0;
        });

        worker.contacts?.forEach(contact=>{
            if(contact.clientId){
                uniqueClientIds.add(
                    contact.clientId.toString()
                );
            }
        });

    });

    const totalContact=uniqueClientIds.size;

    return res.status(200).json({
        success:true,
        totalWorkers,
        totalClients,
        verifiedWorkers,
        totalServices,
        totalContact,
        totalRating
    });

}catch(error){

    console.error(
        "Admin dashboard error:",
        error
    );

    return res.status(500).json({
        success:false,
        message:"Unable to load dashboard data."
    });

}
};

module.exports={
    getAdminDashboard
};