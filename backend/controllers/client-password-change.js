const Client=require("../models/client");
const bcrypt=require("bcryptjs");

const clientPasswordChange=async(req,res)=>{
    try{
        const {email,newPassword}=req.body;

        if(!email||!newPassword){
            return res.status(400).json({
                success:false,
                message:"Email and new password are required."
            });
        }

        const client=await Client.findOne({email:email.toLowerCase().trim()});

        if(!client){
            return res.status(404).json({
                success:false,
                message:"Client account was not found."
            });
        }

        if(
            !client.resetAuthorizationExpires||
            client.resetAuthorizationExpires<=new Date()
        ){
            return res.status(401).json({
                success:false,
                message:"Your password reset authorization has expired. Please start the password reset process again.",
                redirect:true
            });
        }

        if(newPassword.length<8){
            return res.status(400).json({
                success:false,
                message:"Password must be at least 8 characters."
            });
        }

        client.passwordHash=await bcrypt.hash(newPassword,12);
        client.resetAuthorizationExpires=null;

        await client.save();

        return res.status(200).json({
            success:true,
            message:"Your password has been changed successfully."
        });

    }catch(error){
        console.error("Client password change error:",error);

        return res.status(500).json({
            success:false,
            message:"An error occurred while changing your password."
        });
    }
};

module.exports=clientPasswordChange;