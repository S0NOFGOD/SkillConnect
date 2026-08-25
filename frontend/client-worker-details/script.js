/* =========================================================
   CLIENT WORKER DETAILS
   script.js

   PURPOSE:
   Controls the client worker-details page.

   MAIN FLOW:

   1. Check access token
   2. Check worker ID
   3. Request worker details
   4. Validate authentication
   5. Validate client account status
   6. Validate worker status
   7. Find worker
   8. Display worker details
   9. Configure Contact Worker
   10. Configure Rate Worker
   11. Handle Back button

   IMPORTANT:
   - NO LOADING STATE
   - NO LOADING SPINNER
   - NO LOADING MESSAGE
   - Authentication errors use modals
   - Worker errors use modals
   - Success/error responses use modals
========================================================= */


/* =========================================================
   1. GLOBAL PAGE STATE
========================================================= */

/*
   Stores the worker returned by the backend.
*/
let currentWorker = null;


/*
   Stores the worker phone number.
*/
let workerPhoneNumber = null;


/*
   Stores a redirect that should happen after
   the user closes the modal.
*/
let pendingRedirectUrl = null;



/* =========================================================
   2. DOM ELEMENTS
========================================================= */

const backButton =
    document.getElementById("backButton");


const verifiedBadge =
    document.getElementById("verifiedBadge");


const portfolioImages =
    document.getElementById("portfolioImages");


const workerDescription =
    document.getElementById("workerDescription");


const workerSkill =
    document.getElementById("workerSkill");


const workerExperience =
    document.getElementById("workerExperience");


const workerPrice =
    document.getElementById("workerPrice");


const workerLocation =
    document.getElementById("workerLocation");


const workerRating =
    document.getElementById("workerRating");


const ratingStars =
    document.getElementById("ratingStars");


const reviewCount =
    document.getElementById("reviewCount");


const reviewsList =
    document.getElementById("reviewsList");


const contactWorkerButton =
    document.getElementById("contactWorkerButton");


const rateWorkerButton =
    document.getElementById("rateWorkerButton");



/* =========================================================
   3. NOTIFICATION MODAL ELEMENTS
========================================================= */

const notificationOverlay =
    document.getElementById(
        "notificationOverlay"
    );


const notificationCard =
    document.getElementById(
        "notificationCard"
    );


const notificationIcon =
    document.getElementById(
        "notificationIcon"
    );


const notificationTitle =
    document.getElementById(
        "notificationTitle"
    );


const notificationText =
    document.getElementById(
        "notificationText"
    );


const notificationButton =
    document.getElementById(
        "notificationButton"
    );



/* =========================================================
   4. SHOW NOTIFICATION
========================================================= */

/*
   Displays the notification modal.

   Types:
   - error
   - success
   - info
*/
function showNotification(
    type,
    title,
    message,
    buttonText = "Continue"
) {

    if (!notificationOverlay) {
        return;
    }


    if (notificationCard) {

        notificationCard.classList.remove(
            "error",
            "success",
            "info"
        );


        notificationCard.classList.add(
            type
        );

    }


    if (notificationIcon) {

        if (type === "error") {

            notificationIcon.textContent = "×";

        }

        else if (type === "success") {

            notificationIcon.textContent = "✓";

        }

        else {

            notificationIcon.textContent = "i";

        }

    }


    if (notificationTitle) {

        notificationTitle.textContent =
            title;

    }


    if (notificationText) {

        notificationText.textContent =
            message;

    }


    if (notificationButton) {

        notificationButton.textContent =
            buttonText;

    }


    notificationOverlay.hidden =
        false;

}



/* =========================================================
   5. CLOSE NOTIFICATION
========================================================= */

/*
   Closes the modal.

   If a redirect is waiting, the redirect
   happens only after the user closes the modal.
*/
function closeNotification() {

    if (!notificationOverlay) {
        return;
    }


    notificationOverlay.hidden =
        true;


    if (pendingRedirectUrl) {

        const redirectUrl =
            pendingRedirectUrl;


        pendingRedirectUrl = null;


        window.location.href =
            redirectUrl;

    }

}



/* =========================================================
   6. NOTIFICATION BUTTON
========================================================= */

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        closeNotification
    );

}



/* =========================================================
   7. SHOW ERROR AND REDIRECT
========================================================= */

