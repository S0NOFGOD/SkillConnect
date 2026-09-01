/* =========================================================
   1. DOM ELEMENTS
========================================================= */

const menuBtn =
    document.getElementById("menuBtn");

const closeMenuBtn =
    document.getElementById("closeMenuBtn");

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");

const logoutBtn =
    document.getElementById("logoutBtn");


/* =========================================================
   2. DASHBOARD ELEMENTS
========================================================= */

const workerFirstName =
    document.getElementById("workerFirstName");

const fullName =
    document.getElementById("fullName");

const phoneNumber =
    document.getElementById("phoneNumber");

const primarySkill =
    document.getElementById("primarySkill");

const yearsExperience =
    document.getElementById("yearsExperience");

const startingPrice =
    document.getElementById("startingPrice");

const serviceDescription =
    document.getElementById("serviceDescription");

const portfolioGrid =
    document.getElementById("portfolioGrid");

const portfolioEmptyState =
    document.getElementById("portfolioEmptyState");

const profileImage =
    document.querySelector(
        ".profile-photo-container img"
    );


const locationElement =
    document.getElementById("location");


/* =========================================================
   3. NOTIFICATION MODAL ELEMENTS
========================================================= */

const notificationOverlay =
    document.getElementById(
        "notificationOverlay"
    );

const notificationCard =
    notificationOverlay
        ? notificationOverlay.querySelector(
            ".notification-card"
        )
        : null;

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

const notificationCancelButton =
    document.getElementById(
        "notificationCancelButton"
    );


/* =========================================================
   4. AUTHENTICATION STORAGE KEYS
========================================================= */

const ACCESS_TOKEN_KEY =
    "accessToken";

const REFRESH_TOKEN_KEY =
    "refreshToken";


/* =========================================================
   5. API ENDPOINTS
========================================================= */

/*
   config.js provides API_ENDPOINT().

   This file does not create another API URL.

   All worker-dashboard requests use the
   worker-dashboard route.
*/


/*
   GET

   Returns the authenticated worker dashboard.
*/

const DASHBOARD_ENDPOINT =
    API_ENDPOINT(
        "/api/worker-dashboard/dashboard"
    );


/*
   POST

   Sends the refreshToken when the current
   accessToken has expired.
*/

const REFRESH_ENDPOINT =
    API_ENDPOINT(
        "/api/worker-dashboard/refresh-token"
    );


/*
   POST

   Logs the worker out and revokes the
   refreshToken.
*/

const LOGOUT_ENDPOINT =
    API_ENDPOINT(
        "/api/worker-dashboard/logout"
    );


/*
   PUT

   Updates the authenticated worker dashboard
   profile.
*/

const UPDATE_DASHBOARD_ENDPOINT =
    API_ENDPOINT(
        "/api/worker-dashboard/dashboard"
    );


/* =========================================================
   6. GET ACCESS TOKEN
========================================================= */

function getAccessToken() {

    return sessionStorage.getItem(
        ACCESS_TOKEN_KEY
    );

}


/* =========================================================
   7. GET REFRESH TOKEN
========================================================= */

function getRefreshToken() {

    return sessionStorage.getItem(
        REFRESH_TOKEN_KEY
    );

}


/* =========================================================
   8. SAVE ACCESS TOKEN
========================================================= */

function saveAccessToken(
    token
) {

    sessionStorage.setItem(
        ACCESS_TOKEN_KEY,
        token
    );

}


/* =========================================================
   9. CLEAR AUTHENTICATION DATA
========================================================= */

function clearAuthenticationData() {

    sessionStorage.removeItem(
        ACCESS_TOKEN_KEY
    );

    sessionStorage.removeItem(
        REFRESH_TOKEN_KEY
    );

}


/* =========================================================
   10. CLOSE SIDEBAR
========================================================= */

