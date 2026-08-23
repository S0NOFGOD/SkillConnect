/* =========================================================
   SKILLCONNECT
   CLIENT CREATE PROFILE CONTROLLER

   This file controls:

   1. Receiving client profile information
   2. Finding the client by email
   3. Checking email verification
   4. Validating profile information
   5. Saving the client profile
   6. Setting profileCompleted = true
   7. Returning success/error responses

   FLOW:

   Frontend
        ↓
   POST /api/client-create-profile
        ↓
   Find client
        ↓
   Client does not exist
        ↓
   Error response

   Client exists
        ↓
   Check isEmailVerified
        ↓
   false → Error response
        ↓
   true
        ↓
   Validate profile
        ↓
   Save profile
        ↓
   profileCompleted = true
        ↓
   Success response
========================================================= */


/* =========================================================
   1. IMPORT CLIENT MODEL
========================================================= */

/*
   The Client model allows us to find and update
   the client stored in MongoDB.
*/

const Client =
    require("../models/client");



/* =========================================================
   2. CREATE CLIENT PROFILE
========================================================= */

const createClientProfile = async (
    req,
    res
) => {

    try {

        /* =================================================
           2.1 GET DATA FROM REQUEST BODY
        ================================================= */

        /*
           The frontend sends:

           {
               clientEmail,
               fullName,
               country,
               state,
               city
           }
        */

        const {

            clientEmail,

            fullName,

            country,

            state,

            city

        } = req.body;



        /* =================================================
           2.2 VALIDATE EMAIL
        ================================================= */

        /*
           clientEmail is required because we use it
           to identify the client whose profile is
           being completed.
        */

        if (
            !clientEmail ||
            typeof clientEmail !== "string"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Client email is required."

            });

        }



        /* =================================================
           2.3 NORMALIZE EMAIL
        ================================================= */

        /*
           Convert the email to lowercase and remove
           accidental spaces.

           Example:

           " John@Example.com "

           becomes:

           "john@example.com"
        */

        const normalizedEmail =
            clientEmail
                .trim()
                .toLowerCase();



        /* =================================================
           2.4 FIND CLIENT
        ================================================= */

        /*
           Search MongoDB for the client using
           the normalized email address.
        */

        const client =
            await Client.findOne({

                email:
                    normalizedEmail

            });



        /* =================================================
           2.5 CLIENT DOES NOT EXIST
        ================================================= */

        if (!client) {

            return res.status(404).json({

                success: false,

                message:
                    "Client account could not be found."

            });

        }



        /* =================================================
           2.6 CHECK EMAIL VERIFICATION
        ================================================= */

        /*
           The client must verify their email before
           they are allowed to complete their profile.

           If email verification is false:

           → Return an error
           → Frontend displays error modal
           → Frontend redirects to client-email-otp
        */

        if (
            client.isEmailVerified !== true
        ) {

            return res.status(403).json({

                success: false,

                emailNotVerified: true,

                message:
                    "Please verify your email before completing your profile."

            });

        }



        /* =================================================
           2.7 VALIDATE FULL NAME
        ================================================= */

        if (
            !fullName ||
            typeof fullName !== "string" ||
            !fullName.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your full name."

            });

        }



        /* =================================================
           2.8 VALIDATE COUNTRY
        ================================================= */

        if (
            !country ||
            typeof country !== "string" ||
            !country.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please select your country."

            });

        }



        /* =================================================
           2.9 VALIDATE STATE
        ================================================= */

        if (
            !state ||
            typeof state !== "string" ||
            !state.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please select your state."

            });

        }



        /* =================================================
           2.10 VALIDATE CITY
        ================================================= */

        if (
            !city ||
            typeof city !== "string" ||
            !city.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please select your city."

            });

        }



        /* =================================================
           2.11 CLEAN PROFILE INFORMATION
        ================================================= */

        /*
           Remove accidental spaces from the values
           before saving them to MongoDB.
        */

        const cleanFullName =
            fullName.trim();

        const cleanCountry =
            country.trim();

        const cleanState =
            state.trim();

        const cleanCity =
            city.trim();



        /* =================================================
           2.12 CREATE LOCATION STRING
        ================================================= */

        /*
           Store one combined location value.

           Example:

           Nigeria, Oyo, Ibadan
        */

        const location =
            `${cleanCountry}, ${cleanState}, ${cleanCity}`;



        /* =================================================
           2.13 SAVE PROFILE INFORMATION
        ================================================= */

        client.fullName =
            cleanFullName;

        client.country =
            cleanCountry;

        client.state =
            cleanState;

        client.city =
            cleanCity;

        client.location =
            location;



        /* =================================================
           2.14 MARK PROFILE AS COMPLETED
        ================================================= */

        /*
           This is important because the authentication
           flow can now determine that the client has
           completed their profile.

           Before:

           profileCompleted = false

           After:

           profileCompleted = true
        */

        client.profileCompleted =
            true;



        /* =================================================
           2.15 SAVE CLIENT
        ================================================= */

        await client.save();



        /* =================================================
           2.16 RETURN SUCCESS RESPONSE
        ================================================= */

        /*
           The frontend receives this response and:

           1. Shows success modal
           2. Waits 1.5 seconds
           3. Redirects to:

              client-worker-search/index.html
        */

        return res.status(200).json({

            success: true,

            message:
                "Your client profile has been completed successfully.",

            profileCompleted:
                true

        });

    }


    /* =====================================================
       3. HANDLE SERVER ERROR
    ===================================================== */

    catch (error) {

        /*
           Log the actual error on the backend
           for debugging.
        */

        console.error(
            "Client Create Profile Error:",
            error
        );


        /* ================================================
           RETURN SERVER ERROR
        ================================================ */

        return res.status(500).json({

            success: false,

            message:
                "An error occurred while creating your profile."

        });

    }

};



/* =========================================================
   4. EXPORT CONTROLLER
========================================================= */

module.exports = {

    createClientProfile

};