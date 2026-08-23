/* =========================================================
   SKILLCONNECT WORKER CREATE PROFILE CONTROLLER

   This controller handles the complete Worker Create
   Profile backend process.

   FLOW:

   1. Receive profile data
   2. Find worker by email
   3. Check worker exists
   4. Check email verification
   5. Validate profile information
   6. Validate profile photo
   7. Validate exactly 3 portfolio images
   8. Upload profile photo to Cloudinary
   9. Upload portfolio images to Cloudinary
   10. Save profile information
   11. Set profileCompleted = true
   12. Save worker
   13. Return success response

   IMPORTANT:

   This controller does NOT trust frontend validation.

   Everything important is validated again on the
   backend before anything is saved.
========================================================= */


/* =========================================================
   IMPORT WORKER MODEL
========================================================= */

/*
    The Worker model allows us to:

    - Find the worker
    - Update the worker profile
    - Save the completed profile
*/

const Worker =
    require("../models/worker");


/* =========================================================
   IMPORT CLOUDINARY
========================================================= */

/*
    This configuration connects our application
    to Cloudinary using values from:

    backend/.env

    The configuration file is:

    config/cloudinary.js
*/

const cloudinary =
    require("../config/cloudinary");


/* =========================================================
   CLOUDINARY UPLOAD HELPER
========================================================= */

/*
    This function uploads an image Buffer to Cloudinary.

    Multer stores our uploaded images in memory.

    Therefore:

        file.buffer

    contains the actual image data.

    Cloudinary's upload_stream() allows us to upload
    that Buffer directly without saving the image
    permanently on our server.
*/

const uploadToCloudinary =
    (file, folder) => {

        return new Promise(

            (resolve, reject) => {

                /*
                    Create a Cloudinary upload stream.
                */

                const uploadStream =
                    cloudinary.uploader.upload_stream(

                        {

                            /*
                                Store worker profile images
                                inside the SkillConnect folder.
                            */

                            folder:

                                `skillconnect/workers/${folder}`,

                            /*
                                Automatically determine
                                the correct image format.
                            */

                            resource_type:
                                "image"

                        },

                        /*
                            Cloudinary returns the uploaded
                            image information here.
                        */

                        (error, result) => {

                            /*
                                Upload failed.
                            */

                            if (error) {

                                return reject(
                                    error
                                );

                            }


                            /*
                                Upload succeeded.
                            */

                            resolve(result);

                        }

                    );


                /*
                    Send the image Buffer to Cloudinary.
                */

                uploadStream.end(
                    file.buffer
                );

            }

        );

    };


/* =========================================================
   CREATE WORKER PROFILE
========================================================= */

/*
    This controller handles:

    POST /api/auth/worker/create-profile
*/

const createWorkerProfile =
    async (req, res) => {

        try {

            /* ================================================
               1. GET PROFILE DATA
            ================================================ */

            /*
                Text fields sent through
                multipart/form-data are available
                through req.body.
            */

            const {

                email,

                fullName,

                phone,

                primarySkill,

                experience,

                startingPrice,

                state,

                city,

                description

            } =
                req.body;


            /* ================================================
               2. FIND WORKER EMAIL
            ================================================ */

            /*
                Email is required because our current
                profile flow identifies the worker
                using their email.
            */

            if (
                !email ||
                typeof email !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Worker email is required."

                });

            }


            /*
                Normalize the email before searching.

                This prevents problems caused by:

                Worker@Gmail.com

                versus:

                worker@gmail.com
            */

            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* ================================================
               3. FIND WORKER
            ================================================ */

            const worker =
                await Worker.findOne({

                    email:
                        normalizedEmail

                });


            /* ================================================
               4. WORKER DOES NOT EXIST
            ================================================ */

            if (!worker) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Worker account was not found."

                });

            }


            /* ================================================
                5. CHECK EMAIL VERIFICATION
               ================================================ */



