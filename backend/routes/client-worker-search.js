/* =========================================================
   1. IMPORT EXPRESS
========================================================= */

const express =
    require("express");



/* =========================================================
   2. CREATE ROUTER
========================================================= */

/*
   This router will contain all endpoints related to:

   /api/client/worker-search
*/

const router =
    express.Router();



/* =========================================================
   3. IMPORT CLIENT WORKER SEARCH CONTROLLER
========================================================= */

/*
   The controller contains the actual business logic
   for authentication, worker retrieval, profile retrieval,
   and profile updates.
*/

const clientWorkerSearchController =
    require("../controllers/client-worker-search");



/* =========================================================
   4. CLIENT SESSION VERIFICATION
========================================================= */

/*
   Frontend endpoint:

   GET
   /api/client/worker-search/session

   Purpose:

   - Receive the client's accessToken.
   - Verify the accessToken.
   - Verify that the client account exists.
   - Check the client's accountStatus.
   - Return a successful session response when
     the client account is active.
*/

router.get(

    "/session",

    clientWorkerSearchController.checkClientSession

);



/* =========================================================
   5. RETRIEVE NEARBY WORKERS
========================================================= */

/*
   Frontend endpoint:

   GET
   /api/client/worker-search/workers

   Purpose:

   - Verify the client's accessToken.
   - Retrieve the client's location.
   - Find workers near the client's location.
   - Return the available workers.
*/

router.get(

    "/workers",

    clientWorkerSearchController.getNearbyWorkers

);



/* =========================================================
   6. RETRIEVE CLIENT PROFILE
========================================================= */

/*
   Frontend endpoint:

   GET
   /api/client/worker-search/profile

   Purpose:

   - Verify the client's accessToken.
   - Find the authenticated client.
   - Return the client's current profile.

   Used when the client opens:

   "Update Profile"
*/

router.get(

    "/profile",

    clientWorkerSearchController.getClientProfile

);



/* =========================================================
   7. UPDATE CLIENT PROFILE
========================================================= */

/*
   Frontend endpoint:

   PUT
   /api/client/worker-search/profile

   Purpose:

   - Verify the client's accessToken.
   - Validate state.
   - Validate city.
   - Validate location.
   - Update the Client document.
   - Return a success response.

   Frontend sends:

       fullName
       state
       city
       location
*/

router.put(

    "/profile",

    clientWorkerSearchController.updateClientProfile

);



/* =========================================================
   8. EXPORT ROUTER
========================================================= */

module.exports =
    router;