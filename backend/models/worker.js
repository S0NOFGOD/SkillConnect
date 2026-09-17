/* =========================================================
   1. IMPORT MONGOOSE
========================================================= */

const mongoose = require("mongoose");


/* =========================================================
   2. CREATE WORKER SCHEMA
========================================================= */

const workerSchema = new mongoose.Schema(

    {

        /* =================================================
           3. WORKER EMAIL
        ================================================= */

        email: {

            type: String,

            required: true,

            unique: true,

            lowercase: true,

            trim: true,

            index: true

        },


        /* =================================================
           4. PASSWORD
        ================================================= */

        passwordHash: {

            type: String,

            default: null,

            select: false

        },


        /* =================================================
           5. GOOGLE ACCOUNT ID
        ================================================= */

        googleId: {

            type: String,

            unique: true,

            sparse: true,

            default: null,

            index: true,

            select: false

        },


        /* =================================================
           6. AUTHENTICATION METHOD
        ================================================= */

        authenticationMethod: {

            type: String,

            enum: [

                "password",

                "google",

                "both"

            ],

            default: "password",

            required: true

        },


        /* =================================================
           7. ACCOUNT STATUS
        ================================================= */

        accountStatus: {

            type: String,

            enum: [

                "active",

                "suspended"

            ],

            default: "active",

            required: true

        },


        /* =================================================
           8. EMAIL VERIFICATION
        ================================================= */

        isEmailVerified: {

            type: Boolean,

            default: false,

            required: true

        },


        /* =================================================
           9. EMAIL OTP
        ================================================= */

        emailOtp: {

            type: String,

            default: null,

            select: false

        },


        /* =================================================
           10. EMAIL OTP EXPIRATION
        ================================================= */

        emailOtpExpires: {

            type: Date,

            default: null,

            select: false

        },


        /* =================================================
           11. PHONE OTP
        ================================================= */

        phoneOtp: {

            type: String,

            default: null,

            select: false

        },


        /* =================================================
           12. PHONE OTP EXPIRATION
        ================================================= */

        phoneOtpExpires: {

            type: Date,

            default: null,

            select: false

        },


        /* =================================================
           14. PHONE VERIFICATION EXPIRATION
        ================================================= */

        phoneVerificationExpires: {

            type: Date,

            default: null

        },


        /* =================================================
           15. FULL NAME
        ================================================= */

        fullName: {

            type: String,

            trim: true,

            default: null

        },


        /* =================================================
           16. PROFILE PHOTO
        ================================================= */

        profilePhoto: {

            type: String,

            trim: true,

            default: null

        },


        /* =================================================
           17. PHONE NUMBER
        ================================================= */

        phone: {

            type: String,

            trim: true,

            unique: true,

            sparse: true,

            default: null

        },


        /* =================================================
           18. COUNTRY
        ================================================= */

        country: {

            type: String,

            trim: true,

            default: null

        },


        /* =================================================
           19. STATE
        ================================================= */

        state: {

            type: String,

            trim: true,

            default: null,

            index: true

        },


        /* =================================================
           20. CITY
        ================================================= */

        city: {

            type: String,

            trim: true,

            default: null,

            index: true

        },


        /* =================================================
           21. LOCAL GOVERNMENT AREA
        ================================================= */

        lga: {

            type: String,

            trim: true,

            default: null,

            index: true

        },


        /* =================================================
           22. SKILLS
        ================================================= */

        skills: {

            type: [

                {

                    type: String,

                    trim: true

                }

            ],

            default: []

        },


        /* =================================================
           23. EXPERIENCE
        ================================================= */

        experience: {

            type: String,

            trim: true,

            default: null

        },


        /* =================================================
           24. SOCIAL PROFILE
        ================================================= */

        socialProfile: {

            type: String,

            trim: true,

            default: null

        },


        /* =================================================
           25. SERVICE DESCRIPTION
        ================================================= */

        description: {

            type: String,

            trim: true,

            default: null

        },


        /* =================================================
           28. PROFILE COMPLETION
        ================================================= */

        profileCompleted: {

            type: Boolean,

            default: false,

            required: true

        },


        /* =================================================
           29. REFRESH TOKEN HASH
        ================================================= */

        refreshTokenHash: {

            type: String,

            default: null,

            select: false

        },


        /* =================================================
           30. GOOGLE EXCHANGE CODE
        ================================================= */

        googleExchangeCode: {

            type: String,

            default: null,

            select: false

        },


        /* =================================================
           31. GOOGLE EXCHANGE CODE EXPIRATION
        ================================================= */

        googleExchangeCodeExpires: {

            type: Date,

            default: null,

            select: false

        },


        /* =================================================
           32. PASSWORD RESET OTP
        ================================================= */

        passwordResetOtp: {

            type: String,

            default: null,

            select: false

        },


        /* =================================================
           33. PASSWORD RESET OTP EXPIRATION
        ================================================= */

        passwordResetOtpExpires: {

            type: Date,

            default: null,

            select: false

        },


        /* =================================================
           34. PASSWORD RESET VERIFICATION
        ================================================= */

        passwordResetVerified: {

            type: Boolean,

            default: false

        },


        /* =================================================
           35. PASSWORD RESET VERIFIED AT
        ================================================= */

        passwordResetVerifiedAt: {

            type: Date,

            default: null

        },


        /* =================================================
           36. PASSWORD RESET AUTHORIZATION
        ================================================= */

        resetAuthorization: {

            type: String,

            default: null,

            select: false

        },


        /* =================================================
           37. PASSWORD RESET AUTHORIZATION EXPIRATION
        ================================================= */

        resetAuthorizationExpires: {

            type: Date,

            default: null,

            select: false

        }

    },


    /* =================================================
       38. SCHEMA OPTIONS
    ================================================= */

    {

        timestamps: true

    }

);


/* =========================================================
   41. EXPORT MODEL
========================================================= */

const Worker =
    mongoose.models.Worker ||
    mongoose.model(
        "Worker",
        workerSchema
    );


module.exports = Worker;