function closeSidebar() {

    if (sidebar) {

        sidebar.classList.remove(
            "active"
        );

    }


    if (overlay) {

        overlay.classList.remove(
            "active"
        );

    }


    if (menuBtn) {

        menuBtn.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    if (overlay) {

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

    }

}


/* =========================================================
   11. OPEN SIDEBAR
========================================================= */

function openSidebar() {

    if (sidebar) {

        sidebar.classList.add(
            "active"
        );

    }


    if (overlay) {

        overlay.classList.add(
            "active"
        );

    }


    if (menuBtn) {

        menuBtn.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    if (overlay) {

        overlay.setAttribute(
            "aria-hidden",
            "false"
        );

    }

}


/* =========================================================
   12. SIDEBAR EVENTS
========================================================= */

if (menuBtn) {

    menuBtn.addEventListener(
        "click",
        openSidebar
    );

}


if (closeMenuBtn) {

    closeMenuBtn.addEventListener(
        "click",
        closeSidebar
    );

}


if (overlay) {

    overlay.addEventListener(
        "click",
        closeSidebar
    );

}


/* =========================================================
   13. CLOSE SIDEBAR AFTER NAVIGATION
========================================================= */

const navigationLinks =
    document.querySelectorAll(
        ".sidebar .nav-link"
    );


navigationLinks.forEach(
    function (link) {

        link.addEventListener(
            "click",
            function () {

                closeSidebar();

            }
        );

    }
);


/* =========================================================
   14. SHOW NOTIFICATION MODAL
========================================================= */

function showModal(
    type,
    title,
    message,
    buttonText = "Continue",
    showCancel = false,
    onConfirm = null
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

            notificationIcon.textContent =
                "×";

        } else if (type === "success") {

            notificationIcon.textContent =
                "✓";

        } else {

            notificationIcon.textContent =
                "i";

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


    if (notificationCancelButton) {

        notificationCancelButton.hidden =
            !showCancel;

    }


    /*
       Replace the main button so that
       previous click handlers are removed.
    */

    if (notificationButton) {

        const newButton =
            notificationButton.cloneNode(true);

        notificationButton.replaceWith(
            newButton
        );


        const currentButton =
            document.getElementById(
                "notificationButton"
            );


        currentButton.addEventListener(
            "click",
            function () {

                hideModal();


                if (
                    typeof onConfirm ===
                    "function"
                ) {

                    onConfirm();

                }

            }
        );

    }


    /*
       Replace the cancel button so that
       previous click handlers are removed.
    */

    if (notificationCancelButton) {

        const newCancelButton =
            notificationCancelButton.cloneNode(
                true
            );

        notificationCancelButton.replaceWith(
            newCancelButton
        );


        const currentCancelButton =
            document.getElementById(
                "notificationCancelButton"
            );


        currentCancelButton.addEventListener(
            "click",
            function () {

                hideModal();

            }
        );

    }


    notificationOverlay.hidden =
        false;

}


/* =========================================================
   15. HIDE NOTIFICATION MODAL
========================================================= */

function hideModal() {

    if (!notificationOverlay) {

        return;

    }


    notificationOverlay.hidden =
        true;

}


/* =========================================================
   16. REDIRECT TO WORKER AUTHENTICATION
========================================================= */

function redirectToWorkerAuthentication() {

    window.location.href =
        "../worker-authentication/index.html";

}


/* =========================================================
   17. SHOW AUTHENTICATION ERROR
========================================================= */

function showAuthenticationError(
    message
) {

    showModal(
        "error",
        "Authentication Error",
        message,
        "Continue",
        false,
        function () {

            clearAuthenticationData();

            redirectToWorkerAuthentication();

        }
    );

}


/* =========================================================
   18. REFRESH ACCESS TOKEN
========================================================= */

async function refreshAccessToken() {

    const refreshToken =
        getRefreshToken();


    /*
       A refreshToken is required before
       requesting a new accessToken.
    */

    if (!refreshToken) {

        return false;

    }


    try {

        const response =
            await fetch(
                REFRESH_ENDPOINT,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        refreshToken:
                            refreshToken

                    })

                }
            );


        const data =
            await response.json();


        /*
           The backend rejected the refreshToken.
        */

        if (!response.ok) {

            return false;

        }


        /*
           Get the newly issued accessToken.
        */

        const newAccessToken =
            data.accessToken ||
            data.token;


        if (!newAccessToken) {

            return false;

        }


        /*
           Save the new accessToken.
        */

        saveAccessToken(
            newAccessToken
        );


        return true;

    } catch (error) {

        console.error(
            "Refresh token error:",
            error
        );

        return false;

    }

}


