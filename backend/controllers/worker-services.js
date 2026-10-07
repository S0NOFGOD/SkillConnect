const Worker=require("../models/worker");

const getWorkerServices=async(req,res)=>{
try{
const workerId=req.workerId;

if(!workerId){
return res.status(401).json({
success:false,
message:"Worker authentication is required."
});
}

const worker=await Worker.findById(workerId).select("services");

if(!worker){
return res.status(404).json({
success:false,
message:"Worker account was not found."
});
}

if(
worker.services===null||
!Array.isArray(worker.services)||
worker.services.length===0
){
return res.status(200).json({
success:true,
services:null
});
}

const services=worker.services.map(service=>({
id:service.id,
skill:service.skill,
date:service.date,
adminApproval:service.adminApproval
}));

return res.status(200).json({
success:true,
services
});

}catch(error){
console.error(
"Get worker services error:",
error
);

return res.status(500).json({
success:false,
message:"Unable to load your services."
});
}
};

module.exports={
getWorkerServices
};