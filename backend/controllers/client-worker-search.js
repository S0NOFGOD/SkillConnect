/* =========================================================
   1. IMPORT JSON WEB TOKEN
========================================================= */

/*
   jsonwebtoken is used to verify the client's
   accessToken sent by the frontend.
*/

const jwt =
    require("jsonwebtoken");



/* =========================================================
   2. IMPORT CLIENT MODEL
========================================================= */

const Client =
    require("../models/client");



/* =========================================================
   3. IMPORT WORKER MODEL
========================================================= */

/*
   The Worker model is used to retrieve workers
   available to the authenticated client.
*/

const Worker =
    require("../models/worker");



/* =========================================================
   4. VERIFY ACCESS TOKEN
========================================================= */

/*
   This helper extracts and verifies the Bearer
   accessToken from the Authorization header.

   Expected header:

       Authorization: Bearer ACCESS_TOKEN

   If the token is valid, the decoded token payload
   is returned.

   If the token is missing, invalid, or expired,
   an error is thrown.
*/

const verifyAccessToken =
    (req) => {

        /* ==========================================
           GET AUTHORIZATION HEADER
        ========================================== */

        const authorization =
            req.headers.authorization;


        /* ==========================================
           CHECK AUTHORIZATION HEADER
        ========================================== */

        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {

            const error =
                new Error(
                    "Authentication required."
                );

            error.statusCode =
                401;

            error.code =
                "AUTHENTICATION_REQUIRED";

            throw error;

        }


        /* ==========================================
           EXTRACT ACCESS TOKEN
        ========================================== */

        const accessToken =
            authorization.substring(7).trim();


        /* ==========================================
           CHECK TOKEN VALUE
        ========================================== */

        if (!accessToken) {

            const error =
                new Error(
                    "Authentication required."
                );

            error.statusCode =
                401;

            error.code =
                "AUTHENTICATION_REQUIRED";

            throw error;

        }


        /* ==========================================
           VERIFY ACCESS TOKEN
        ========================================== */

        try {

            return jwt.verify(

                accessToken,

                process.env.ACCESS_TOKEN_SECRET

            );

        }

        catch (error) {

            const authenticationError =
                new Error(
                    "Your authentication session is invalid or has expired."
                );

            authenticationError.statusCode =
                401;

            authenticationError.code =
                "INVALID_OR_EXPIRED_TOKEN";

            throw authenticationError;

        }

    };



/* =========================================================
   5. GET CLIENT ID FROM TOKEN
========================================================= */

/*
   Different authentication implementations may store
   the client ID under different names.

   This helper supports the common names:

       id
       userId
       clientId
       _id

   The controller will then use the ID to find the
   corresponding Client document.
*/

const getClientIdFromToken =
    (decodedToken) => {

        return (
            decodedToken.id ||
            decodedToken.userId ||
            decodedToken.clientId ||
            decodedToken._id
        );

    };



/* =========================================================
   6. CHECK CLIENT SESSION
========================================================= */

/*
   Endpoint:

       GET /api/client/worker-search/session

   FLOW:

   Frontend sends accessToken
           ↓
   Verify accessToken
           ↓
   Token invalid / expired
           ↓
   Return authentication error
           ↓
   Token valid
           ↓
   Find Client
           ↓
   Client does not exist
           ↓
   Return authentication error
           ↓
   Client exists
           ↓
   Check accountStatus
           ↓
   Suspended
           ↓
   Return account error
           ↓
   Active
           ↓
   Return success
*/

const checkClientSession =
    async (req, res, next) => {

        try {

            /* ==========================================
               VERIFY ACCESS TOKEN
            ========================================== */

            const decodedToken =
                verifyAccessToken(req);


            /* ==========================================
               GET CLIENT ID
            ========================================== */

            const clientId =
                getClientIdFromToken(
                    decodedToken
                );


            /* ==========================================
               VERIFY CLIENT ID
            ========================================== */

            if (!clientId) {

                const error =
                    new Error(
                        "Invalid authentication session."
                    );

                error.statusCode =
                    401;

                error.code =
                    "INVALID_AUTHENTICATION";

                throw error;

            }


            /* ==========================================
               FIND CLIENT
            ========================================== */

            const client =
                await Client.findById(
                    clientId
                );


            /* ==========================================
               CLIENT DOES NOT EXIST
            ========================================== */

            if (!client) {

                const error =
                    new Error(
                        "Client account could not be found."
                    );

                error.statusCode =
                    401;

                error.code =
                    "CLIENT_NOT_FOUND";

                throw error;

            }


            /* ==========================================
               CHECK ACCOUNT STATUS
            ========================================== */

            if (
                client.accountStatus !==
                "active"
            ) {

                const error =
                    new Error(
                        "Your client account is suspended or inactive."
                    );

                error.statusCode =
                    403;

                error.code =
                    "ACCOUNT_INACTIVE";

                throw error;

            }


            /* ==========================================
               SESSION VALID
            ========================================== */

            return res.status(200).json({

                success: true,

                authenticated: true,

                message:
                    "Client authentication verified successfully."

            });

        }

        catch (error) {

            next(error);

        }

    };