/*
   Displays an error modal.

   The user must press Continue before
   the redirect happens.
*/
function showErrorAndRedirect(
    title,
    message,
    redirectUrl
) {

    pendingRedirectUrl =
        redirectUrl;


    showNotification(
        "error",
        title,
        message,
        "Continue"
    );

}



/* =========================================================
   8. GET ACCESS TOKEN
========================================================= */

function getAccessToken() {

    return sessionStorage.getItem(
        "accessToken"
    );

}



/* =========================================================
   9. GET WORKER ID
========================================================= */

/*
   The worker ID is stored by the
   client-worker-search page.

   Storage key:

       selectedWorkerId
*/
function getWorkerId() {

    const workerId =
        sessionStorage.getItem(
            "selectedWorkerId"
        );


    console.log(
        "CLIENT WORKER DETAILS - selectedWorkerId:",
        workerId
    );


    return workerId;

}



/* =========================================================
   10. CHECK ACCESS TOKEN
========================================================= */

/*
   If there is no access token:

       Authentication Required
              ↓
       User closes modal
              ↓
       Client Authentication
*/
function checkAccessToken() {

    const accessToken =
        getAccessToken();


    if (!accessToken) {

        showErrorAndRedirect(
            "Authentication Required",
            "Please log in to continue.",
            "../client-authentication/index.html"
        );


        return false;

    }


    return true;

}



/* =========================================================
   11. CHECK WORKER ID
========================================================= */

/*
   If no worker ID exists:

       Worker Not Found
              ↓
       User closes modal
              ↓
       Worker Search
*/
function checkWorkerId() {

    const workerId =
        getWorkerId();


    if (!workerId) {

        showErrorAndRedirect(
            "Worker Not Found",
            "The worker you are trying to view could not be found.",
            "../client-worker-search/index.html"
        );


        return false;

    }


    return true;

}



/* =========================================================
   12. REQUEST WORKER DETAILS
========================================================= */

async function loadWorkerDetails() {

    const accessToken =
        getAccessToken();


    const workerId =
        getWorkerId();


    try {

        console.log(
            "CLIENT WORKER DETAILS - Requesting worker:",
            workerId
        );


        const endpoint =
            API_ENDPOINT(
                `/api/client/worker-details/${encodeURIComponent(workerId)}`
            );


        console.log(
            "CLIENT WORKER DETAILS - API endpoint:",
            endpoint
        );


        const response =
            await fetch(
                endpoint,
                {
                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"

                    }

                }
            );


        console.log(
            "CLIENT WORKER DETAILS - HTTP status:",
            response.status
        );



        /* =================================================
           13. READ BACKEND RESPONSE
        ================================================= */

        let data = {};


        try {

            data =
                await response.json();

        }

        catch (jsonError) {

            console.error(
                "CLIENT WORKER DETAILS - Invalid JSON response:",
                jsonError
            );


            data = {};

        }



        console.log(
            "CLIENT WORKER DETAILS - Backend response:",
            data
        );



        /* =================================================
           14. AUTHENTICATION ERROR
        ================================================= */

        if (response.status === 401) {

            showErrorAndRedirect(
                "Authentication Required",
                "Your session has expired or is no longer valid. Please log in again.",
                "../client-authentication/index.html"
            );


            return;

        }



        /* =================================================
           15. ACCOUNT / WORKER STATUS ERROR
        ================================================= */

        if (response.status === 403) {


            /* ---------------------------------------------
               CLIENT ACCOUNT ERROR
            --------------------------------------------- */

            if (
                data.errorType ===
                "ACCOUNT_ERROR"
            ) {

                showErrorAndRedirect(
                    "Account Inactive",
                    "Your account is inactive or suspended.",
                    "../client-authentication/index.html"
                );


                return;

            }



            /* ---------------------------------------------
               WORKER ERROR
            --------------------------------------------- */

            if (
                data.errorType ===
                "WORKER_ERROR"
            ) {

                showErrorAndRedirect(
                    "Worker Unavailable",
                    "This worker is currently unavailable.",
                    "../client-worker-search/index.html"
                );


                return;

            }



            /* ---------------------------------------------
               UNKNOWN 403
            --------------------------------------------- */

            showNotification(
                "error",
                "Access Denied",
                data.message ||
                "You do not have permission to view this worker."
            );


            return;

        }



        /* =================================================
           16. WORKER NOT FOUND
        ================================================= */

        if (response.status === 404) {

            showErrorAndRedirect(
                "Worker Not Found",
                "The worker you are trying to view could not be found.",
                "../client-worker-search/index.html"
            );


            return;

        }



        /* =================================================
           17. OTHER BACKEND ERRORS
        ================================================= */

        if (!response.ok) {

            showNotification(
                "error",
                "Unable to Load Worker",
                data.message ||
                "Unable to load worker information. Please try again."
            );


            return;

        }



        /* =================================================
           18. GET WORKER DATA
        ================================================= */

        const worker =
            data.worker ||
            data.data ||
            null;


        console.log(
            "CLIENT WORKER DETAILS - Worker:",
            worker
        );


        /*
           Make sure the backend returned
           a valid worker object.
        */
        if (
            !worker ||
            typeof worker !== "object" ||
            Array.isArray(worker)
        ) {

            showErrorAndRedirect(
                "Worker Not Found",
                "The worker information could not be loaded.",
                "../client-worker-search/index.html"
            );


            return;

        }



        /* =================================================
           19. STORE WORKER
        ================================================= */

        currentWorker =
            worker;



        /* =================================================
           20. STORE WORKER PHONE
        ================================================= */

        workerPhoneNumber =
            worker.phone ||
            worker.phoneNumber ||
            worker.workerPhone ||
            null;



        /* =================================================
           21. DISPLAY WORKER
        ================================================= */

        displayWorkerDetails(
            worker
        );



        console.log(
            "CLIENT WORKER DETAILS - Worker displayed successfully."
        );

    }


    catch (error) {

        console.error(
            "CLIENT WORKER DETAILS - Request error:",
            error
        );


        showNotification(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please check your internet connection and try again."
        );

    }

}