if (
    worker.isEmailVerified !== true
) {

    return res.status(403).json({

        success: false,

        code:
            "EMAIL_NOT_VERIFIED",

        message:
            "Please verify your email before completing your profile.",

        /*
            Tell the frontend exactly
            what should happen next.
        */

        nextStep:
            "email-otp"

    });

}


            /* ================================================
               6. CHECK ACCOUNT STATUS
            ================================================ */

            /*
                Suspended workers must not be allowed
                to complete or modify their profile.
            */

            if (
                worker.accountStatus ===
                "suspended"
            ) {

                return res.status(403).json({

                    success: false,

                    code:
                        "ACCOUNT_SUSPENDED",

                    message:
                        "Your worker account has been suspended."

                });

            }


            /* ================================================
               7. VALIDATE PERSONAL INFORMATION
            ================================================ */

            const trimmedFullName =
                typeof fullName === "string"
                    ? fullName.trim()
                    : "";


            const trimmedPhone =
                typeof phone === "string"
                    ? phone.trim()
                    : "";


            if (
                trimmedFullName.length < 2
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter your full name."

                });

            }


            if (
                trimmedPhone.length < 10
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid phone number."

                });

            }


            /* ================================================
               8. VALIDATE PROFESSIONAL INFORMATION
            ================================================ */

            if (
                !primarySkill ||
                !primarySkill.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select your primary skill."

                });

            }


            if (
                !experience ||
                !experience.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select your years of experience."

                });

            }


            if (
                !startingPrice ||
                !startingPrice.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select your starting price."

                });

            }


            /* ================================================
               9. VALIDATE LOCATION
            ================================================ */

            /*
                Location now uses:

                    State
                    City

                instead of browser GPS.

                Example:

                    State:
                    Oyo

                    City:
                    Ogbomoso
            */

            if (
                !state ||
                !state.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select your state."

                });

            }


            if (
                !city ||
                !city.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select your city."

                });

            }


            /* ================================================
               10. VALIDATE DESCRIPTION
            ================================================ */

            const trimmedDescription =
                typeof description === "string"
                    ? description.trim()
                    : "";


            if (
                trimmedDescription.length < 20
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide at least 20 characters describing your service."

                });

            }


            /* ================================================
   10.1 VALIDATE DESCRIPTION WORD LIMIT
================================================ */

/*
    The frontend allows a maximum of:

        150 words

    The backend must enforce the SAME rule.

    This prevents someone from bypassing the
    frontend validation by sending a request
    directly to the API.
*/

const descriptionWordCount =
    trimmedDescription
        ? trimmedDescription.split(/\s+/).length
        : 0;


/*
    Reject descriptions containing more than
    150 words.
*/

