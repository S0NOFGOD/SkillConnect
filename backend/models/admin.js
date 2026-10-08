const mongoose=require("mongoose");

const adminSchema=new mongoose.Schema({

fullName:{
    type:String,
    required:true,
    trim:true
},

passwordHash:{
    type:String,
    required:true
},

accountType:{
    type:String,
    enum:["admin",null],
    default:null
},

refreshTokenHash:{
    type:String,
    default:null
}

},{timestamps:true});

module.exports=mongoose.model(
"Admin",
adminSchema
);