/* =========================================================
   22. DISPLAY WORKER DETAILS
========================================================= */

function displayWorkerDetails(
    worker
) {

    /* ---------------------------------------------
       Verification
    --------------------------------------------- */

    displayVerification(
        worker
    );


    /* ---------------------------------------------
       Portfolio
    --------------------------------------------- */

    displayPortfolio(
        worker.portfolioImages ||
        worker.portfolio ||
        worker.images
    );


    /* ---------------------------------------------
       Description
    --------------------------------------------- */

    if (workerDescription) {

        workerDescription.textContent =
            worker.description ||
            "No description provided.";

    }


    /* ---------------------------------------------
       Primary Skill
    --------------------------------------------- */

    if (workerSkill) {

        workerSkill.textContent =
            worker.primarySkill ||
            worker.skill ||
            "—";

    }


    /* ---------------------------------------------
       Experience
    --------------------------------------------- */

    if (workerExperience) {

        workerExperience.textContent =
            worker.experience ||
            "—";

    }


    /* ---------------------------------------------
       Starting Price
    --------------------------------------------- */

    if (workerPrice) {

        workerPrice.textContent =
            formatPrice(
                worker.startingPrice
            );

    }


    /* ---------------------------------------------
       Location
    --------------------------------------------- */

    if (workerLocation) {

        workerLocation.textContent =
            formatLocation(
                worker.location,
                worker.city,
                worker.state
            );

    }


    /* ---------------------------------------------
       Rating and Reviews
    --------------------------------------------- */

    displayRating(
        worker.rating,
        worker.reviews
    );


    /* ---------------------------------------------
       Contact Worker
    --------------------------------------------- */

    configureContactButton(
        worker
    );

}



/* =========================================================
   23. DISPLAY VERIFICATION
========================================================= */

function displayVerification(
    worker
) {

    if (!verifiedBadge) {
        return;
    }


    const isVerified =
        worker.verified === true ||
        worker.isVerified === true;


    if (isVerified) {

        verifiedBadge.hidden =
            false;


        verifiedBadge.style.display =
            "inline-flex";

    }

    else {

        verifiedBadge.hidden =
            true;


        verifiedBadge.style.display =
            "none";

    }

}



/* =========================================================
   24. DISPLAY PORTFOLIO
========================================================= */

