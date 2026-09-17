/* =========================================================
   1. IMPORT CLOUDINARY
========================================================= */

const {
    v2: cloudinary
} = require("cloudinary");


/* =========================================================
   2. CONFIGURE CLOUDINARY
========================================================= */

cloudinary.config({

    cloud_name:
        process.env.CLOUDINARY_CLOUD_NAME,

    api_key:
        process.env.CLOUDINARY_API_KEY,

    api_secret:
        process.env.CLOUDINARY_API_SECRET

});


/* =========================================================
   3. EXPORT CLOUDINARY
========================================================= */

module.exports =
    cloudinary;