if (
    descriptionWordCount > 150
) {

    return res.status(400).json({

        success: false,

        code:
            "DESCRIPTION_TOO_LONG",

        message:
            "Your service description must not exceed 150 words."

    });

}


            /* ================================================
               11. GET UPLOADED FILES
            ================================================ */

            /*
                Because our route uses:

                    upload.fields()

                uploaded files are available through:

                    req.files
            */

            const profilePictures =
                req.files &&
                req.files.profilePicture
                    ? req.files.profilePicture
                    : [];


            const portfolioImages =
                req.files &&
                req.files.portfolioImages
                    ? req.files.portfolioImages
                    : [];


            /* ================================================
               12. VALIDATE PROFILE PHOTO
            ================================================ */

            if (
                profilePictures.length !== 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please upload exactly one profile photo."

                });

            }


            /* ================================================
               13. VALIDATE PORTFOLIO IMAGES
            ================================================ */

            if (
                portfolioImages.length !== 3
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please upload exactly 3 portfolio images."

                });

            }


            /* ================================================
               14. VALIDATE IMAGE TYPES
            ================================================ */

            const allowedMimeTypes = [

                "image/jpeg",

                "image/png",

                "image/webp"

            ];


            /*
                Validate profile photo MIME type.
            */

            if (
                !allowedMimeTypes.includes(
                    profilePictures[0].mimetype
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Profile photo must be JPG, PNG or WEBP."

                });

            }


            /*
                Validate every portfolio image.
            */

            for (
                const image
                of portfolioImages
            ) {

                if (
                    !allowedMimeTypes.includes(
                        image.mimetype
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Portfolio images must be JPG, PNG or WEBP."

                    });

                }

            }


            /* ================================================
               15. UPLOAD PROFILE PHOTO
            ================================================ */

            /*
                Upload the profile photo first.

                We wait for Cloudinary to finish before
                continuing.
            */

            const profileUpload =
                await uploadToCloudinary(

                    profilePictures[0],

                    "profile"

                );


            /* ================================================
               16. UPLOAD PORTFOLIO IMAGES
            ================================================ */

            /*
                Upload all three portfolio images.

                Promise.all() allows the three uploads
                to happen efficiently.
            */

            const portfolioUploads =
                await Promise.all(

                    portfolioImages.map(

                        image =>

                            uploadToCloudinary(

                                image,

                                "portfolio"

                            )

                    )

                );


            /* ================================================
               17. SAVE PROFILE INFORMATION
            ================================================ */

            /*
                Save the uploaded Cloudinary URLs
                and worker profile information.

                IMPORTANT:

                These field names must also exist
                in the Worker model.
            */

            worker.fullName =
                trimmedFullName;


            worker.phone =
                trimmedPhone;


            worker.primarySkill =
                primarySkill.trim();


            worker.experience =
                experience.trim();


            worker.startingPrice =
                startingPrice.trim();


            worker.state =
                state.trim();


            worker.city =
                city.trim();


            worker.description =
                trimmedDescription;


            worker.profilePicture =
                profileUpload.secure_url;


            worker.portfolioImages =
                portfolioUploads.map(

                    upload => ({

                        url:
                            upload.secure_url,

                        publicId:
                            upload.public_id

                    })

                );


            /* ================================================
               18. MARK PROFILE AS COMPLETED
            ================================================ */

            worker.profileCompleted =
                true;


            /* ================================================
               19. SAVE WORKER
            ================================================ */

            await worker.save();


            /* ================================================
               20. SUCCESS RESPONSE
            ================================================ */

            /*
                The frontend will receive this response
                and display a SUCCESS MODAL.

                The frontend should then redirect to:

                ../worker-client-chats/index.html
            */

            return res.status(200).json({

                success: true,

                message:
                    "Your worker profile has been completed successfully.",

                redirect:
                    "../worker-client-chats/index.html"

            });

        }


        /* =====================================================
           ERROR HANDLING
        ===================================================== */

        catch (error) {

            /*
                Log the complete error on the backend
                so we can debug the problem.
            */

            console.error(

                "Worker create profile error:",

                error

            );


            /* ================================================
               CLOUDINARY ERROR
            ================================================ */

            if (
                error.http_code ||
                error.name ===
                    "CloudinaryError"
            ) {

                return res.status(500).json({

                    success: false,

                    code:
                        "IMAGE_UPLOAD_ERROR",

                    message:
                        "We could not upload your images. Please try again."

                });

            }


            /* ================================================
               MONGOOSE VALIDATION ERROR
            ================================================ */

            if (
                error.name ===
                "ValidationError"
            ) {

                return res.status(400).json({

                    success: false,

                    code:
                        "PROFILE_VALIDATION_ERROR",

                    message:
                        "Some profile information is invalid. Please check your information and try again."

                });

            }


            /* ================================================
               GENERAL SERVER ERROR
            ================================================ */

            return res.status(500).json({

                success: false,

                code:
                    "SERVER_ERROR",

                message:
                    "Something went wrong while creating your profile. Please try again."

            });

        }

    };


/* =========================================================
   EXPORT CONTROLLER
========================================================= */

/*
    The route file imports this controller using:

    const {
        createWorkerProfile
    } = require("../controllers/worker-create-profile");
*/

module.exports = {

    createWorkerProfile

};