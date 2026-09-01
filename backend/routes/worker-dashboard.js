/* =========================================================
   WORKER DASHBOARD ROUTES
   routes/worker-dashboard.js

   PURPOSE:
   Defines all API endpoints used by the worker dashboard.

   ROUTES:

   GET
   /api/worker-dashboard/dashboard
   → Get worker dashboard

   POST
   /api/worker-dashboard/refresh-token
   → Refresh expired accessToken

   POST
   /api/worker-dashboard/logout
   → Revoke refreshToken

   PUT
   /api/worker-dashboard/dashboard
   → Update worker dashboard/profile
========================================================= */


/* =========================================================
   1. IMPORT EXPRESS
========================================================= */

const express =
    require("express");


/* =========================================================
   2. CREATE ROUTER
========================================================= */

const router =
    express.Router();


/* =========================================================
   3. IMPORT WORKER DASHBOARD CONTROLLER
========================================================= */

const workerDashboardController =
    require("../controllers/worker-dashboard");


/* =========================================================
   4. GET WORKER DASHBOARD
========================================================= */

/*
   Endpoint:

   GET /api/worker-dashboard/dashboard

   Purpose:

   Returns the authenticated worker's:

   - profilePicture
   - isVerification
   - fullName
   - phone
   - primarySkill
   - experience
   - startingPrice
   - location
   - description
   - portfolioImages
*/

router.get(
    "/dashboard",
    workerDashboardController.getWorkerDashboard
);


/* =========================================================
   5. REFRESH ACCESS TOKEN
========================================================= */

/*
   Endpoint:

   POST /api/worker-dashboard/refresh-token

   Purpose:

   Receives the refreshToken when the current
   accessToken has expired.

   The controller validates the refreshToken
   and returns a new accessToken.
*/

router.post(
    "/refresh-token",
    workerDashboardController.refreshAccessToken
);


/* =========================================================
   6. LOGOUT WORKER
========================================================= */

/*
   Endpoint:

   POST /api/worker-dashboard/logout

   Purpose:

   Receives the worker's refreshToken.

   The controller revokes/invalidates the
   refreshToken.
*/

router.post(
    "/logout",
    workerDashboardController.logout
);


/* =========================================================
   7. UPDATE WORKER DASHBOARD
========================================================= */

/*
   Endpoint:

   PUT /api/worker-dashboard/dashboard

   Purpose:

   Updates the authenticated worker's
   dashboard/profile information.

   This will be used by the Edit Profile flow.
*/

router.put(
    "/dashboard",
    workerDashboardController.updateWorkerDashboard
);


/* =========================================================
   8. EXPORT ROUTER
========================================================= */

module.exports =
    router;