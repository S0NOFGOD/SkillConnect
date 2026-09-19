/* =========================================================
   WORKER CREATE SERVICE CONTROLLER
   ---------------------------------------------------------
   This controller handles:

   1. Worker access-token authentication.
   2. Worker account validation.
   3. Service input validation.
   4. Description word-count validation.
   5. Portfolio image validation.
   6. Cloudinary portfolio uploads.
   7. Saving Cloudinary public_id values.
   8. Creating the worker service.
   9. Updating the worker's skills array.
   10. Cleaning up Cloudinary uploads if saving fails.

   Route:

   POST /api/worker/create-service
========================================================= */


/* =========================
   1. IMPORTS
========================= */

/* Node's built-in stream module is used to send image
   buffers directly to Cloudinary. */
const { Readable } = require("stream");

/* JSON Web Token is used to authenticate the access token. */
const jwt = require("jsonwebtoken");

/* Worker database model. */
const Worker = require("../models/worker");

/* Existing Cloudinary configuration. */
const cloudinary = require("../config/cloudinary");


/* =========================
   2. CONSTANTS
========================= */

/* Maximum size allowed for each portfolio image: 5 MB. */
const MAX_PORTFOLIO_IMAGE_SIZE =
    5 * 1024 * 1024;

/* Maximum number of portfolio images allowed. */
const MAX_PORTFOLIO_IMAGES = 3;

/* Maximum number of words allowed in the description. */
const MAX_DESCRIPTION_WORDS = 300;


/* =========================
   3. LOCAL SKILLS
========================= */

/*
   These skills match the skills displayed by the frontend.

   The backend also validates the skill so that a worker cannot
   submit an arbitrary skill value by bypassing the frontend.
*/
const LOCAL_SKILLS = [
    "Swimming Instructor",
    "Barber",
    "Hairdresser",
    "Makeup Artist",
    "Tailor",
    "Fashion Designer",
    "Plumber",
    "Electrician",
    "Painter",
    "Welder",
    "Carpenter",
    "Bricklayer",
    "Cleaner",
    "Laundry Service",
    "Mechanic",
    "Auto Electrician",
    "Phone Repair",
    "Computer Repair",
    "Graphic Designer",
    "Web Developer",
    "Photographer",
    "Videographer",
    "Caterer",
    "Baker",
    "Cook",
    "Event Planner",
    "Interior Decorator",
    "AC Technician",
    "Generator Repair",
    "POP Installer",
    "Tiler",
    "Furniture Maker",
    "Driver",
    "Tutor",
    "Fitness Trainer",
    "Other"
];


/* =========================
   4. EXPERIENCE OPTIONS
========================= */

/*
   These values match the create-service frontend.
*/
const EXPERIENCE_OPTIONS = [
    "Less than 1 year",
    "1 year",
    "2 years",
    "3 years",
    "4 years",
    "5 years+"
];


/* =========================
   5. WORD COUNTER
========================= */

/*
   Count words in the service description.

   Multiple spaces, line breaks and tabs are treated as
   separators.
*/
function countWords(text) {

    if (!text || !text.trim()) {
        return 0;
    }

    return text
        .trim()
        .split(/\s+/)
        .length;
}


/* =========================
   6. CLOUDINARY UPLOAD
========================= */

/*
   Upload one image buffer to Cloudinary.

   The image is kept in memory by Multer, so there is no need
   to create a temporary file on the server.
*/
function uploadImageToCloudinary(
    fileBuffer,
    workerId
) {

    return new Promise((resolve, reject) => {

        /*
           Create the Cloudinary upload stream.
        */
        const uploadStream =
            cloudinary.uploader.upload_stream(
                {
                    /*
                       Keep service portfolio images in their
                       own Cloudinary folder.
                    */
                    folder:
                        `skillconnect/workers/${workerId}/services`,

                    /*
                       Automatically determine the resource type.
                    */
                    resource_type: "image"
                },

                (error, result) => {

                    /*
                       Cloudinary upload failed.
                    */
                    if (error) {
                        reject(error);
                        return;
                    }

                    /*
                       Make sure Cloudinary returned a public_id.
                    */
                    if (
                        !result ||
                        !result.public_id
                    ) {
                        reject(
                            new Error(
                                "Cloudinary did not return a public_id."
                            )
                        );

                        return;
                    }

                    /*
                       Return only the information needed by
                       the database.
                    */
                    resolve({
                        public_id: result.public_id
                    });
                }
            );


        /*
           Convert the Multer Buffer into a readable stream and
           pipe it into Cloudinary.
        */
        Readable
            .from(fileBuffer)
            .pipe(uploadStream);
    });
}


