const Worker=require("../models/worker");
const bcrypt=require("bcryptjs");

const changeWorkerPassword=async(req,res)=>{
try{

    const{
        email,
        newPassword,
        confirmPassword
    }=req.body;

    if(
        !email||
        !newPassword||
        !confirmPassword
    ){
        return res.status(400).json({
            success:false,
            message:"Email, new password and confirm password are required."
        });
    }

    if(newPassword.length<8){
        return res.status(400).json({
            success:false,
            message:"Password must contain at least 8 characters."
        });
    }

    if(newPassword!==confirmPassword){
        return res.status(400).json({
            success:false,
            message:"The new password and confirmation password must be the same."
        });
    }

    const worker=await Worker.findOne({
    email:email.toLowerCase().trim()
    }).select("+resetAuthorizationExpires");

    if(!worker){
        return res.status(404).json({
            success:false,
            message:"Worker account was not found."
        });
    }

    if(
        !worker.resetAuthorizationExpires||
        worker.resetAuthorizationExpires<new Date()
    ){
        return res.status(401).json({
            success:false,
            message:"Your password reset authorization has expired. Please restart the password reset process."
        });
    }

    const hashedPassword=await bcrypt.hash(
        newPassword,
        12
    );

    worker.passwordHash=hashedPassword;
    worker.resetAuthorizationExpires=null;

    await worker.save();

    return res.status(200).json({
        success:true,
        message:"Your password has been changed successfully. You can now log in with your new password."
    });

}catch(error){

    console.error(
        "Worker password change error:",
        error
    );

    return res.status(500).json({
        success:false,
        message:"Something went wrong while changing your password. Please try again."
    });
}

};

module.exports={
changeWorkerPassword
};