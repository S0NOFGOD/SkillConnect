/* =========================================================
   SKILLCONNECT CONTACT CONTROLLER
   Handles contact form requests.
========================================================= */


/* =========================================================
   IMPORT CONTACT MODEL
========================================================= */

/*
    The Contact model allows this controller to communicate
    with the MongoDB contacts collection.
*/

const Contact = require("../models/contact");


/* =========================================================
   CREATE CONTACT MESSAGE
========================================================= */

/*
    This controller handles:

    POST /api/contact
*/

const createContactMessage = async (req, res) => {

    try {

        /* =================================================
           GET DATA FROM REQUEST
        ================================================= */

        /*
            Our frontend sends:

            {
                name,
                email,
                message
            }

            Express converts the JSON request body into
            req.body because we enabled express.json()
            inside server.js.
        */

        const {
            name,
            email,
            message
        } = req.body;


        /* =================================================
           BACKEND VALIDATION
        ================================================= */

        /*
            Never rely only on frontend validation.

            Users can bypass frontend JavaScript, so the
            backend must validate the data as well.
        */

        if (
            !name ||
            !email ||
            !message
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill in all fields."

            });

        }


        /* =================================================
           CLEAN INPUT
        ================================================= */

        /*
            trim() removes unnecessary spaces.

            This also gives us cleaner database records.
        */

        const cleanName =
            name.trim();

        const cleanEmail =
            email.trim().toLowerCase();

        const cleanMessage =
            message.trim();


        /* =================================================
           MESSAGE LENGTH VALIDATION
        ================================================= */

        if (cleanMessage.length < 10) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a message of at least 10 characters."

            });

        }


        /* =================================================
           CREATE CONTACT DOCUMENT
        ================================================= */

        /*
            Create a new Contact document using the data
            submitted by the user.
        */

        const contactMessage =
            new Contact({

                name: cleanName,

                email: cleanEmail,

                message: cleanMessage

            });


        /* =================================================
           SAVE TO MONGODB
        ================================================= */

        /*
            .save() sends the document to MongoDB Atlas.
        */

        await contactMessage.save();


        /* =================================================
           SUCCESS RESPONSE
        ================================================= */

        /*
            Send a JSON response back to our frontend.

            Your current script.js already expects:

            data.success
            data.message
        */

        return res.status(201).json({

            success: true,

            message:
                "Your message has been sent successfully."

        });


    } catch (error) {


        /* =================================================
           SERVER ERROR
        ================================================= */

        console.error(
            "Contact form error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to send your message. Please try again later."

        });

    }

};


/* =========================================================
   EXPORT CONTROLLER
========================================================= */

module.exports = {

    createContactMessage

};