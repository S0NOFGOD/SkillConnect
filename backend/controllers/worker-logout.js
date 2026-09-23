const jwt=require("jsonwebtoken");
const Worker=require("../models/worker");

const logoutWorker=async(req,res)=>{
    try{
        const authorization=req.headers.authorization;

        if(!authorization||!authorization.startsWith("Bearer ")){
            return res.status(401).json({
                success:false,
                message:"Worker authentication is required."
            });
        }

        const accessToken=authorization.substring(7);

        if(!accessToken){
            return res.status(401).json({
                success:false,
                message:"Worker authentication is required."
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
            decodedToken.userType!=="worker"||
            !decodedToken.userId
        ){
            return res.status(403).json({
                success:false,
                message:"Worker access is required."
            });
        }

        const worker=await Worker.findById(
            decodedToken.userId
        );

        if(!worker){
            return res.status(404).json({
                success:false,
                message:"Worker account was not found."
            });
        }

        worker.refreshTokenHash=null;

        await worker.save();

        res.clearCookie("refreshToken",{
            httpOnly:true,
            secure:process.env.NODE_ENV==="production",
            sameSite:process.env.NODE_ENV==="production"?"none":"lax",
            path:"/"
        });

        return res.status(200).json({
            success:true,
            message:"You have been logged out successfully."
        });

    }catch(error){
        console.error("Worker logout error:",error);

        return res.status(500).json({
            success:false,
            message:"An error occurred while logging out."
        });
    }
};

module.exports={
    logoutWorker
};