/* =========================
   7. DELETE CLOUDINARY IMAGE
========================= */

/*
   If the database operation fails after images have already
   been uploaded, remove those images from Cloudinary.

   This prevents orphaned portfolio images.
*/
async function deleteCloudinaryImages(
    publicIds
) {

    if (
        !Array.isArray(publicIds) ||
        publicIds.length === 0
    ) {
        return;
    }

    /*
       Delete each uploaded image individually.
    */
    for (const publicId of publicIds) {

        try {

            await cloudinary.uploader.destroy(
                publicId,
                {
                    resource_type: "image"
                }
            );

        } catch (error) {

            /*
               Cleanup failure should not hide the original
               database or service-creation error.
            */
            console.error(
                "Cloudinary cleanup failed:",
                error
            );
        }
    }
}


/* =========================
   8. CREATE WORKER SERVICE
========================= */

async function createWorkerService(
    req,
    res
) {

    /*
       Keep track of uploaded Cloudinary public_ids.

       If a later operation fails, these images can be removed.
    */
    const uploadedPublicIds = [];

    try {

        /* =====================================================
           8.1 AUTHENTICATE ACCESS TOKEN
        ===================================================== */

        /*
           Read the Authorization header.
        */
        const authorization =
            req.headers.authorization;


        /*
           The expected format is:

           Authorization: Bearer ACCESS_TOKEN
        */
        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Authentication required. Please log in again."
            });
        }


        /*
           Extract the token after "Bearer ".
        */
        const accessToken =
            authorization.split(" ")[1];


        if (!accessToken) {

            return res.status(401).json({
                success: false,
                message:
                    "Authentication required. Please log in again."
            });
        }


        /* =====================================================
           8.2 VERIFY ACCESS TOKEN
        ===================================================== */

        let decodedToken;

        try {

            decodedToken =
                jwt.verify(
                    accessToken,
                    process.env.ACCESS_TOKEN_SECRET
                );

        } catch (error) {

            /*
               An expired or invalid access token returns 401.

               The frontend's API_REQUEST() will then attempt
               the refresh-token flow automatically.
            */
            return res.status(401).json({
                success: false,
                message:
                    "Your access token is invalid or expired."
            });
        }


        /* =====================================================
           8.3 VERIFY WORKER TOKEN
        ===================================================== */

        /*
           Worker access tokens must identify the user as a
           worker and contain the worker's database ID.
        */
        const workerId =
            decodedToken.userId ||
            decodedToken.id;


        if (
            decodedToken.userType !== "worker" ||
            !workerId
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to create a service."
            });
        }


        /* =====================================================
           8.4 FIND WORKER
        ===================================================== */

        const worker =
            await Worker.findById(workerId);


        if (!worker) {

            return res.status(404).json({
                success: false,
                message:
                    "Worker account could not be found."
            });
        }


        /* =====================================================
           8.5 CHECK ACCOUNT STATUS
        ===================================================== */

        if (
            worker.accountStatus !== "active"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Your worker account is not active."
            });
        }


        /* =====================================================
           8.6 READ SERVICE DATA
        ===================================================== */

        const skill =
            typeof req.body.skill === "string"
                ? req.body.skill.trim()
                : "";

        const experience =
            typeof req.body.experience === "string"
                ? req.body.experience.trim()
                : "";

        const description =
            typeof req.body.description === "string"
                ? req.body.description.trim()
                : "";


        /* =====================================================
           8.7 VALIDATE SKILL
        ===================================================== */

        if (!skill) {

            return res.status(400).json({
                success: false,
                message:
                    "Please select a skill."
            });
        }


        if (!LOCAL_SKILLS.includes(skill)) {

            return res.status(400).json({
                success: false,
                message:
                    "The selected skill is not valid."
            });
        }


        /* =====================================================
           8.8 VALIDATE EXPERIENCE
        ===================================================== */

        if (!experience) {

            return res.status(400).json({
                success: false,
                message:
                    "Please select your experience."
            });
        }


        if (
            !EXPERIENCE_OPTIONS.includes(
                experience
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "The selected experience is not valid."
            });
        }


        /* =====================================================
           8.9 VALIDATE DESCRIPTION
        ===================================================== */

        if (!description) {

            return res.status(400).json({
                success: false,
                message:
                    "Please enter a service description."
            });
        }


        const descriptionWordCount =
            countWords(description);


        if (
            descriptionWordCount >
            MAX_DESCRIPTION_WORDS
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "The service description cannot exceed 300 words."
            });
        }


        /* =====================================================
           8.10 VALIDATE PORTFOLIO IMAGES
        ===================================================== */

        const portfolioFiles =
            Array.isArray(req.files)
                ? req.files
                : [];


        /*
           At least one portfolio image is required because
           the create-service form contains portfolio uploads.
        */
        if (
            portfolioFiles.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Please upload at least one portfolio image."
            });
        }


        /*
           Never allow more than three images, even if a request
           bypasses the Multer route configuration.
        */
        if (
            portfolioFiles.length >
            MAX_PORTFOLIO_IMAGES
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "You can upload a maximum of 3 portfolio images."
            });
        }


        /* =====================================================
           8.11 VALIDATE EACH IMAGE
        ===================================================== */

        for (
            const file of portfolioFiles
        ) {

            /*
               Confirm the file is an image.
            */
            if (
                !file.mimetype ||
                !file.mimetype.startsWith("image/")
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Only image files can be uploaded."
                });
            }


            /*
               Enforce the 5 MB limit on the backend.
            */
            if (
                file.size >
                MAX_PORTFOLIO_IMAGE_SIZE
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Each portfolio image must not be larger than 5 MB."
                });
            }


            /*
               Make sure Multer actually provided a buffer.
            */
            if (
                !file.buffer ||
                !Buffer.isBuffer(file.buffer)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "One or more portfolio images could not be processed."
                });
            }
        }


        /* =====================================================
           8.12 CREATE NEXT SERVICE ID
        ===================================================== */

        /*
           Service IDs are numbers stored inside the worker's
           services array.

           Find the highest existing ID and increment it.
        */
        let nextServiceId = 1;


        if (
            Array.isArray(worker.services) &&
            worker.services.length > 0
        ) {

            const highestServiceId =
                worker.services.reduce(
                    (highest, service) => {

                        const serviceId =
                            Number(service.id);

                        if (
                            Number.isFinite(serviceId) &&
                            serviceId > highest
                        ) {
                            return serviceId;
                        }

                        return highest;

                    },
                    0
                );


            nextServiceId =
                highestServiceId + 1;
        }


        /* =====================================================
           8.13 UPLOAD PORTFOLIO IMAGES
        ===================================================== */

        const portfolioPublicIds = [];


        for (
            const file of portfolioFiles
        ) {

            const uploadedImage =
                await uploadImageToCloudinary(
                    file.buffer,
                    worker._id.toString()
                );


            /*
               Store only the Cloudinary public_id.

               The Worker model is designed to store public_ids,
               not Cloudinary URLs.
            */
            portfolioPublicIds.push(
                uploadedImage.public_id
            );

            uploadedPublicIds.push(
                uploadedImage.public_id
            );
        }


        /* =====================================================
           8.14 CREATE SERVICE OBJECT
        ===================================================== */

        const newService = {
            id: nextServiceId,
            skill,
            experience,
            description,
            portfolios: portfolioPublicIds,
            date: new Date()
        };


        /* =====================================================
           8.15 SAVE SERVICE
        ===================================================== */

        worker.services.push(
            newService
        );


        /* =====================================================
           8.16 UPDATE WORKER SKILLS
        ===================================================== */

        /*
           A skill should appear only once in the worker's
           skills array.

           This means creating another service under the same
           skill will not create a duplicate skill.
        */
        if (!Array.isArray(worker.skills)) {
            worker.skills = [];
        }


        const hasSkill =
            worker.skills.some(
                existingSkill =>
                    existingSkill
                        .trim()
                        .toLowerCase() ===
                    skill.toLowerCase()
            );


        if (!hasSkill) {

            worker.skills.push(
                skill
            );
        }


        /* =====================================================
           8.17 SAVE WORKER
        ===================================================== */

        await worker.save();


        /* =====================================================
           8.18 SUCCESS RESPONSE
        ===================================================== */

        return res.status(201).json({
            success: true,
            message:
                "Service added successfully.",
            service: {
                id: newService.id,
                skill: newService.skill,
                experience: newService.experience,
                description: newService.description,
                portfolios:
                    newService.portfolios,
                date: newService.date
            }
        });


    } catch (error) {

        /* =====================================================
           8.19 CLEAN UP CLOUDINARY UPLOADS
        ===================================================== */

        /*
           If images were uploaded successfully but a later
           operation failed, remove those images from Cloudinary.
        */
        await deleteCloudinaryImages(
            uploadedPublicIds
        );


        /* Log the complete backend error for debugging. */
        console.error(
            "Create worker service error:",
            error
        );


        /* =====================================================
           8.20 RETURN SERVER ERROR
        ===================================================== */

        return res.status(500).json({
            success: false,
            message:
                "An error occurred while creating your service. Please try again."
        });
    }
}


/* =========================
   9. EXPORT CONTROLLER
========================= */

/*
   Export the controller so the route file can use it.
*/
module.exports = {
    createWorkerService
};