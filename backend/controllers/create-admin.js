const bcrypt=require("bcrypt");

const Admin=require("../models/admin");


const createAdmin=async()=>{

try{

    const fullName=process.env.ADMIN_NAME;
    const password=process.env.ADMIN_PASSWORD;


    if(!fullName||!password){

        throw new Error(
            "ADMIN_NAME or ADMIN_PASSWORD is not configured."
        );

    }


    const existingAdmin=await Admin.findOne({
        accountType:"admin"
    });


    if(existingAdmin){

        console.log(
            `Admin account already exists: ${existingAdmin.fullName}`
        );

        return existingAdmin;

    }


    const passwordHash=await bcrypt.hash(
        password,
        12
    );


    const admin=await Admin.create({

        fullName:fullName.trim(),

        passwordHash,

        accountType:"admin"

    });


    console.log(
        `Admin account created successfully: ${admin.fullName}`
    );


    return admin;


}catch(error){

    console.error(
        "Create admin error:",
        error
    );

    throw error;

}

};


module.exports=createAdmin;