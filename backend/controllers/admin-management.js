const bcrypt=require("bcrypt");

const Admin=require("../models/admin");


/* =========================================================
NORMALIZE FULL NAME
========================================================= */

const normalizeFullName=fullName=>{

return fullName
.trim()
.toLowerCase()
.split(/\s+/)
.map(name=>
name.charAt(0).toUpperCase()+
name.slice(1)
)
.join(" ");

};


/* =========================================================
CHECK ADMIN ACCOUNT TYPE
========================================================= */

const checkAdminAccountType=(req,res)=>{

if(!req.admin){

    res.status(401).json({

        success:false,

        message:
            "Authentication required."

    });

    return false;

}


if(req.admin.accountType===null){

    res.status(403).json({

        success:false,

        message:
            "You are not authorized to manage administrator accounts."

    });

    return false;

}


if(req.admin.accountType!=="admin"){

    res.status(403).json({

        success:false,

        message:
            "You are not authorized to manage administrator accounts."

    });

    return false;

}


return true;

};


/* =========================================================
GET ALL ADMINS
========================================================= */

const getAdmins=async(req,res)=>{

try{

/*
The route already authenticates the
accessToken before this controller runs.
*/


/*
Retrieve only admin accounts where
accountType is null.
*/

const admins=
await Admin.find({
    accountType:null
})
.select(
"_id fullName"
)
.sort({
createdAt:1
});


if(admins.length===0){

return res.status(200).json({

success:true,

message:
"No admin accounts exist.",

admins:[]

});

}


const formattedAdmins=
admins.map(admin=>({

adminId:admin._id,

fullName:admin.fullName

}));


return res.status(200).json({

success:true,

admins:formattedAdmins

});


}catch(error){

console.error(
"Get admins error:",
error
);


return res.status(500).json({

success:false,

message:
"Unable to retrieve admin accounts."

});

}

};


/* =========================================================
CREATE ADMIN
========================================================= */

const createAdmin=async(req,res)=>{

try{


/* =========================
AUTHORIZATION
========================= */

if(!checkAdminAccountType(req,res)){

return;

}


/* =========================
GET DATA
========================= */

const {
fullName,
password
}=req.body;


/* =========================
VALIDATE DATA
========================= */

if(!fullName||!password){

return res.status(400).json({

success:false,

message:
"Full name and password are required."

});

}


const trimmedFullName=
String(fullName).trim();


if(!/^[A-Za-z]+ [A-Za-z]+$/.test(
trimmedFullName
)){

return res.status(400).json({

success:false,

message:
"Full name must contain exactly two names separated by a space."

});

}


if(password.length<8){

return res.status(400).json({

success:false,

message:
"Password must contain at least 8 characters."

});

}


/* =========================
NORMALIZE FULL NAME
========================= */

const normalizedFullName=
normalizeFullName(
trimmedFullName
);


/* =========================
HASH PASSWORD
========================= */

const passwordHash=
await bcrypt.hash(
password,
10
);


/* =========================
SAVE ADMIN
========================= */

const admin=
await Admin.create({

fullName:
normalizedFullName,

passwordHash,

/*
Newly created administrators
must start with accountType:null.
*/

accountType:null

});


/* =========================
SUCCESS
========================= */

return res.status(201).json({

success:true,

message:
"Admin account created successfully."

});


}catch(error){

console.error(
"Create admin error:",
error
);


return res.status(500).json({

success:false,

message:
"Unable to create admin account."

});

}

};


/* =========================================================
DELETE ADMIN
========================================================= */

const deleteAdmin=async(req,res)=>{

try{


/* =========================
AUTHORIZATION
========================= */

if(!checkAdminAccountType(req,res)){

return;

}


/* =========================
GET ADMIN ID
========================= */

const {
adminId
}=req.body;


/* =========================
VALIDATE ADMIN ID
========================= */

if(!adminId){

return res.status(400).json({

success:false,

message:
"Admin ID is required."

});

}


/* =========================
FIND ADMIN
========================= */

const admin=
await Admin.findById(
adminId
);


if(!admin){

return res.status(404).json({

success:false,

message:
"Admin account not found."

});

}


/* =========================
DELETE ADMIN
========================= */

await Admin.findByIdAndDelete(
adminId
);


/* =========================
SUCCESS
========================= */

return res.status(200).json({

success:true,

message:
"Admin account deleted successfully."

});


}catch(error){

console.error(
"Delete admin error:",
error
);


return res.status(500).json({

success:false,

message:
"Unable to delete admin account."

});

}

};


module.exports={

getAdmins,

createAdmin,

deleteAdmin

};