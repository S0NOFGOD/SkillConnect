const bcrypt=require("bcrypt");
const Admin=require("../models/admin");

const createAdmin=async()=>{
try{

const email=process.env.ADMIN_EMAIL;
const password=process.env.ADMIN_PASSWORD;

if(!email||!password){
    throw new Error(
        "ADMIN_EMAIL or ADMIN_PASSWORD is not configured."
    );
}

const normalizedEmail=email.trim().toLowerCase();

const existingAdmin=await Admin.findOne({
    email:normalizedEmail
});

if(existingAdmin){
    console.log(
        `Admin account already exists: ${normalizedEmail}`
    );
    return existingAdmin;
}

const passwordHash=await bcrypt.hash(
    password,
    12
);

const admin=await Admin.create({
    email:normalizedEmail,
    passwordHash
});

console.log(
    `Admin account created successfully: ${normalizedEmail}`
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