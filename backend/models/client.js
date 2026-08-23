/* =========================================================
   1. IMPORT MONGOOSE
========================================================= */

/*
   Mongoose allows us to define MongoDB schemas
   and interact with MongoDB.
*/

const mongoose =
    require("mongoose");



/* =========================================================
   2. CREATE CLIENT SCHEMA
========================================================= */

/*
   This schema contains the information required
   for the Client authentication and profile flows.
*/

const clientSchema =
    new mongoose.Schema(

        {

            /* =================================================
               2.1 CLIENT EMAIL
            ================================================= */

            /*
               The client's email address.

               This is also used to identify the client
               during the profile-completion process.
            */

            email: {

                type: String,

                required: true,

                unique: true,

                lowercase: true,

                trim: true,

                index: true

            },


            /* =================================================
               2.2 CLIENT PASSWORD
            ================================================= */

            /*
               The password stored here must be HASHED.

               Never store the user's plain-text password.
            */

            password: {

                type: String,

                required: true

            },


            /* =================================================
               2.3 CLIENT FULL NAME
            ================================================= */

            /*
               The client's full name.

               This is collected on the
               Client Create Profile page.
            */

            fullName: {

                type: String,

                trim: true,

                default: null

            },


            /* =================================================
               2.4 CLIENT COUNTRY
            ================================================= */

            /*
               The country selected by the client.

               Example:

                   Nigeria
            */

            country: {

                type: String,

                trim: true,

                default: null

            },


            /* =================================================
               2.5 CLIENT STATE
            ================================================= */

            /*
               The state selected by the client.

               Example:

                   Oyo
            */

            state: {

                type: String,

                trim: true,

                default: null

            },


            /* =================================================
               2.6 CLIENT CITY
            ================================================= */

            /*
               The city selected by the client.

               Example:

                   Ogbomoso
            */

            city: {

                type: String,

                trim: true,

                default: null

            },


            /* =================================================
               2.7 ACCOUNT STATUS
            ================================================= */

            /*
               Controls whether the client account
               can access the application.

               active:
                   Client can use the account.

               suspended:
                   Client cannot use the account.
            */

            accountStatus: {

                type: String,

                enum: [

                    "active",

                    "suspended"

                ],

                default: "active"

            },


            /* =================================================
               2.8 EMAIL VERIFICATION STATUS
            ================================================= */

            /*
               false:
                   Client has not verified their email.

               true:
                   Client has verified their email.
            */

            isEmailVerified: {

                type: Boolean,

                default: false

            },


            /* =================================================
               2.9 EMAIL OTP
            ================================================= */

            /*
               OTP generated for email verification.
            */

            emailOtp: {

                type: String,

                default: null

            },


            /* =================================================
               2.10 EMAIL OTP EXPIRY
            ================================================= */

            /*
               The date and time when the email OTP
               becomes invalid.
            */

            emailOtpExpires: {

                type: Date,

                default: null

            },


            /* =================================================
               2.11 PASSWORD RESET OTP
            ================================================= */

            /*
               OTP generated when the client uses
               Forgot Password.
            */

            passwordResetOtp: {

                type: String,

                default: null

            },


            /* =================================================
               2.12 PASSWORD RESET OTP EXPIRY
            ================================================= */

            /*
               Determines when the password-reset OTP
               becomes invalid.
            */

            passwordResetOtpExpires: {

                type: Date,

                default: null

            },


            /* =================================================
               2.13 RESET AUTHORIZATION
            ================================================= */

            resetAuthorization: {

                type: String,

                default: null

            },


            /* =================================================
               2.14 RESET AUTHORIZATION EXPIRY
            ================================================= */

            /*
               Determines when the reset authorization
               becomes invalid.
            */

            resetAuthorizationExpires: {

                type: Date,

                default: null

            },


            /* =================================================
               2.15 PROFILE COMPLETION STATUS
            ================================================= */

            /*
               false:
                   Client has not completed their profile.

               true:
                   Client has completed their profile.
            */

            profileCompleted: {

                type: Boolean,

                default: false

            },


            /* =================================================
               2.16 REFRESH TOKEN HASH
            ================================================= */

            /*
               The actual refresh token is NOT stored
               directly in this field.

               Backend flow:

                   Generate refresh token
                           ↓
                   Hash refresh token
                           ↓
                   Save hash here

               The actual refresh token is sent to the
               browser using an httpOnly cookie.
            */

            refreshTokenHash: {

                type: String,

                default: null

            }

        },



        /* =====================================================
           3. SCHEMA OPTIONS
        ===================================================== */

        {

            /*
               Mongoose automatically creates:

                   createdAt
                   updatedAt
            */

            timestamps: true

        }

    );



/* =========================================================
   4. EXPORT CLIENT MODEL
========================================================= */

/*
   Export the Client model so controllers can use it.

   MongoDB collection:

       clients
*/

module.exports =
    mongoose.model(
        "Client",
        clientSchema
    );