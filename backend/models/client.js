"use strict";

const mongoose=require("mongoose");

const otpAttemptsSchema=new mongoose.Schema({
    emailOtpResendCount:{
        type:Number,
        default:0,
        min:0
    },
    coolDownUntil:{
        type:Date,
        default:null
    }
},{_id:false});

const passwordResetAttemptsSchema=new mongoose.Schema({
    passwordResetOtpResendCount:{
        type:Number,
        default:0,
        min:0
    },
    coolDownUntil:{
        type:Date,
        default:null
    }
},{_id:false});

const clientSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },

    passwordHash:{
        type:String,
        default:null,
        select:false
    },

    googleId:{
        type:String,
        unique:true,
        sparse:true
    },

    accountType:{
        type:String,
        enum:["password","googleId"],
        required:true
    },

    emailVerified:{
        type:Boolean,
        default:false
    },

    profileCompleted:{
        type:Boolean,
        default:false
    },

    profilePhoto:{type:String},
    fullName:{type:String,trim:true},
    phone:{type:String,trim:true},
    country:{type:String,trim:true},
    state:{type:String,trim:true},
    city:{type:String,trim:true},
    lga:{type:String,trim:true},

    emailOtpHash:{
        type:String,
        default:null
    },

    emailOtpExpires:{
        type:Date,
        default:null
    },

    emailOtpResendAttempts:{
        type:otpAttemptsSchema,
        default:()=>({})
    },

    passwordResetOtpHash:{
        type:String,
        default:null
    },

    passwordResetOtpExpires:{
        type:Date,
        default:null
    },

    resetAuthorizationExpires:{
        type:Date,
        default:null
    },

    passwordResetOtpResendAttempts:{
        type:passwordResetAttemptsSchema,
        default:()=>({})
    },

    exchangeCode:{
        type:String,
        default:null
    },

    refreshTokenHash:{
        type:String,
        default:null,
        select:false
    }
});

module.exports=
    mongoose.models.Client||
    mongoose.model("Client",clientSchema);