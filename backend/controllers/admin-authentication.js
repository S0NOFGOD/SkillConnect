const crypto=require("crypto");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcrypt");
const Admin=require("../models/admin");

const generateAccessToken=admin=>{
    return jwt.sign(
        {
            userId:admin._id,
            userType:"admin"
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRE
        }
    );
};

const generateRefreshToken=admin=>{
    return jwt.sign(
        {
            userId:admin._id,
            userType:"admin"
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRE
        }
    );
};

const hashToken=token=>{
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

const authenticateAdmin=async(req,res,next)=>{
    try{

        const accessToken=req.cookies?.accessToken;

        if(!accessToken){
            return res.status(401).json({
                success:false,
                message:"Authentication required."
            });
        }

        const decoded=jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );

        if(
            decoded.userType!=="admin"||
            !decoded.userId
        ){
            return res.status(401).json({
                success:false,
                message:"Invalid authentication token."
            });
        }

        const admin=await Admin.findById(decoded.userId);

        if(!admin){
            return res.status(401).json({
                success:false,
                message:"Admin account not found."
            });
        }

        req.admin=admin;

        next();

    }catch(error){

        console.error(
            "Admin authentication error:",
            error
        );

        return res.status(401).json({
            success:false,
            message:"Authentication required."
        });
    }
};


/* =========================================================
   ADMIN LOGIN
========================================================= */

const loginAdmin=async(req,res)=>{
    try{

        const {email,password}=req.body;

        if(!email||!password){
            return res.status(400).json({
                success:false,
                message:"Email and password are required."
            });
        }

        const normalizedEmail=email.trim().toLowerCase();

        const admin=await Admin.findOne({
            email:normalizedEmail
        });

        if(!admin){
            return res.status(401).json({
                success:false,
                message:"Invalid email or password."
            });
        }

        const passwordMatch=await bcrypt.compare(
            password,
            admin.passwordHash
        );

        if(!passwordMatch){
            return res.status(401).json({
                success:false,
                message:"Invalid email or password."
            });
        }

        const accessToken=generateAccessToken(admin);
        const refreshToken=generateRefreshToken(admin);

        admin.refreshTokenHash=hashToken(refreshToken);

        await admin.save();

        const isProduction=process.env.NODE_ENV==="production";

        res.cookie(
            "accessToken",
            accessToken,
            {
                httpOnly:true,
                secure:isProduction,
                sameSite:isProduction?"none":"lax",
                maxAge:15*60*1000,
                path:"/"
            }
        );

        res.cookie(
            "refreshToken",
            refreshToken,
            {
                httpOnly:true,
                secure:isProduction,
                sameSite:isProduction?"none":"lax",
                maxAge:7*24*60*60*1000,
                path:"/"
            }
        );

        return res.status(200).json({
            success:true,
            message:"Welcome back, Admin."
        });

    }catch(error){

        console.error(
            "Admin login error:",
            error
        );

        return res.status(500).json({
            success:false,
            message:"Unable to log in. Please try again."
        });
    }
};

module.exports={
    loginAdmin,
    authenticateAdmin
};