function displayPortfolio(
    images
) {

    if (!portfolioImages) {
        return;
    }


    /*
       Normalize portfolio.
    */
    let portfolio =
        Array.isArray(images)
            ? images
            : [];


    /*
       Remove invalid/empty values.
    */
    portfolio =
        portfolio.filter(
            image =>
                typeof image === "string" &&
                image.trim() !== ""
        );


    /*
       Only display the first three.
    */
    portfolio =
        portfolio.slice(
            0,
            3
        );


    /*
       No portfolio images.
    */
    if (portfolio.length === 0) {

        portfolioImages.innerHTML = `

            <div
                class="empty-reviews"
                style="grid-column: 1 / -1;"
            >
                No portfolio images available.
            </div>

        `;


        return;

    }


    /*
       Create image elements.
    */
    portfolioImages.innerHTML =
        portfolio
            .map(
                (image, index) => `

                    <img
                        src="${escapeHtmlAttribute(image)}"
                        alt="Worker portfolio image ${index + 1}"
                        class="portfolio-image"
                        loading="lazy"
                    >

                `
            )
            .join("");


    /*
       Add image error handling.
    */
    const imageElements =
        portfolioImages.querySelectorAll(
            ".portfolio-image"
        );


    imageElements.forEach(
        imageElement => {

            imageElement.addEventListener(
                "error",
                function () {

                    console.error(
                        "Portfolio image failed to load:",
                        this.src
                    );


                    this.style.display =
                        "none";

                }
            );

        }
    );

}



/* =========================================================
   25. FORMAT PRICE
========================================================= */

function formatPrice(
    price
) {

    if (
        price === null ||
        price === undefined ||
        price === ""
    ) {

        return "—";

    }


    /*
       Already formatted price.
    */
    if (
        typeof price === "string" &&
        /[₦$£€]/.test(price)
    ) {

        return price;

    }


    /*
       Convert to number.
    */

       const numericPrice =
        Number(
            String(price)
                .replace(/,/g, "")
                .replace(/[₦$£€]/g, "")
                .trim()
        );


    if (
        Number.isNaN(
            numericPrice
        )
    ) {

        return String(price);

    }


    return (
        `₦${numericPrice.toLocaleString("en-NG")}`
    );

}



/* =========================================================
   26. FORMAT LOCATION
========================================================= */

function formatLocation(
    location,
    city,
    state
) {

    /*
       Location is already a string.
    */
    if (
        typeof location === "string" &&
        location.trim() !== ""
    ) {

        return location;

    }


    /*
       Location is an object.
    */
    if (
        location &&
        typeof location === "object"
    ) {

        const locationCity =
            location.city ||
            city ||
            "";


        const locationState =
            location.state ||
            location.stateName ||
            state ||
            "";


        const combined =
            [
                locationCity,
                locationState
            ]
                .filter(Boolean)
                .join(", ");


        if (combined) {

            return combined;

        }

    }


    /*
       Separate city/state fields.
    */
    const combined =
        [
            city,
            state
        ]
            .filter(Boolean)
            .join(", ");


    return combined || "—";

}



/* =========================================================
   27. DISPLAY RATING
========================================================= */

function displayRating(
    rating,
    reviews
) {

    const reviewArray =
        Array.isArray(reviews)
            ? reviews
            : [];


    const numericRating =
        Number(rating);


    if (
        Number.isFinite(
            numericRating
        ) &&
        numericRating > 0
    ) {

        if (workerRating) {

            workerRating.textContent =
                numericRating.toFixed(1);

        }


        if (ratingStars) {

            ratingStars.textContent =
                createStars(
                    numericRating
                );

        }

    }

    else {

        if (workerRating) {

            workerRating.textContent =
                "—";

        }


        if (ratingStars) {

            ratingStars.textContent =
                "★★★★★";

        }

    }


    /*
       Review count.
    */
    if (reviewCount) {

        const count =
            reviewArray.length;


        reviewCount.textContent =
            count === 0
                ? "No reviews yet"
                : `${count} ${
                    count === 1
                        ? "review"
                        : "reviews"
                }`;

    }


    /*
       Actual reviews.
    */
    displayReviews(
        reviewArray
    );

}



/* =========================================================
   28. CREATE RATING STARS
========================================================= */

function createStars(
    rating
) {

    const roundedRating =
        Math.round(
            Math.max(
                0,
                Math.min(
                    5,
                    rating
                )
            )
        );


    return (
        "★".repeat(
            roundedRating
        ) +
        "☆".repeat(
            5 - roundedRating
        )
    );

}



/* =========================================================
   29. DISPLAY REVIEWS
========================================================= */

