/* =========================================================
   SKILLCONNECT DATABASE CONFIGURATION

   This file controls:

   1. Loading environment variables
   2. Connecting the application to MongoDB
   3. Handling database connection errors
   4. Exporting the database connection function

   DATABASE:
   MongoDB Atlas
========================================================= */


/* =========================================================
   1. IMPORT MONGOOSE
========================================================= */

/*
   Mongoose allows Node.js to communicate
   with MongoDB using models and schemas.
*/

const mongoose = require("mongoose");



/* =========================================================
   2. LOAD ENVIRONMENT VARIABLES
========================================================= */

/*
   dotenv loads variables from the .env file.

   Example:

   MONGODB_URI=your-mongodb-connection-string

   can then be accessed with:

   process.env.MONGODB_URI
*/

require("dotenv").config();



/* =========================================================
   3. CONNECT TO DATABASE
========================================================= */

/*
   This function connects SkillConnect
   to the MongoDB database.
*/

const connectDB = async () => {

    try {

        /* ==========================================
           Get MongoDB connection string
        ========================================== */

        const mongoURI =
            process.env.MONGODB_URI;


        /* ==========================================
           Make sure MongoDB URI exists
        ========================================== */

        if (!mongoURI) {

            throw new Error(
                "MONGODB_URI is not defined in the .env file."
            );

        }


        /* ==========================================
           Connect to MongoDB
        ========================================== */

        const connection =
            await mongoose.connect(
                mongoURI
            );


        /* ==========================================
           Successful Connection
        ========================================== */

        console.log(
            `MongoDB connected: ${connection.connection.host}`
        );

    }

    catch (error) {

        /* ==========================================
           Database Connection Error
        ========================================== */

        console.error(
            "MongoDB connection failed:",
            error.message
        );


        /* ==========================================
           Stop Application
        ========================================== */

        /*
           The application cannot safely operate
           without its database.

           Therefore, terminate the Node.js
           process when the initial connection fails.
        */

        process.exit(1);

    }

};



/* =========================================================
   4. EXPORT DATABASE FUNCTION
========================================================= */

/*
   server.js will import this function and
   call it before starting the application.
*/

module.exports = connectDB;