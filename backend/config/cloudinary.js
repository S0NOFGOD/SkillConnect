/* =========================================================
   SKILLCONNECT CLOUDINARY CONFIGURATION

   This file configures Cloudinary for SkillConnect.

   Cloudinary will be used to store:

   1. Worker profile photos
   2. Worker portfolio images

   IMPORTANT:

   Cloudinary credentials are stored inside .env.

   We NEVER hard-code Cloudinary credentials
   directly inside this file.
========================================================= */


/* =========================================================
   LOAD ENVIRONMENT VARIABLES
========================================================= */

/*
    dotenv loads values from:

        backend/.env

    Examples:

        CLOUDINARY_CLOUD_NAME
        CLOUDINARY_API_KEY
        CLOUDINARY_API_SECRET
*/

require("dotenv").config();


/* =========================================================
   IMPORT CLOUDINARY
========================================================= */

/*
    Import the Cloudinary package.

    The package was installed earlier with:

        npm install cloudinary
*/

const {
    v2: cloudinary
} = require("cloudinary");


/* =========================================================
   CONFIGURE CLOUDINARY
========================================================= */

/*
    Configure Cloudinary using the credentials
    stored inside our .env file.
*/

cloudinary.config({

    /*
        Cloudinary cloud name.
    */

    cloud_name:
        process.env.CLOUDINARY_CLOUD_NAME,


    /*
        Cloudinary API key.
    */

    api_key:
        process.env.CLOUDINARY_API_KEY,


    /*
        Cloudinary API secret.

        This value must NEVER be exposed
        to frontend JavaScript.
    */

    api_secret:
        process.env.CLOUDINARY_API_SECRET

});


/* =========================================================
   EXPORT CLOUDINARY
========================================================= */

/*
    Other backend files can now use Cloudinary.

    Example:

        const cloudinary =
            require("../config/cloudinary");

    The worker-create-profile controller
    will use this configuration to upload:

        - Profile photo
        - Portfolio 1
        - Portfolio 2
        - Portfolio 3
*/

module.exports =
    cloudinary;