/* =========================================================
   19. REQUEST WORKER DASHBOARD
========================================================= */

async function requestDashboard() {

    const accessToken =
        getAccessToken();


    /*
       No accessToken exists.

       The worker must authenticate again.
    */

    if (!accessToken) {

        showAuthenticationError(
            "Your session could not be found. Please sign in again."
        );

        return;

    }


    try {

        const response =
            await fetch(
                DASHBOARD_ENDPOINT,
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


        const data =
            await response.json();


        /*
           IMPORTANT:

           Only refresh when the backend explicitly
           identifies the accessToken as expired.

           Your backend should return something such as:

           {
               success: false,
               code: "ACCESS_TOKEN_EXPIRED",
               message: "Access token expired."
           }
        */

        const tokenExpired =
            data.code ===
            "ACCESS_TOKEN_EXPIRED";


        if (tokenExpired) {

            const refreshed =
                await refreshAccessToken();


            /*
               Refresh failed.

               The worker must authenticate again.
            */

            if (!refreshed) {

                showAuthenticationError(
                    "Your session has expired. Please sign in again."
                );

                return;

            }


            /*
               Refresh succeeded.

               Retry the dashboard request
               with the new accessToken.
            */

            return requestDashboard();

        }


        /*
           Any other authentication failure
           means the accessToken is invalid.

           Do NOT attempt refresh.
        */

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            showAuthenticationError(
                data.message ||
                "Your authentication is invalid. Please sign in again."
            );

            return;

        }


        /*
           Handle other backend errors.
        */

        if (!response.ok) {

            showModal(
                "error",
                "Dashboard Error",
                data.message ||
                "Unable to load your dashboard.",
                "Continue"
            );

            return;

        }


        /*
           Authentication succeeded.

           Display the worker profile.
        */

        displayWorkerDashboard(
            data
        );

        console.log(
    "Dashboard display function completed."
);

console.log(
    "Visible fullName:",
    fullName?.textContent
);

console.log(
    "Visible phone:",
    phoneNumber?.textContent
);

console.log(
    "Visible skill:",
    primarySkill?.textContent
);

console.log(
    "Visible experience:",
    yearsExperience?.textContent
);

console.log(
    "Visible price:",
    startingPrice?.textContent
);

console.log(
    "Visible description:",
    serviceDescription?.textContent
);

console.log(
    "Visible profile image:",
    profileImage?.src
);

    } catch (error) {

        console.error(
            "Dashboard request error:",
            error
        );


        showModal(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please try again.",
            "Continue"
        );

    }

}


/* =========================================================
   20. EXTRACT WORKER DATA
========================================================= */

function getWorkerFromResponse(
    data
) {

    if (
        data &&
        data.worker
    ) {

        return data.worker;

    }


    if (
        data &&
        data.data
    ) {

        return data.data;

    }


    return data || {};

}


/* =========================================================
   21. DISPLAY WORKER DASHBOARD
========================================================= */

