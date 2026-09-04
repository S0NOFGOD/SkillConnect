/* =========================================================
   1. IMPORT MONGOOSE
========================================================= */

const mongoose =
    require("mongoose");



/* =========================================================
   2. CREATE WORKER SCHEMA
========================================================= */

const workerSchema =
    new mongoose.Schema(

        {

            /* ==========================================
               3. EMAIL
            ========================================== */

            email: {

                type: String,

                required: true,

                unique: true,

                lowercase: true,

                trim: true,

                index: true

            },


            /* ==========================================
               4. PASSWORD
            ========================================== */

            passwordHash: {

                type: String,

                default: null,

                select: false

            },


            /* ==========================================
               5. GOOGLE ID
            ========================================== */

            googleId: {

                type: String,

                unique: true,

                sparse: true,

                default: null,

                index: true,

                select: false

            },


            /* ==========================================
               6. AUTHENTICATION METHOD
            ========================================== */

            authenticationMethod: {

                type: String,

                enum: [

                    "password",

                    "google",

                    "both"

                ],

                required: true,

                default: "password"

            },


            /* ==========================================
               7. ACCOUNT STATUS
            ========================================== */

            accountStatus: {

                type: String,

                enum: [

                    "active",

                    "suspended"

                ],

                default: "active",

                required: true

            },


            /* ==========================================
               8. EMAIL VERIFICATION
            ========================================== */

            isEmailVerified: {

                type: Boolean,

                default: false,

                required: true

            },


            /* ==========================================
               9. EMAIL OTP
            ========================================== */

            emailOtp: {

                type: String,

                default: null,

                select: false

            },


            /* ==========================================
               10. EMAIL OTP EXPIRATION
            ========================================== */

            emailOtpExpires: {

                type: Date,

                default: null,

                select: false

            },


            /* ==========================================
               11. PHONE OTP
            ========================================== */

            phoneOtp: {

                type: String,

                default: null,

                select: false

            },


            /* ==========================================
               12. PHONE OTP EXPIRATION
            ========================================== */

            phoneOtpExpires: {

                type: Date,

                default: null,

                select: false

            },


            /* ==========================================
               13. PHONE VERIFICATION
            ========================================== */

            isPhoneVerified: {

                type: Boolean,

                default: false,

                required: true

            },


            /* ==========================================
               14. WORKER FULL NAME
            ========================================== */

            fullName: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               15. WORKER PHONE
            ========================================== */

            phone: {

                type: String,

                trim: true,

                unique: true,

                sparse: true,

            },


            /* ==========================================
               16. PRIMARY SKILL
            ========================================== */

            primarySkill: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               17. EXPERIENCE
            ========================================== */

            experience: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               18. STARTING PRICE
            ========================================== */

            startingPrice: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               19. STATE
            ========================================== */

            state: {

                type: String,

                trim: true,

                default: null,

                index: true

            },


            /* ==========================================
               20. CITY
            ========================================== */

            city: {

                type: String,

                trim: true,

                default: null,

                index: true

            },


            /* ==========================================
               21. SERVICE DESCRIPTION
            ========================================== */

            description: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               22. PROFILE PICTURE
            ========================================== */

            profilePicture: {

                type: String,

                default: null

            },


            /* ==========================================
               23. PORTFOLIO IMAGES
            ========================================== */

            portfolioImages: [

                {

                    url: {

                        type: String,

                        required: true

                    },

                    publicId: {

                        type: String,

                        required: true

                    }

                }

            ],


            /* ==========================================
               24. PROFILE COMPLETION
            ========================================== */

            profileCompleted: {

                type: Boolean,

                default: false,

                required: true

            },


            /* ==========================================
               25. REFRESH TOKEN HASH
            ========================================== */

            refreshTokenHash: {

                type: String,

                default: null,

                select: false

            },


            /* ==========================================
               26. GOOGLE EXCHANGE CODE
            ========================================== */

            googleExchangeCode: {

                type: String,

                default: null,

                select: false

            },


            /* ==========================================
               27. GOOGLE EXCHANGE CODE EXPIRATION
            ========================================== */

            googleExchangeCodeExpires: {

                type: Date,

                default: null,

                select: false

            },


            /* ==========================================
               28. PASSWORD RESET OTP
            ========================================== */

            passwordResetOtp: {

                type: String,

                default: null,

                select: false

            },


            /* ==========================================
               29. PASSWORD RESET OTP EXPIRATION
            ========================================== */

            passwordResetOtpExpires: {

                type: Date,

                default: null,

                select: false

            },


            /* ==========================================
               30. PASSWORD RESET VERIFICATION
            ========================================== */

            passwordResetVerified: {

                type: Boolean,

                default: false

            },


            /* ==========================================
               31. PASSWORD RESET VERIFIED AT
            ========================================== */

            passwordResetVerifiedAt: {

                type: Date,

                default: null

            },


            /* ==========================================
               32. PASSWORD RESET AUTHORIZATION
            ========================================== */

            resetAuthorization: {

                type: String,

                default: null,

                select: false

            },


            /* ==========================================
               33. PASSWORD RESET AUTHORIZATION EXPIRATION
            ========================================== */

            resetAuthorizationExpires: {

                type: Date,

                default: null,

                select: false

            }

        },


        /* =================================================
           34. SCHEMA OPTIONS
        ================================================= */

        {

            timestamps: true

        }

    );



/* =========================================================
   35. WORKER SEARCH INDEXES
========================================================= */

/*
   These indexes will help the future client worker
   search/filter functionality.
*/

workerSchema.index({

    primarySkill: 1,

    city: 1,

    state: 1

});



/* =========================================================
   36. EXPORT WORKER MODEL
========================================================= */

const Worker =
    mongoose.model(
        "Worker",
        workerSchema
    );


module.exports =
    Worker;