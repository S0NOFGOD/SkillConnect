/* =========================================================
   1. IMPORT MONGOOSE
========================================================= */

const mongoose = require("mongoose");



/* =========================================================
   2. LOAD ENVIRONMENT VARIABLES
========================================================= */

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

        process.exit(1);

    }

};



/* =========================================================
   4. EXPORT DATABASE FUNCTION
========================================================= */

module.exports = connectDB;