/* =========================================================
   7. GET NEARBY WORKERS
========================================================= */

/*
   Endpoint:

       GET /api/client/worker-search/workers

   FLOW:

   Verify accessToken
           ↓
   Find Client
           ↓
   Check accountStatus
           ↓
   Retrieve Client state and city
           ↓
   Find active workers
           ↓
   Match workers using state/city
           ↓
   Return workers
*/

const getNearbyWorkers =
    async (req, res, next) => {

        try {

            /* ==========================================
               VERIFY ACCESS TOKEN
            ========================================== */

            const decodedToken =
                verifyAccessToken(req);


            /* ==========================================
               GET CLIENT ID
            ========================================== */

            const clientId =
                getClientIdFromToken(
                    decodedToken
                );


            if (!clientId) {

                const error =
                    new Error(
                        "Invalid authentication session."
                    );

                error.statusCode =
                    401;

                error.code =
                    "INVALID_AUTHENTICATION";

                throw error;

            }


            /* ==========================================
               FIND CLIENT
            ========================================== */

            const client =
                await Client.findById(
                    clientId
                );


            if (!client) {

                const error =
                    new Error(
                        "Client account could not be found."
                    );

                error.statusCode =
                    401;

                error.code =
                    "CLIENT_NOT_FOUND";

                throw error;

            }


            /* ==========================================
               CHECK CLIENT ACCOUNT STATUS
            ========================================== */

            if (
                client.accountStatus !==
                "active"
            ) {

                const error =
                    new Error(
                        "Your client account is suspended or inactive."
                    );

                error.statusCode =
                    403;

                error.code =
                    "ACCOUNT_INACTIVE";

                throw error;

            }


            /* ==========================================
               CHECK CLIENT LOCATION
            ========================================== */

            if (
                !client.state ||
                !client.city
            ) {

                return res.status(200).json({

                    success: true,

                    workers: [],

                    message:
                        "Client location is not available."

                });

            }


            /* ==========================================
               FIND WORKERS
            ========================================== */

            /*
               Since the existing Worker model stores
               state and city, the search uses those
               existing fields.

               Only active workers with completed profiles
               are returned.
            */

            const workers =
                await Worker.find({

                    accountStatus:
                        "active",

                    profileCompleted:
                        true,

                    state:
                        client.state,

                    city:
                        client.city

                })

                /*
                   Never return sensitive authentication
                   information to the client.
                */

                .select(

                    "-password " +
                    "-emailOtp " +
                    "-emailOtpExpires " +
                    "-passwordResetOTP " +
                    "-passwordResetOTPExpires " +
                    "-passwordResetVerified " +
                    "-passwordResetVerifiedAt " +
                    "-resetAuthorization " +
                    "-resetAuthorizationExpires " +
                    "-refreshTokenHash"

                )

                .sort({

                    createdAt:
                        -1

                });


            /* ==========================================
               RETURN WORKERS
            ========================================== */

            return res.status(200).json({

                success: true,

                workers

            });

        }

        catch (error) {

            next(error);

        }

    };



/* =========================================================
   8. GET CLIENT PROFILE
========================================================= */

/*
   Endpoint:

       GET /api/client/worker-search/profile

   FLOW:

   Verify accessToken
           ↓
   Find Client
           ↓
   Check accountStatus
           ↓
   Return:

       fullName
       country
       state
       city
*/

const getClientProfile =
    async (req, res, next) => {

        try {

            /* ==========================================
               VERIFY ACCESS TOKEN
            ========================================== */

            const decodedToken =
                verifyAccessToken(req);


            /* ==========================================
               GET CLIENT ID
            ========================================== */

            const clientId =
                getClientIdFromToken(
                    decodedToken
                );


            if (!clientId) {

                const error =
                    new Error(
                        "Invalid authentication session."
                    );

                error.statusCode =
                    401;

                error.code =
                    "INVALID_AUTHENTICATION";

                throw error;

            }


            /* ==========================================
               FIND CLIENT
            ========================================== */

            const client =
                await Client.findById(
                    clientId
                );


            if (!client) {

                const error =
                    new Error(
                        "Client account could not be found."
                    );

                error.statusCode =
                    401;

                error.code =
                    "CLIENT_NOT_FOUND";

                throw error;

            }


            /* ==========================================
               CHECK ACCOUNT STATUS
            ========================================== */

            if (
                client.accountStatus !==
                "active"
            ) {

                const error =
                    new Error(
                        "Your client account is suspended or inactive."
                    );

                error.statusCode =
                    403;

                error.code =
                    "ACCOUNT_INACTIVE";

                throw error;

            }


            /* ==========================================
               RETURN PROFILE
            ========================================== */

            return res.status(200).json({

                success: true,

                profile: {

                    fullName:
                        client.fullName,

                    country:
                        client.country,

                    state:
                        client.state,

                    city:
                        client.city

                }

            });

        }

        catch (error) {

            next(error);

        }

    };



