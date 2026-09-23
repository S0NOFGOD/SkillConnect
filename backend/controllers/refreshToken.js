const jwt=require("jsonwebtoken");
const crypto=require("crypto");
const Worker=require("../models/worker");
const Client=require("../models/client");

const hashRefreshToken=refreshToken=>crypto.createHash("sha256").update(refreshToken).digest("hex");

const generateAccessToken=({userId,userType})=>jwt.sign(
    {userId,userType},
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn:process.env.ACCESS_TOKEN_EXPIRE||"15m"}
);

const refreshAccessToken=async(req,res)=>{
    try{
        const refreshToken=req.cookies.refreshToken;

        if(!refreshToken){
            return res.status(401).json({
                success:false,
                message:"Refresh token not found."
            });
        }

        let decoded;

        try{
            decoded=jwt.verify(
                refreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );
        }catch(error){
            return res.status(401).json({
                success:false,
                message:"Invalid or expired refresh token."
            });
        }

        if(
            !decoded.userType||
            !["worker","client"].includes(decoded.userType)
        ){
            return res.status(401).json({
                success:false,
                message:"Invalid refresh token."
            });
        }

        if(!decoded.userId){
            return res.status(401).json({
                success:false,
                message:"Invalid refresh token."
            });
        }

        const refreshTokenHash=hashRefreshToken(refreshToken);

        let user;

        if(decoded.userType==="worker"){
            user=await Worker.findById(decoded.userId)
                .select("+refreshTokenHash");
        }else{
            user=await Client.findById(decoded.userId)
                .select("+refreshTokenHash");
        }

        if(!user){
            return res.status(401).json({
                success:false,
                message:"Invalid refresh token."
            });
        }

        if(
            !user.refreshTokenHash||
            user.refreshTokenHash!==refreshTokenHash
        ){
            return res.status(401).json({
                success:false,
                message:"Invalid refresh token."
            });
        }

        if(
            decoded.userType==="worker"&&
            user.accountStatus==="suspended"
        ){
            return res.status(403).json({
                success:false,
                message:"Your account has been suspended."
            });
        }

        const newAccessToken=generateAccessToken({
            userId:user._id.toString(),
            userType:decoded.userType
        });

        return res.status(200).json({
            success:true,
            accessToken:newAccessToken
        });

    }catch(error){
        console.error("Refresh access token error:",error);

        return res.status(500).json({
            success:false,
            message:"Unable to refresh access token."
        });
    }
};

module.exports={
    refreshAccessToken
};