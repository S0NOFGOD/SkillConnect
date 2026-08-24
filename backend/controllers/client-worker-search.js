/* =========================================================
   1. IMPORT JSON WEB TOKEN
========================================================= */

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

const Worker =
    require("../models/worker");


/* =========================================================
   4. GET AVAILABLE WORKERS
========================================================= */

/*
   Endpoint:

   GET /api/client/worker-search

   Authorization:

   Bearer <accessToken>
*/

const getWorkers =
    async (req, res) => {

        try {

            /* =================================================
               5. GET AUTHORIZATION HEADER
            ================================================= */

            const authorization =
                req.headers.authorization;


            /*
               The frontend must send:

               Authorization:
               Bearer <accessToken>
            */

            if (
                !authorization ||
                !authorization.startsWith("Bearer ")
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            /* =================================================
               6. EXTRACT ACCESS TOKEN
            ================================================= */

            const accessToken =
                authorization.split(" ")[1];


            if (!accessToken) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            /* =================================================
               7. VERIFY ACCESS TOKEN
            ================================================= */

            let decodedToken;


            try {

                decodedToken =
                    jwt.verify(
                        accessToken,
                        process.env.ACCESS_TOKEN_SECRET
                    );

            }

            catch (error) {

                /*
                   This covers:

                   - Expired token
                   - Invalid token
                   - Malformed token
                */

                return res.status(401).json({

                    success: false,

                    message:
                        "Your session is invalid or has expired. Please log in again."

                });

            }


            /* =================================================
               8. GET CLIENT ID FROM TOKEN
            ================================================= */

            /*
               Different authentication implementations may
               store the client identifier under different
               property names.

               We support the common possibilities while still
               requiring an actual client account to exist.
            */

            const clientId =
                decodedToken.clientId ||
                decodedToken.userId ||
                decodedToken.id ||
                decodedToken._id;


            if (!clientId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid authentication session."

                });

            }


            /* =================================================
               9. FIND CLIENT ACCOUNT
            ================================================= */

            const client =
                await Client.findById(
                    clientId
                );


            /*
               Token may be valid while the account no longer
               exists.

               Therefore we must verify the account separately.
            */

            if (!client) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Your client account could not be found. Please log in again."

                });

            }


            /* =================================================
               10. CHECK CLIENT ACCOUNT STATUS
            ================================================= */

            /*
               Only active clients can search for workers.

               Your authentication flow requires suspended or
               inactive accounts to be rejected.
            */

            if (
                client.accountStatus !== "active"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your client account is currently suspended or inactive. Please contact support."

                });

            }


            /* =================================================
               11. GET CLIENT LOCATION
            ================================================= */

            const clientState =
                client.state?.trim();


            const clientCity =
                client.city?.trim();


            /*
               The worker search depends on the client's
               state and city.

               If either location is missing, workers cannot
               be matched correctly.
            */

            if (
                !clientState ||
                !clientCity
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Your profile location is incomplete. Please update your state and city before searching for workers."

                });

            }


            /* =================================================
               12. FIND AVAILABLE WORKERS
            ================================================= */

            /*
               Only workers who:

               - Have completed their profile
               - Have an active account
               - Match the client's state
               - Match the client's city

               are returned.
            */

            const workers =
                await Worker.find({

                    accountStatus:
                        "active",

                    profileCompleted:
                        true,

                    state:
                        clientState,

                    city:
                        clientCity

                })

                /*
                   Only retrieve the fields needed by the
                   client worker-search page.

                   This prevents unnecessary private worker
                   information from being sent to the frontend.
                */

                .select(
                    [
                        "_id",
                        "profilePicture",
                        "fullName",
                        "primarySkill",
                        "state",
                        "city",
                        "startingPrice"
                    ].join(" ")
                )

                .lean();


            /* =================================================
               13. FORMAT WORKER RESPONSE
            ================================================= */

            /*
               The database uses:

               fullName
               primarySkill
               startingPrice

               The frontend receives:

               name
               skill
               price

               This keeps the frontend simple without changing
               the existing Worker model.
            */

            const formattedWorkers =
                workers.map(
                    worker => ({

                        id:
                            worker._id,

                        profilePicture:
                            worker.profilePicture,

                        name:
                            worker.fullName,

                        skill:
                            worker.primarySkill,

                        state:
                            worker.state,

                        city:
                            worker.city,

                        price:
                            worker.startingPrice

                    })
                );


            /* =================================================
               14. RETURN WORKERS
            ================================================= */

            return res.status(200).json({

                success: true,

                workers:
                    formattedWorkers

            });

        }


        /* =====================================================
           15. HANDLE DATABASE / SERVER ERRORS
        ===================================================== */

        catch (error) {

            console.error(
                "Client worker search error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve workers at this time."

            });

        }

    };


/* =========================================================
   16. EXPORT CONTROLLER
========================================================= */

module.exports = {

    getWorkers

};