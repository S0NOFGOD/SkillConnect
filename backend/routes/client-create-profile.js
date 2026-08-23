/* =========================================================
   SKILLCONNECT
   CLIENT CREATE PROFILE ROUTES

   This file controls:

   1. Client profile creation endpoint
   2. Connecting the route to the controller

   MOUNTED IN SERVER.JS AS:

   /api/client-create-profile

   Therefore:

   POST /
   
   becomes:

   POST /api/client-create-profile
========================================================= */


/* =========================================================
   1. IMPORT EXPRESS
========================================================= */

/*
   Express Router allows us to create
   separate route files for our application.
*/

const express =
    require("express");



/* =========================================================
   2. CREATE ROUTER
========================================================= */

const router =
    express.Router();



/* =========================================================
   3. IMPORT CLIENT CREATE PROFILE CONTROLLER
========================================================= */

/*
   The controller contains the actual logic
   for creating and saving the client profile.
*/

const {
    createClientProfile
} =
    require("../controllers/client-create-profile");



/* =========================================================
   4. CREATE CLIENT PROFILE
========================================================= */

/*
   Frontend sends:

   POST /api/client-create-profile

   Request body:

   {
       "clientEmail": "client@example.com",
       "fullName": "John Doe",
       "country": "Nigeria",
       "state": "Oyo",
       "city": "Ibadan"
   }


   The controller will:

   1. Find the client
   2. Check email verification
   3. Validate profile information
   4. Save the profile
   5. Set profileCompleted = true
   6. Return a success response
*/

router.post(

    "/",

    createClientProfile

);



/* =========================================================
   5. EXPORT ROUTER
========================================================= */

/*
   server.js imports this router and mounts it at:

   /api/client-create-profile
*/

module.exports =
    router;