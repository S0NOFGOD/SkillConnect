const express=require("express");

const {
authenticateAdmin
}=require("../controllers/admin-authentication");

const {
getAdmins,
createAdmin,
deleteAdmin
}=require("../controllers/admin-management");

const router=express.Router();

/* =========================
GET ALL ADMINS
========================= */

router.get(
"/admins",
authenticateAdmin,
getAdmins
);

/* =========================
CREATE ADMIN
========================= */

router.post(
"/create",
authenticateAdmin,
createAdmin
);

/* =========================
DELETE ADMIN
========================= */

router.delete(
"/delete",
authenticateAdmin,
deleteAdmin
);

module.exports=router;