function displayWorkerDashboard(
    data
) {
    const worker =
        getWorkerFromResponse(
            data
        );


    /*
       PERSONAL INFORMATION
    */

    const workerFullName =
        worker.fullName ||
        worker.name ||
        "—";


    const workerPhone =
        worker.phone ||
        "—";


    /*
       PROFESSIONAL INFORMATION
    */

    const workerSkill =
        worker.primarySkill ||
        "—";


    const workerExperience =
        worker.experience ||
        worker.yearsExperience ||
        "—";


    const workerStartingPrice =
        worker.startingPrice ??
        "—";


    const workerLocation =
        formatLocation(
            worker.location
        );


    /*
       SERVICE DESCRIPTION
    */

    const workerDescription =
        worker.description ||
        worker.serviceDescription ||
        "No service description available.";


    /*
       PROFILE PICTURE
    */

    const workerProfilePicture =
        worker.profilePicture ||
        "";


    /*
       UPDATE DASHBOARD HEADER
    */

    if (workerFirstName) {

        workerFirstName.textContent =
            getFirstName(
                workerFullName
            );

    }


    /*
       UPDATE FULL NAME
    */

    if (fullName) {

        fullName.textContent =
            workerFullName;

    }


    /*
       UPDATE PHONE
    */

    if (phoneNumber) {

        phoneNumber.textContent =
            workerPhone;

    }


    /*
       UPDATE PRIMARY SKILL
    */

    if (primarySkill) {

        primarySkill.textContent =
            workerSkill;

    }


    /*
       UPDATE EXPERIENCE
    */

    if (yearsExperience) {

        yearsExperience.textContent =
            formatExperience(
                workerExperience
            );

    }


    /*
       UPDATE STARTING PRICE
    */

    if (startingPrice) {

        startingPrice.textContent =
            formatPrice(
                workerStartingPrice
            );

    }


    /*
       UPDATE LOCATION
    */

    if (locationElement) {

        locationElement.textContent =
            workerLocation;

    }


    /*
       UPDATE DESCRIPTION
    */

    if (serviceDescription) {

        serviceDescription.textContent =
            workerDescription;

    }


    /*
       UPDATE PROFILE IMAGE
    */

    displayProfilePicture(
        workerProfilePicture
    );


    /*
       UPDATE PORTFOLIO
    */

    displayPortfolio(
        worker.portfolioImages
    );

}


/* =========================================================
   22. GET FIRST NAME
========================================================= */

function getFirstName(
    fullName
) {

    if (
        !fullName ||
        fullName === "—"
    ) {

        return "Worker";

    }


    return String(
        fullName
    )
        .trim()
        .split(/\s+/)[0];

}


/* =========================================================
   23. FORMAT EXPERIENCE
========================================================= */

function formatExperience(
    experience
) {

    if (
        experience === null ||
        experience === undefined ||
        experience === "" ||
        experience === "—"
    ) {

        return "—";

    }


    const value =
        String(
            experience
        );


    if (
        value
            .toLowerCase()
            .includes("year")
    ) {

        return value;

    }


    return `${value} years`;

}


/* =========================================================
   24. FORMAT PRICE
========================================================= */

function formatPrice(
    price
) {

    if (
        price === null ||
        price === undefined ||
        price === "" ||
        price === "—"
    ) {

        return "—";

    }


    if (
        typeof price === "string" &&
        /₦|NGN/i.test(price)
    ) {

        return price;

    }


    const numericPrice =
        Number(
            price
        );


    if (
        Number.isFinite(
            numericPrice
        )
    ) {

        return `₦${numericPrice.toLocaleString(
            "en-NG"
        )}`;

    }


    return String(
        price
    );

}


/* =========================================================
   25. FORMAT LOCATION
========================================================= */

function formatLocation(
    location
) {

    if (!location) {

        return "—";

    }


    if (
        typeof location === "string"
    ) {

        return location;

    }


    if (
        typeof location === "object"
    ) {

        const parts = [

            location.city,

            location.state,

            location.country

        ].filter(
            Boolean
        );


        if (parts.length) {

            return parts.join(
                ", "
            );

        }


        if (
            location.address
        ) {

            return location.address;

        }

    }


    return "—";

}


