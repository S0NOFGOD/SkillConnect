const jwt=require("jsonwebtoken");
const cloudinary=require("cloudinary").v2;
const Client=require("../models/client");

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const getClientDashboard=async(req,res)=>{

try{

const accessToken=req.cookies?.accessToken;

if(!accessToken){
return res.status(401).json({
success:false,
message:"Your authentication session is invalid or has expired. Please sign in again."
});
}

let decoded;

try{

decoded=jwt.verify(
accessToken,
process.env.ACCESS_TOKEN_SECRET
);

}catch(error){

return res.status(401).json({
success:false,
message:"Your authentication session is invalid or has expired. Please sign in again."
});

}

if(
decoded.userType!=="client"||
!decoded.userId
){

return res.status(401).json({
success:false,
message:"Your authentication session is invalid or has expired. Please sign in again."
});

}

const client=await Client.findById(decoded.userId);

if(!client){

return res.status(404).json({
success:false,
message:"Client account not found."
});

}

const profilePhoto=client.profilePhoto
?cloudinary.url(client.profilePhoto,{
secure:true,
resource_type:"image"
})
:null;

const firstName=client.fullName
?client.fullName.trim().split(/\s+/)[0]
:"Client";

return res.status(200).json({
success:true,
message:`Welcome back, ${firstName}.`,
client:{
fullName:client.fullName||null,
phone:client.phone||null,
country:client.country||null,
state:client.state||null,
city:client.city||null,
lga:client.lga||null,
profilePhoto,
profileCompleted:client.profileCompleted
}
});

}catch(error){

console.error(
"Client dashboard error:",
error
);

return res.status(500).json({
success:false,
message:"An internal server error occurred."
});

}

};

module.exports={
getClientDashboard
};