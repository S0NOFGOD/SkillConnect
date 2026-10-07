const jwt=require("jsonwebtoken");
const Worker=require("../models/worker");
const Client=require("../models/client");
const Admin=require("../models/admin");

const logout=async(req,res)=>{
try{
const accessToken=req.cookies?.accessToken;

if(!accessToken){
return res.status(401).json({
success:false,
message:"Authentication is required."
});
}

let decodedToken;

try{
decodedToken=jwt.verify(
accessToken,
process.env.ACCESS_TOKEN_SECRET
);
}catch(error){
return res.status(401).json({
success:false,
message:"Your authentication session is invalid or has expired."
});
}

if(
!decodedToken.userType||
!decodedToken.userId
){
return res.status(403).json({
success:false,
message:"Valid authentication is required."
});
}

let user;

if(decodedToken.userType==="worker"){
user=await Worker.findById(decodedToken.userId);
}else if(decodedToken.userType==="client"){
user=await Client.findById(decodedToken.userId);
}else if(decodedToken.userType==="admin"){
user=await Admin.findById(decodedToken.userId);
}else{
return res.status(403).json({
success:false,
message:"Invalid user type."
});
}

if(!user){
return res.status(404).json({
success:false,
message:"Account was not found."
});
}

user.refreshTokenHash=null;

await user.save();

const cookieOptions={
httpOnly:true,
secure:process.env.NODE_ENV==="production",
sameSite:process.env.NODE_ENV==="production"?"none":"lax",
path:"/"
};

res.clearCookie("refreshToken",cookieOptions);
res.clearCookie("accessToken",cookieOptions);

return res.status(200).json({
success:true,
message:"You have been logged out successfully."
});

}catch(error){
console.error("Logout error:",error);

return res.status(500).json({
success:false,
message:"An error occurred while logging out."
});
}
};

module.exports={
logout
};