function displayReviews(
    reviews
) {

    if (!reviewsList) {
        return;
    }


    /*
       No reviews.
    */
    if (
        !Array.isArray(reviews) ||
        reviews.length === 0
    ) {

        reviewsList.innerHTML = `

            <div class="empty-reviews">
                No reviews yet.
            </div>

        `;


        return;

    }


    /*
       Create review cards.
    */
    reviewsList.innerHTML =
        reviews
            .map(
                review => {

                    const reviewerName =
                        review.clientName ||
                        review.reviewerName ||
                        review.name ||
                        "Client";


                    const reviewRating =
                        Number(
                            review.rating
                        );


                    const reviewText =
                        review.comment ||
                        review.review ||
                        review.text ||
                        "No review text provided.";


                    return `

                        <article
                            class="review-item"
                        >

                            <div
                                class="review-item-header"
                            >

                                <span
                                    class="review-item-name"
                                >
                                    ${escapeHtml(
                                        reviewerName
                                    )}
                                </span>


                                <span
                                    class="review-item-rating"
                                >
                                    ${createStars(
                                        Number.isFinite(
                                            reviewRating
                                        )
                                            ? reviewRating
                                            : 0
                                    )}
                                </span>

                            </div>


                            <p
                                class="review-item-text"
                            >
                                ${escapeHtml(
                                    reviewText
                                )}
                            </p>

                        </article>

                    `;

                }
            )
            .join("");

}



/* =========================================================
   30. CONFIGURE CONTACT WORKER
========================================================= */

function configureContactButton(
    worker
) {

    if (!contactWorkerButton) {
        return;
    }


    const phone =
        worker.phone ||
        worker.phoneNumber ||
        worker.workerPhone ||
        null;


    workerPhoneNumber =
        phone;


    /*
       No phone number.
    */
    if (!phone) {

        contactWorkerButton.href =
            "#";


        contactWorkerButton.setAttribute(
            "aria-disabled",
            "true"
        );


        return;

    }


    /*
       Clean phone number.
    */
    const cleanPhone =
        String(phone)
            .trim()
            .replace(
                /[^\d+]/g,
                ""
            );


    contactWorkerButton.href =
        `tel:${cleanPhone}`;


    contactWorkerButton.removeAttribute(
        "aria-disabled"
    );

}



/* =========================================================
   31. CONTACT WORKER CLICK
========================================================= */

if (contactWorkerButton) {

    contactWorkerButton.addEventListener(
        "click",
        function (event) {

            if (!workerPhoneNumber) {

                event.preventDefault();


                showNotification(
                    "error",
                    "Phone Number Unavailable",
                    "This worker does not currently have a contact phone number available."
                );

            }

        }
    );

}



/* =========================================================
   32. RATE WORKER FLOW
========================================================= */

if (rateWorkerButton) {

    rateWorkerButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            /*
               Make sure a worker was actually loaded.
            */
            if (!currentWorker) {

                showNotification(
                    "error",
                    "Worker Unavailable",
                    "Worker information has not been loaded yet."
                );


                return;

            }


            /*
               Store the worker ID so the
               rating page knows which worker
               is being rated.
            */
            const workerId =
                currentWorker.id ||
                currentWorker._id ||
                currentWorker.workerId;


            if (workerId) {

                sessionStorage.setItem(
                    "selectedWorkerId",
                    String(workerId)
                );

            }


            window.location.href =
                "../client-worker-ratings/index.html";

        }
    );

}



/* =========================================================
   33. BACK BUTTON
========================================================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "../client-worker-search/index.html";

        }
    );

}



/* =========================================================
   34. ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}



/* =========================================================
   35. ESCAPE HTML ATTRIBUTE
========================================================= */

function escapeHtmlAttribute(
    value
) {

    return escapeHtml(
        value
    );

}



/* =========================================================
   36. INITIALIZE PAGE
========================================================= */

/*
   IMPORTANT:

   There is intentionally NO loading state here.

   The page immediately performs:

       Access Token Check
              ↓
       Worker ID Check
              ↓
       API Request
              ↓
       Display Worker
*/
async function initializePage() {

    console.log(
        "CLIENT WORKER DETAILS - Initializing page..."
    );


    /*
       Check authentication.
    */
    if (!checkAccessToken()) {

        return;

    }


    /*
       Check worker ID.
    */
    if (!checkWorkerId()) {

        return;

    }


    /*
       Request worker details.
    */
    await loadWorkerDetails();

}



/* =========================================================
   37. START PAGE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);