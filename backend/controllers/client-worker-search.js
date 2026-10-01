const jwt=require("jsonwebtoken");
const Client=require("../models/client");
const Worker=require("../models/worker");
const{v2:cloudinary}=require("cloudinary");

cloudinary.config({
cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
api_key:process.env.CLOUDINARY_API_KEY,
api_secret:process.env.CLOUDINARY_API_SECRET
});

const searchWorkers=async(req,res)=>{
try{

const accessToken=req.cookies?.accessToken;

if(!accessToken)
return res.status(401).json({
success:false,
message:"Authentication required."
});

let decoded;

try{
decoded=jwt.verify(
accessToken,
process.env.ACCESS_TOKEN_SECRET
);
}catch(error){
return res.status(401).json({
success:false,
message:"Your session has expired. Please log in again."
});
}

if(decoded.userType!=="client"||!decoded.userId)
return res.status(401).json({
success:false,
message:"Unauthorized."
});

const client=await Client.findById(decoded.userId).select(
"fullName phone country state city lga profileCompleted"
);

if(!client)
return res.status(401).json({
success:false,
message:"Client account not found."
});

if(!client.profileCompleted)
return res.status(400).json({
success:false,
message:"Please complete your client profile before searching for workers."
});

if(!client.lga)
return res.status(400).json({
success:false,
message:"Your location is not available. Please update your profile."
});

const workers=await Worker.find({
lga:client.lga
}).select(
"fullName profilePhoto phone country state city lga skills services"
).sort({fullName:1});

const workerData=workers.map(worker=>{

let profilePhoto=null;

if(worker.profilePhoto){
profilePhoto=cloudinary.url(worker.profilePhoto,{
secure:true
});
}

return{
id:worker._id,
profilePhoto,
fullName:worker.fullName,
phone:worker.phone,
country:worker.country,
state:worker.state,
city:worker.city,
lga:worker.lga,
skills:worker.skills||[],
services:(worker.services||[]).map(service=>({
skill:service.skill
}))
};

});

return res.status(200).json({
success:true,
message:workerData.length
?`Workers found near ${client.lga}.`
:`No workers are currently available in ${client.lga}.`,
client:{
fullName:client.fullName,
phone:client.phone,
country:client.country,
state:client.state,
city:client.city,
lga:client.lga
},
workers:workerData
});

}catch(error){

console.error("Client worker search error:",error);

return res.status(500).json({
success:false,
message:"Unable to find workers. Please try again."
});

}
};

module.exports={
searchWorkers
};