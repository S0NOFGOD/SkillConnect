"use strict";

const mongoose=require("mongoose");

const clientSchema=new mongoose.Schema({
    email:{
        type:String,
        unique:true,
        sparse:true,
        lowercase:true,
        trim:true
    },

    passwordHash:{
        type:String,
        select:false
    },

    googleId:{
        type:String,
        unique:true,
        sparse:true
    },

    accountType:{
        type:String,
        enum:["password","googleId"]
    },

    emailVerified:{
        type:Boolean,
        default:false
    },

    profileCompleted:{
        type:Boolean,
        default:false
    },

    fullName:{
        type:String,
        trim:true
    },

    emailOtpHash:String,
    emailOtpExpires:Date,

    emailOtpResendAttempts:{
        emailOtpResendCount:{type:Number,default:0},
        coolDownUntil:{type:Date,default:null}
    },

    passwordResetOtpHash:String,
    passwordResetOtpExpires:Date,

    passwordResetOtpResendAttempts:{
        passwordResetOtpResendCount:{type:Number,default:0},
        coolDownUntil:{type:Date,default:null}
    },

    refreshTokenHash:{
        type:String,
        select:false
    },

    ipAddress:{
        type:String,
        trim:true
    },

    latitude:{
        type:Number,
        min:-90,
        max:90
    },

    longitude:{
        type:Number,
        min:-180,
        max:180
    }
},{timestamps:true});

module.exports=mongoose.model("Client",clientSchema);