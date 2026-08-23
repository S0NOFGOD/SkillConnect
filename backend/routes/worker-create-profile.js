/* =========================================================
   SKILLCONNECT WORKER CREATE PROFILE ROUTES

   This file defines the API routes used by the
   Worker Create Profile page.

   This route handles:

   1. Receiving worker profile information
   2. Receiving the profile photo
   3. Receiving exactly 3 portfolio images
   4. Passing the request to the controller

   IMPORTANT:

   The route does NOT:

   - Save workers to MongoDB
   - Upload files to Cloudinary
   - Validate the complete profile
   - Decide whether the worker's email is verified

   Those responsibilities belong to the controller.
========================================================= */


/* =========================================================
   IMPORT EXPRESS
========================================================= */

/*
    Express Router allows us to create a separate
    route file for worker profile operations.
*/

const express =
    require("express");


/* =========================================================
   CREATE ROUTER
========================================================= */

/*
    This router will later be mounted inside server.js
    at:

    /api/auth/worker

    Therefore:

    router.post("/create-profile")

    becomes:

    POST /api/auth/worker/create-profile
*/

const router =
    express.Router();


/* =========================================================
   IMPORT MULTER
========================================================= */

/*
    Multer handles multipart/form-data.

    Our Worker Create Profile form contains:

    - Text fields
    - Profile image
    - Portfolio images

    Normal express.json() cannot process uploaded
    image files.

    Multer allows us to receive them.
*/

const multer =
    require("multer");


/* =========================================================
   MULTER STORAGE CONFIGURATION
========================================================= */

/*
    We temporarily keep uploaded files in memory.

    The controller will later send these files
    to Cloudinary.

    This means we do NOT need to permanently save
    uploaded images inside the backend server.
*/

const upload =
    multer({

        /*
            Store uploaded files in memory.

            Each file will be available as a Buffer.

            Example:

            req.file
            req.files
        */

        storage:
            multer.memoryStorage(),

        /*
            Basic file size protection.

            Each uploaded image may be up to 5 MB.

            This prevents extremely large files from
            unnecessarily consuming server memory.
        */

        limits: {

            fileSize:
                5 * 1024 * 1024

        },

        /*
            Only allow image files.

            We still perform additional validation
            inside the controller.
        */

        fileFilter:
            (req, file, callback) => {

                const allowedTypes = [

                    "image/jpeg",

                    "image/png",

                    "image/webp"

                ];


                /*
                    Check the uploaded file's MIME type.
                */

                if (
                    allowedTypes.includes(
                        file.mimetype
                    )
                ) {

                    return callback(
                        null,
                        true
                    );

                }


                /*
                    Reject unsupported files.
                */

                return callback(

                    new Error(
                        "Only JPG, PNG and WEBP images are allowed."
                    )

                );

            }

    });


/* =========================================================
   IMPORT CONTROLLER
========================================================= */

/*
    The controller contains the actual business logic.

    It will:

    1. Authenticate the worker
    2. Find the worker by email
    3. Check email verification
    4. Validate profile information
    5. Upload profile image to Cloudinary
    6. Upload portfolio images to Cloudinary
    7. Save profile information
    8. Set profileCompleted = true
    9. Return a success response
*/

const {

    createWorkerProfile

} =
    require("../controllers/worker-create-profile");


/* =========================================================
   CREATE WORKER PROFILE
========================================================= */

/*
    Endpoint:

    POST /api/auth/worker/create-profile


    Expected request:

    multipart/form-data


    Text fields:

    email
    fullName
    phone
    primarySkill
    experience
    startingPrice
    state
    city
    description


    Files:

    profilePicture
    portfolioImages


    The frontend sends:

    profilePicture:
        1 image

    portfolioImages:
        3 images
*/

router.post(

    "/create-profile",

    /*
        Receive the uploaded files.

        "profilePicture":

            Exactly one profile photo.

        "portfolioImages":

            Up to three portfolio images.

        We use maxCount = 3 here because the frontend
        validation and controller will enforce that
        exactly 3 are required.
    */

    upload.fields([

        {

            name:
                "profilePicture",

            maxCount:
                1

        },

        {

            name:
                "portfolioImages",

            maxCount:
                3

        }

    ]),

    /*
        Pass the complete request to the controller.

        The controller receives:

            req.body

        and:

            req.files
    */

    createWorkerProfile

);


/* =========================================================
   MULTER ERROR HANDLER
========================================================= */

/*
    Multer errors happen before the controller runs.

    Examples:

    - File is larger than 5 MB
    - More than 3 portfolio images
    - Unsupported image type
    - Invalid multipart upload

    We convert those errors into a clean JSON
    response so the frontend can display them
    inside its notification modal.
*/

router.use(

    (error, req, res, next) => {

        /*
            Check whether the error came from Multer.
        */

        if (
            error instanceof multer.MulterError
        ) {

            /*
                File size exceeded.
            */

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Each image must be 5 MB or smaller."

                });

            }


            /*
                Too many files were uploaded.
            */

            if (
                error.code ===
                "LIMIT_UNEXPECTED_FILE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Too many files were uploaded. Please upload 1 profile photo and exactly 3 portfolio images."

                });

            }


            /*
                Other Multer errors.
            */

            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "There was a problem uploading your images."

            });

        }


        /*
            Handle file-type errors generated by
            our custom fileFilter.
        */

        if (
            error
        ) {

            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "There was a problem uploading your files."

            });

        }


        /*
            Pass unknown errors to Express's
            default error handler.
        */

        next(error);

    }

);


/* =========================================================
   EXPORT ROUTER
========================================================= */

/*
    server.js will import this router using:

    const workerCreateProfileRoutes =
        require("./routes/worker-create-profile");

    and mount it using:

    app.use(
        "/api/auth/worker",
        workerCreateProfileRoutes
    );
*/

module.exports =
    router;