/* =========================================================
   26. DISPLAY PROFILE PICTURE
========================================================= */

function displayProfilePicture(
    imageUrl
) {

    if (!profileImage) {

        return;

    }


    if (!imageUrl) {

        profileImage.removeAttribute(
            "src"
        );

        return;

    }


    profileImage.src =
        imageUrl;


    profileImage.alt =
        "Worker profile picture";


    profileImage.onerror =
        function () {

            profileImage.removeAttribute(
                "src"
            );

        };

}


/* =========================================================
   27. DISPLAY PORTFOLIO
========================================================= */

function displayPortfolio(
    portfolioImages
) {

    if (!portfolioGrid) {

        return;

    }


    portfolioGrid.innerHTML =
        "";


    const images =
        Array.isArray(
            portfolioImages
        )
            ? portfolioImages
            : [];


    if (!images.length) {

        if (portfolioEmptyState) {

            portfolioEmptyState.hidden =
                false;

        }

        return;

    }


    if (portfolioEmptyState) {

        portfolioEmptyState.hidden =
            true;

    }


    images.forEach(
        function (
            image,
            index
        ) {

            const imageUrl =
                typeof image === "string"
                    ? image
                    : image?.url ||
                      image?.imageUrl ||
                      image?.path ||
                      "";


            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "portfolio-card";


            if (imageUrl) {

                const img =
                    document.createElement(
                        "img"
                    );

                img.className =
                    "portfolio-image";

                img.src =
                    imageUrl;

                img.alt =
                    `Previous work ${
                        index + 1
                    }`;

                img.loading =
                    "lazy";


                img.onerror =
                    function () {

                        img.remove();

                        const fallback =
                            createPortfolioFallback();

                        card.insertBefore(
                            fallback,
                            card.firstChild
                        );

                    };


                card.appendChild(
                    img
                );

            } else {

                card.appendChild(
                    createPortfolioFallback()
                );

            }


            const label =
                document.createElement(
                    "div"
                );

            label.className =
                "portfolio-label";

            label.textContent =
                `Previous Work ${
                    index + 1
                }`;


            card.appendChild(
                label
            );


            portfolioGrid.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   28. CREATE PORTFOLIO FALLBACK
========================================================= */

function createPortfolioFallback() {

    const fallback =
        document.createElement(
            "div"
        );

    fallback.className =
        "portfolio-fallback";

    fallback.textContent =
        "🛠️";

    fallback.setAttribute(
        "aria-hidden",
        "true"
    );


    return fallback;

}


/* =========================================================
   29. LOGOUT CONFIRMATION
========================================================= */

function showLogoutConfirmation() {

    showModal(
        "info",
        "Logout",
        "Are you sure you want to logout?",
        "Logout",
        true,
        function () {

            performLogout();

        }
    );

}


/* =========================================================
   30. LOGOUT REQUEST
========================================================= */

async function performLogout() {

    const refreshToken =
        getRefreshToken();


    try {

        /*
           Send the refreshToken to the
           worker-dashboard logout endpoint.
        */

        if (refreshToken) {

            await fetch(
                LOGOUT_ENDPOINT,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        refreshToken:
                            refreshToken

                    })

                }
            );

        }

    } catch (error) {

        /*
           Local authentication data is still
           removed even if the network request fails.
        */

        console.error(
            "Logout request error:",
            error
        );

    }


    /*
       Remove authentication data.
    */

    clearAuthenticationData();


    /*
       Redirect to worker authentication.
    */

    redirectToWorkerAuthentication();

}


/* =========================================================
   31. LOGOUT BUTTON EVENT
========================================================= */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        showLogoutConfirmation
    );

}


/* =========================================================
   32. START DASHBOARD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
           Start the dashboard authentication
           and profile request.
        */

        requestDashboard();

    }
);