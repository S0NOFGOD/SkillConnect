/* =========================================================
   1. IMPORT MONGOOSE
========================================================= */

const mongoose =
    require("mongoose");


/* =========================================================
   2. CREATE WORKER SCHEMA
========================================================= */

/*
   A schema defines the fields that every Worker
   document can contain.
*/

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

            password: {

                type: String,

                required: true,

                minlength: 8

            },


            /* ==========================================
               5. ACCOUNT STATUS
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
               6. EMAIL VERIFICATION
            ========================================== */

            isEmailVerified: {

                type: Boolean,

                default: false,

                required: true

            },


            /* ==========================================
               7. EMAIL OTP
            ========================================== */

            emailOtp: {

                type: String,

                default: null

            },


            /* ==========================================
               8. EMAIL OTP EXPIRATION
            ========================================== */

            emailOtpExpires: {

                type: Date,

                default: null

            },


            /* ==========================================
               10. WORKER FULL NAME
            ========================================== */

            /*
               Stores the worker's full name.

               Example:

               "John Doe"
            */

            fullName: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               11. WORKER PHONE
            ========================================== */

            /*
               Stores the worker's phone number.

               The create-profile controller saves
               the normalized phone number here.
            */

            phone: {

                type: String,

                trim: true,

                unique: true,

                sparse: true

            },


            /* ==========================================
               12. PRIMARY SKILL
            ========================================== */

            /*
               Stores the worker's main professional skill.

               Example:

               "Electrician"
            */

            primarySkill: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               13. EXPERIENCE
            ========================================== */

            /*
               Stores the worker's experience.

               Example:

               "5 years"
            */

            experience: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               14. STARTING PRICE
            ========================================== */

            /*
               Stores the worker's starting service price.

               Example:

               "₦20,000"
            */

            startingPrice: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               15. STATE
            ========================================== */

            /*
               Stores the Nigerian state where the
               worker provides services.

               Example:

               "Oyo"
            */

            state: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               16. CITY
            ========================================== */

            /*
               Stores the worker's selected city.

               Example:

               "Ogbomoso"
            */

            city: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               17. SERVICE DESCRIPTION
            ========================================== */

            /*
               Stores the worker's description of
               their service.

               Example:

               "I provide professional electrical
               installation and repair services."
            */

            description: {

                type: String,

                trim: true,

                default: null

            },


            /* ==========================================
               18. PROFILE PICTURE
            ========================================== */

            /*
               Stores the Cloudinary URL of the
               worker's profile picture.

               Example:

               https://res.cloudinary.com/...
            */

            profilePicture: {

                type: String,

                default: null

            },


            /* ==========================================
               19. PORTFOLIO IMAGES
            ========================================== */

            /*
               Stores the worker's portfolio images.

               Each portfolio image contains:

               - url
               - publicId

               Example:

               portfolioImages: [

                   {
                       url: "...",
                       publicId: "..."
                   }

               ]
            */

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
               20. PROFILE COMPLETION
            ========================================== */

            /*
               Becomes true after the worker successfully
               completes the entire create-profile process.
            */

            profileCompleted: {

                type: Boolean,

                default: false,

                required: true

            },


            /* ==========================================
               21. REFRESH TOKEN HASH
            ========================================== */

            refreshTokenHash: {

                type: String,

                default: null

            },


            /* ==========================================
               22. PASSWORD RESET OTP
            ========================================== */

            /*
               Stores the temporary OTP used to verify
               a password-reset request.
            */

            passwordResetOtp: {

                type: String,

                default: null

            },


            /* ==========================================
               23. PASSWORD RESET OTP EXPIRATION
            ========================================== */

            /*
               Stores when the password-reset OTP expires.
            */

            passwordResetOtpExpires: {

                type: Date,

                default: null

            },


            /* ==========================================
               24. PASSWORD RESET VERIFICATION
            ========================================== */

            /*
               Becomes true after the worker successfully
               verifies the password-reset OTP.
            */

            passwordResetVerified: {

                type: Boolean,

                default: false

            },


            /* ==========================================
               25. PASSWORD RESET VERIFIED AT
            ========================================== */

            /*
               Stores when password-reset OTP verification
               was successfully completed.
            */

            passwordResetVerifiedAt: {

                type: Date,

                default: null

            },



            /* ==========================================
             WORKER VERIFICATION
            ========================================== */

            isVerified: {

               type: Boolean,

               default: false,

               required: true

            },


            /* ==========================================
               26. PASSWORD RESET AUTHORIZATION
            ========================================== */

            resetAuthorization: {

                type: String,

                default: null

            },


            /* ==========================================
               27. PASSWORD RESET AUTHORIZATION EXPIRATION
            ========================================== */

            resetAuthorizationExpires: {

                type: Date,

                default: null

            }

        },


        /* =================================================
           28. SCHEMA OPTIONS
        ================================================= */

        {

            timestamps: true

        }

    );


        /* =========================================================
        29. EXPORT WORKER MODEL
        ========================================================= */

        const Worker = mongoose.model("Worker", workerSchema);
        
        module.exports = Worker;