/* =========================================================
   1. IMPORT MONGOOSE
========================================================= */

const mongoose =
    require("mongoose");

/* =========================================================
   1. IMPORT JWT
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
   4. GET WORKER DETAILS
========================================================= */

const getWorkerDetails = async (
    req,
    res
) => {

    try {

        /* =================================================
           4.1 GET ACCESS TOKEN
        ================================================= */

        /*
           The frontend sends:

               Authorization: Bearer ACCESS_TOKEN

           We extract the token from the header.
        */

        const authorizationHeader =
            req.headers.authorization;


        if (
            !authorizationHeader ||
            !authorizationHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({

                success: false,

                errorType: "AUTHENTICATION_ERROR",

                message:
                    "Authentication Required"

            });

        }


        /* =================================================
           4.2 EXTRACT TOKEN
        ================================================= */

        const accessToken =
            authorizationHeader.split(" ")[1];


        if (!accessToken) {

            return res.status(401).json({

                success: false,

                errorType: "AUTHENTICATION_ERROR",

                message:
                    "Authentication Required"

            });

        }


        /* =================================================
           4.3 VERIFY ACCESS TOKEN
        ================================================= */

        let decodedToken;


        try {

            decodedToken =
                jwt.verify(
                    accessToken,
                    process.env.ACCESS_TOKEN_SECRET
                );

        }

        catch (tokenError) {

            /*
               The token may be:

               - expired
               - invalid
               - malformed

               All of these are authentication
               errors for the frontend.
            */

            return res.status(401).json({

                success: false,

                errorType: "AUTHENTICATION_ERROR",

                message:
                    "Authentication Required"

            });

        }


        /* =================================================
           4.4 GET CLIENT ID FROM TOKEN
        ================================================= */

        /*
           Different authentication controllers may
           use different names for the user ID.

           We support the common possibilities so
           this controller remains compatible with
           the existing authentication flow.
        */

        const clientId =
            decodedToken.clientId ||
            decodedToken.userId ||
            decodedToken.id ||
            decodedToken._id;


        if (!clientId) {

            return res.status(401).json({

                success: false,

                errorType: "AUTHENTICATION_ERROR",

                message:
                    "Authentication Required"

            });

        }


        /* =================================================
           4.5 FIND CLIENT
        ================================================= */

        const client =
            await Client.findById(
                clientId
            );


        if (!client) {

            return res.status(401).json({

                success: false,

                errorType: "AUTHENTICATION_ERROR",

                message:
                    "Authentication Required"

            });

        }


        /* =================================================
           4.6 CHECK CLIENT ACCOUNT STATUS
        ================================================= */

        if (
            client.accountStatus !== "active"
        ) {

            return res.status(403).json({

                success: false,

                errorType: "ACCOUNT_ERROR",

                message:
                    "Your account is inactive or suspended."

            });

        }


        /* =========================================================
   4.7 GET WORKER ID
========================================================= */

/*
   The frontend sends the worker ID through:

       /api/client-worker-details/:workerId

   Therefore the primary source is:

       req.params.workerId

   We also support query/body as fallbacks.
*/

const workerId =
    req.params.workerId ||
    req.query.workerId ||
    req.body?.workerId;


/*
   Make sure a worker ID was actually supplied.
*/

if (!workerId) {

    console.log(
        "WORKER DETAILS: No worker ID supplied."
    );

    return res.status(400).json({

        success: false,

        errorType: "WORKER_ERROR",

        message:
            "Worker ID is required."

    });

}


/* =========================================================
   4.8 VALIDATE WORKER ID
========================================================= */

/*
   Make sure the supplied value is a valid
   MongoDB ObjectId.

   We use mongoose.Types.ObjectId.isValid()
   instead of attempting to cast the ID manually.
*/

if (
    !mongoose.Types.ObjectId.isValid(
        workerId
    )
) {

    console.log(
        "WORKER DETAILS: Invalid worker ID:",
        workerId
    );

    return res.status(404).json({

        success: false,

        errorType: "WORKER_ERROR",

        message:
            "Worker Not Found"

    });

}


/* =========================================================
   4.9 FIND WORKER
========================================================= */

/*
   Now that the ID is valid, search for the worker.
*/

const worker =
    await Worker.findById(
        workerId
    ).lean();


/*
   Worker ID is valid but no worker exists
   with that ID.
*/

if (!worker) {

    console.log(
        "WORKER DETAILS: Worker does not exist:",
        workerId
    );

    return res.status(404).json({

        success: false,

        errorType: "WORKER_ERROR",

        message:
            "Worker Not Found"

    });

}


/*
   This confirms that the worker was actually found.
*/

console.log(
    "WORKER DETAILS: Worker found:",
    String(worker._id)
);


        /* =================================================
           4.10 CHECK WORKER ACCOUNT STATUS
        ================================================= */

        if (
            worker.accountStatus !== "active"
        ) {

            return res.status(403).json({

                success: false,

                errorType: "WORKER_ERROR",

                message:
                    "This worker is currently unavailable."

            });

        }


        /* =================================================
           4.11 PREPARE LOCATION
        ================================================= */

        /*
           The worker model stores:

               city
               state

           The frontend displays them together.
        */

        let location = "—";


        if (
            worker.city &&
            worker.state
        ) {

            location =
                `${worker.city}, ${worker.state}`;

        }

        else if (worker.city) {

            location =
                worker.city;

        }

        else if (worker.state) {

            location =
                worker.state;

        }


        /* =================================================
           4.12 PREPARE PORTFOLIO IMAGES
        ================================================= */

        /*
           The database stores portfolio images as:

               {
                   url,
                   publicId
               }

           The frontend only needs the URL and can
           therefore receive the image objects directly.
        */

        const portfolioImages =
            Array.isArray(
                worker.portfolioImages
            )
                ? worker.portfolioImages
                : [];


        /* =================================================
           4.13 PREPARE REVIEWS
        ================================================= */

        /*
           The current Worker model does not contain
           a reviews array.

           Therefore, until a separate Review model
           is introduced, this endpoint safely returns
           an empty review list.
        */

        const reviews = [];


        /* =================================================
           4.14 PREPARE RATING
        ================================================= */

        /*
           The current Worker model also does not contain
           a rating field.

           Until ratings/reviews are stored separately,
           the worker has no rating.
        */

        const rating = null;


        /* =================================================
           4.15 SEND SUCCESS RESPONSE
        ================================================= */

        return res.status(200).json({

            success: true,

            message:
                "Worker details retrieved successfully.",

            worker: {

                id:
                    worker._id,

                isVerified:
                    worker.isVerified === true,

                portfolioImages: portfolioImages.map(image =>
                    typeof image === "string"
                    ? image
                    : image?.url
                ).filter(Boolean),

                description:
                    worker.description || "",

                primarySkill:
                    worker.primarySkill || "—",

                experience:
                    worker.experience || "—",

                startingPrice:
                    worker.startingPrice || "—",

                location,

                phone:
                    worker.phone || null,

                rating,

                reviews

            }

        });

    }

    catch (error) {

        /* =================================================
           4.16 SERVER ERROR
        ================================================= */

        console.error(
            "Client worker details error:",
            error
        );


        return res.status(500).json({

            success: false,

            errorType: "SERVER_ERROR",

            message:
                "An internal server error occurred."

        });

    }

};



/* =========================================================
   5. EXPORT CONTROLLER
========================================================= */

module.exports = {

    getWorkerDetails

};