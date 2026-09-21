/* =========================================================
   WORKER MODEL
========================================================= */
const mongoose=require("mongoose");


/* =========================================================
   WORKER SCHEMA
========================================================= */
const workerSchema=new mongoose.Schema({
    // Account information.
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
        sparse:true,
        default:null,
        index:true,
        select:false
    },
    authenticationMethod:{
        type:String,
        enum:["password","google","both"],
        default:"password",
        required:true
    },
    accountStatus:{
        type:String,
        enum:["active","suspended"],
        default:"active",
        required:true
    },
    // Email verification.
    isEmailVerified:{
        type:Boolean,
        default:false,
        required:true
    },
    emailOtp:{
        type:String,
        default:null,
        select:false
    },
    emailOtpExpires:{
        type:Date,
        default:null,
        select:false
    },
    // Phone verification.
    phoneOtp:{
        type:String,
        default:null,
        select:false
    },
    phoneOtpExpires:{
        type:Date,
        default:null,
        select:false
    },
    phoneVerificationExpires:{
        type:Date,
        default:null
    },
    // Worker profile.
    fullName:{
        type:String,
        trim:true,
        default:null
    },
    // Stores the Cloudinary public_id, not the image URL.
    profilePhoto:{
        type:String,
        trim:true,
        default:null
    },
    phone:{
        type:String,
        trim:true,
        default:null
    },
    country:{
        type:String,
        trim:true,
        default:null
    },
    state:{
        type:String,
        trim:true,
        default:null,
        index:true
    },
    city:{
        type:String,
        trim:true,
        default:null,
        index:true
    },
    lga:{
        type:String,
        trim:true,
        default:null,
        index:true
    },
    // Worker skills.
    skills:[{
        type:String,
        trim:true
    }],

    // Worker services.
    services:[{
        id:{
            type:Number,
            required:true
        },
        skill:{
            type:String,
            trim:true,
            required:true
        },
        experience:{
            type:String,
            trim:true,
            default:null
        },
        description:{
            type:String,
            trim:true,
            default:null
        },
        portfolios:[{
            type:String,
            trim:true
        }],
        date:{
            type:Date,
            default:Date.now
        }
    }],
    profileCompleted:{
        type:Boolean,
        default:false,
        required:true
    },
    // Refresh-token session.
    refreshTokenHash:{
        type:String,
        default:null,
        select:false
    },
    // Google OAuth exchange.
    googleExchangeCode:{
        type:String,
        default:null,
        select:false
    },
    googleExchangeCodeExpires:{
        type:Date,
        default:null,
        select:false
    },
    // Password reset.
    passwordResetOtp:{
        type:String,
        default:null,
        select:false
    },
    passwordResetOtpExpires:{
        type:Date,
        default:null,
        select:false
    },
    passwordResetVerified:{
        type:Boolean,
        default:false
    },
    passwordResetVerifiedAt:{
        type:Date,
        default:null
    },
    resetAuthorization:{
        type:String,
        default:null,
        select:false
    },
    resetAuthorizationExpires:{
        type:Date,
        default:null,
        select:false
    }

},{
    timestamps:true
});

/* =========================================================
   EXPORT MODEL
========================================================= */
const Worker=
    mongoose.models.Worker||
    mongoose.model("Worker",workerSchema);

module.exports=Worker;