/* =========================================================
   9. UPDATE CLIENT PROFILE
========================================================= */

/*
   Endpoint:

       PUT /api/client/worker-search/profile

   FLOW:

   Client submits:

       fullName
       state
       city
       location

           ↓

   Verify accessToken
           ↓
   Find Client
           ↓
   Check accountStatus
           ↓
   Validate fields
           ↓
   Update Client document
           ↓
   Return success
*/

const updateClientProfile =
    async (req, res, next) => {

        try {

            /* ==========================================
               VERIFY ACCESS TOKEN
            ========================================== */

            const decodedToken =
                verifyAccessToken(req);


            /* ==========================================
               GET CLIENT ID
            ========================================== */

            const clientId =
                getClientIdFromToken(
                    decodedToken
                );


            if (!clientId) {

                const error =
                    new Error(
                        "Invalid authentication session."
                    );

                error.statusCode =
                    401;

                error.code =
                    "INVALID_AUTHENTICATION";

                throw error;

            }


            /* ==========================================
               FIND CLIENT
            ========================================== */

            const client =
                await Client.findById(
                    clientId
                );


            if (!client) {

                const error =
                    new Error(
                        "Client account could not be found."
                    );

                error.statusCode =
                    401;

                error.code =
                    "CLIENT_NOT_FOUND";

                throw error;

            }


            /* ==========================================
               CHECK ACCOUNT STATUS
            ========================================== */

            if (
                client.accountStatus !==
                "active"
            ) {

                const error =
                    new Error(
                        "Your client account is suspended or inactive."
                    );

                error.statusCode =
                    403;

                error.code =
                    "ACCOUNT_INACTIVE";

                throw error;

            }


            /* ==========================================
               GET REQUEST BODY
            ========================================== */

            const {

                fullName,

                state,

                city,

                location

            } = req.body;


            /* ==========================================
               VALIDATE FULL NAME
            ========================================== */

            if (
                typeof fullName !== "string" ||
                !fullName.trim()
            ) {

                const error =
                    new Error(
                        "Full name is required."
                    );

                error.statusCode =
                    400;

                error.code =
                    "INVALID_FULL_NAME";

                throw error;

            }


            /* ==========================================
               VALIDATE STATE
            ========================================== */

            if (
                typeof state !== "string" ||
                !state.trim()
            ) {

                const error =
                    new Error(
                        "State is required."
                    );

                error.statusCode =
                    400;

                error.code =
                    "INVALID_STATE";

                throw error;

            }


            /* ==========================================
               VALIDATE CITY
            ========================================== */

            if (
                typeof city !== "string" ||
                !city.trim()
            ) {

                const error =
                    new Error(
                        "City is required."
                    );

                error.statusCode =
                    400;

                error.code =
                    "INVALID_CITY";

                throw error;

            }


            /* ==========================================
               VALIDATE LOCATION
            ========================================== */

            if (
                typeof location !== "string" ||
                !location.trim()
            ) {

                const error =
                    new Error(
                        "Location is required."
                    );

                error.statusCode =
                    400;

                error.code =
                    "INVALID_LOCATION";

                throw error;

            }


            /* ==========================================
               CREATE EXPECTED LOCATION
            ========================================== */

            const expectedLocation =
                `${state.trim()}, ${city.trim()}`;


            /* ==========================================
               VALIDATE LOCATION VALUE
            ========================================== */

            if (
                location.trim() !==
                expectedLocation
            ) {

                const error =
                    new Error(
                        "The submitted location does not match the selected state and city."
                    );

                error.statusCode =
                    400;

                error.code =
                    "LOCATION_MISMATCH";

                throw error;

            }


            /* ==========================================
               UPDATE CLIENT PROFILE
            ========================================== */

            client.fullName =
                fullName.trim();

            client.state =
                state.trim();

            client.city =
                city.trim();


            /*
               IMPORTANT:

               The current Client model does NOT contain
               a location field.

               Therefore we do not save location to the
               Client document.

               The backend validates the location sent by
               the frontend against state + city, while
               the existing model continues to store:

                   state
                   city
            */


            await client.save();


            /* ==========================================
               RETURN SUCCESS RESPONSE
            ========================================== */

            return res.status(200).json({

                success: true,

                message:
                    "Profile Updated Successfully"

            });

        }

        catch (error) {

            next(error);

        }

    };



/* =========================================================
   10. EXPORT CONTROLLER FUNCTIONS
========================================================= */

/*
   The route file uses these controller functions:

       checkClientSession
       getNearbyWorkers
       getClientProfile
       updateClientProfile
*/

module.exports = {

    checkClientSession,

    getNearbyWorkers,

    getClientProfile,

    updateClientProfile

};