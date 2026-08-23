/* =========================================================
   SKILLCONNECT CONTACT MODEL
   Defines the structure of contact messages in MongoDB.
========================================================= */


/* =========================================================
   IMPORT MONGOOSE
========================================================= */

const mongoose = require("mongoose");


/* =========================================================
   CONTACT SCHEMA
========================================================= */

/*
    A Mongoose Schema defines the structure of documents
    that will be stored inside MongoDB.

    Each contact message will contain:

    - name
    - email
    - message
    - createdAt
*/

const contactSchema = new mongoose.Schema(

    {

        /* =================================================
           NAME
        ================================================= */

        name: {

            type: String,

            required: true,

            trim: true,

            minlength: 2,

            maxlength: 100

        },


        /* =================================================
           EMAIL
        ================================================= */

        email: {

            type: String,

            required: true,

            trim: true,

            lowercase: true,

            maxlength: 150

        },


        /* =================================================
           MESSAGE
        ================================================= */

        message: {

            type: String,

            required: true,

            trim: true,

            minlength: 10,

            maxlength: 2000

        }

    },


    /* =====================================================
       SCHEMA OPTIONS
    ===================================================== */

    {

        /*
            Automatically create:

            createdAt
            updatedAt
        */

        timestamps: true

    }

);


/* =========================================================
   CONTACT MODEL
========================================================= */

/*
    The model allows our controller to create and retrieve
    Contact documents from MongoDB.

    MongoDB will use a collection based on the model name.

    Contact -> contacts
*/

const Contact = mongoose.model(
    "Contact",
    contactSchema
);


/* =========================================================
   EXPORT MODEL
========================================================= */

module.exports = Contact;