/* =========================================================
   1. PAGE ELEMENTS
========================================================= */

const searchInput =
    document.getElementById("searchInput");

const categoryFilter =
    document.getElementById("categoryFilter");

const priceFilter =
    document.getElementById("priceFilter");

const workerList =
    document.getElementById("workerList");

const emptyState =
    document.getElementById("emptyState");

const emptyStateText =
    document.getElementById("emptyStateText");

const loadingState =
    document.getElementById("loadingState");

const resultsText =
    document.getElementById("resultsText");

const searchFilterSection =
    document.getElementById("searchFilterSection");


/* =========================================================
   NAVIGATION ELEMENTS
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
   NOTIFICATION MODAL ELEMENTS
========================================================= */

const notificationOverlay =
    document.getElementById("notificationOverlay");

const notificationCard =
    notificationOverlay.querySelector(
        ".notification-card"
    );

const notificationIcon =
    document.getElementById("notificationIcon");

const notificationTitle =
    document.getElementById("notificationTitle");

const notificationText =
    document.getElementById("notificationText");

const notificationButton =
    document.getElementById("notificationButton");

const notificationCancelButton =
    document.getElementById(
        "notificationCancelButton"
    );


/* =========================================================
   2. PAGE STATE
========================================================= */

/*
    workers stores the complete worker list
    received from the backend.

    filteredWorkers is not stored separately.
    The list is filtered whenever the search
    or filter values change.
*/

let workers = [];


/*
    This variable stores the action that should
    happen when the user closes the modal.
*/

let notificationAction = null;

let notificationCancelAction = null;


/* =========================================================
   4. PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializePage
);


/* =========================================================
   INITIALIZE PAGE
========================================================= */

async function initializePage() {




    /*
        Set up navigation controls.
    */

    setupNavigation();


    /*
        Set up search and filters.
    */

    setupSearchAndFilters();


    /*
        Set up the fixed search/filter section.
    */

    setupFixedSearch();


    /*
        Authenticate the client and load workers.
    */

    await authenticateAndLoadWorkers();

}


/* =========================================================
   5. LOADING STATE
========================================================= */

function showLoading() {

    loadingState.hidden = false;

    workerList.hidden = true;

    emptyState.hidden = true;

}


/* =========================================================
   HIDE LOADING STATE
========================================================= */

function hideLoading() {

    loadingState.hidden = true;

    workerList.hidden = false;

}


/* =========================================================
   6. GET ACCESS TOKEN
========================================================= */

function getAccessToken() {

    return sessionStorage.getItem(
        "accessToken"
    );

}


/* =========================================================
   7. AUTHENTICATE CLIENT
========================================================= */

async function authenticateAndLoadWorkers() {

    /*
        Check whether the client has an access token.
    */

    const accessToken =
        getAccessToken();


    /* -----------------------------------------------------
       TOKEN DOES NOT EXIST
    ----------------------------------------------------- */

    if (!accessToken) {

        showNotification(
            "error",
            "Authentication Required",
            "Please log in to your client account before searching for workers.",
            "Continue",
            redirectToAuthentication
        );

        return;

    }



    /* -----------------------------------------------------
       SEND TOKEN TO BACKEND
    ----------------------------------------------------- */

    try {

        const response =
            await fetch(
                API_ENDPOINT("/api/client/worker-search"), {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );


        /*
            Safely read the backend response.
        */

        const data =
            await response.json()
                .catch(() => ({}));


        /* -------------------------------------------------
           AUTHENTICATION / ACCOUNT ERROR
        ------------------------------------------------- */

        if (!response.ok) {

            /*
                Remove invalid token.

                This prevents the page from repeatedly
                trying to use an expired token.
            */

            sessionStorage.removeItem(
                "accessToken"
            );


            showNotification(
                "error",
                data.title ||
                    "Authentication Error",
                data.message ||
                    "Your session is invalid or has expired. Please log in again.",
                "Continue",
                redirectToAuthentication
            );


            return;

        }


        /* -------------------------------------------------
           WORKERS SUCCESSFULLY RETRIEVED
        ------------------------------------------------- */

        workers =
            Array.isArray(data.workers)
                ? data.workers
                : [];  


        /*
            Display workers.
        */

        applyFilters();


    } catch (error) {

        console.error(
            "Client worker search error:",
            error
        );


        showNotification(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please try again.",
            "Close"
        );

    }

}


/* =========================================================
   8. DISPLAY WORKERS
========================================================= */

function displayWorkers(workerArray) {

    /*
        Clear the previous worker cards.
    */

    workerList.innerHTML = "";


    /*
        No workers.
    */

    if (!workerArray.length) {

        workerList.hidden = true;

        emptyState.hidden = false;

        resultsText.textContent =
            "No workers match your search.";

        return;

    }


    /*
        Workers exist.
    */

    workerList.hidden = false;

    emptyState.hidden = true;


    resultsText.textContent =
        `${workerArray.length} worker${
            workerArray.length === 1
                ? ""
                : "s"
        } available`;


    /*
        Create each worker card.
    */

    workerArray.forEach(
        createWorkerCard
    );

}


/* =========================================================
   9. CREATE WORKER CARD
========================================================= */

function createWorkerCard(worker) {

    const card =
        document.createElement("article");


    card.className =
        "worker-card";


    /*
        Worker profile picture.
    */

    const image =
        document.createElement("img");


    image.className =
        "worker-photo";


    image.alt =
        `${worker.name || "Worker"} profile picture`;


    /*
        Use the profilePicture returned by
        the backend.

        A fallback image is used if no picture
        exists.
    */

    image.src =
        worker.profilePicture ||
        "../assets/default-profile.png";


    /*
        Prevent broken images from making the
        card look empty.
    */

    image.onerror = function () {

        this.onerror = null;

        this.src =
            "../assets/default-profile.png";

    };


    /* -----------------------------------------------------
       WORKER NAME
    ----------------------------------------------------- */

    const name =
        document.createElement("h2");


    name.textContent =
        worker.name || "Worker";


    /* -----------------------------------------------------
       LOCATION
    ----------------------------------------------------- */

    const location =
        document.createElement("p");


    location.className =
        "location";


    location.textContent =
        formatLocation(worker);

     /* -----------------------------------------------------
   SKILL + PRICE ROW
----------------------------------------------------- */

const skillPriceRow =
    document.createElement("div");


skillPriceRow.className =
    "skill-price-row";


/* -----------------------------------------------------
   WORKER SKILL
----------------------------------------------------- */

const skill =
    document.createElement("p");


skill.className =
    "skill";


skill.textContent =
    worker.primarySkill || "Skill unavailable";


/* -----------------------------------------------------
   WORKER PRICE
----------------------------------------------------- */

const price =
    document.createElement("p");


price.className =
    "price";


price.textContent =
    formatPrice(worker.price);


/*
    Put skill on the left and price on the right.
*/

skillPriceRow.appendChild(skill);

skillPriceRow.appendChild(price);


/* -----------------------------------------------------
   VIEW PROFILE BUTTON
----------------------------------------------------- */

const viewButton =
    document.createElement("button");


viewButton.type =
    "button";


viewButton.className =
    "view-profile-btn";


viewButton.textContent =
    "View Profile";


/*
    Store the worker ID.

    The backend now returns:

    worker.workerId
*/

viewButton.dataset.workerId =
    worker.workerId || "";


viewButton.addEventListener(
    "click",
    function () {

        viewWorkerProfile(
            worker
        );

    }
);


/* -----------------------------------------------------
   BUILD CARD
----------------------------------------------------- */

card.appendChild(image);

card.appendChild(name);

card.appendChild(location);

card.appendChild(skillPriceRow);

card.appendChild(viewButton);


workerList.appendChild(card);

}


/* =========================================================
   10. FORMAT LOCATION
========================================================= */

function formatLocation(worker) {

    const city =
        worker.city ||
        "";

    const state =
        worker.state ||
        "";


    if (city && state) {

        return `${city}, ${state}`;

    }


    return city || state || "Location unavailable";

}


/* =========================================================
   FORMAT WORKER PRICE
========================================================= */

function formatPrice(price) {

    /*
        The Worker model stores startingPrice as a String.

        Examples:

        "5000"
        "₦5000"
        "₦5,000"
        "5000 NGN"
    */

    if (
        price === null ||
        price === undefined ||
        price === ""
    ) {

        return "Price unavailable";

    }


    /*
        Convert the value to a string first.
    */

    const priceText =
        String(price).trim();


    /*
        Remove currency symbols, commas and
        other non-numeric characters.

        This allows values such as:

        ₦5,000

        to become:

        5000
    */

    const numericPrice =
        Number(
            priceText.replace(
                /[^0-9.]/g,
                ""
            )
        );


    /*
        If the value cannot be converted into
        a valid number, display the original
        value instead of hiding the price.
    */

    if (
        Number.isNaN(numericPrice)
    ) {

        return priceText;

    }


    /*
        Display Nigerian Naira.
    */

    return `₦${numericPrice.toLocaleString(
        "en-NG"
    )}`;

}


/* =========================================================
   12. SEARCH AND FILTER SETUP
========================================================= */

function setupSearchAndFilters() {

    searchInput.addEventListener(
        "input",
        applyFilters
    );


    categoryFilter.addEventListener(
        "change",
        applyFilters
    );


    priceFilter.addEventListener(
        "change",
        applyFilters
    );

}


/* =========================================================
   13. APPLY SEARCH AND FILTERS
========================================================= */

function applyFilters() {

    const searchValue =
        searchInput.value
            .trim()
            .toLowerCase();


    const selectedSkill =
        categoryFilter.value
            .trim()
            .toLowerCase();


    const selectedPrice =
        priceFilter.value
            .trim();


    /*
        Filter the original worker list.

        The backend already restricts workers
        to the client's city and state.

        Frontend filtering handles:
        - name
        - skill
        - price
    */

    const filteredWorkers =
        workers.filter(
            worker => {

                /* -----------------------------------------
                   SEARCH FILTER
                ----------------------------------------- */

                const workerName =
                    String(
                        worker.name || ""
                    ).toLowerCase();


                const workerSkill =
                    String(
                        worker.primarSkill ||
                        worker.skill ||
                        ""
                    ).toLowerCase();


                const matchesSearch =
                    !searchValue ||
                    workerName.includes(
                        searchValue
                    ) ||
                    workerSkill.includes(
                        searchValue
                    );


                /* -----------------------------------------
                   SKILL FILTER
                ----------------------------------------- */

                const matchesSkill =
                    !selectedSkill ||
                    workerSkill === selectedSkill ||
                    workerSkill.includes(
                        selectedSkill
                    );


                /* -----------------------------------------
                   PRICE FILTER
                ----------------------------------------- */

                const workerPrice =
                    Number(worker.price);


                let matchesPrice = true;


                if (selectedPrice) {

                    const price =
                        Number(
                            selectedPrice
                        );


                    /*
                        5000 means ₦5,000 and above.
                    */

                    if (price === 5000) {

                        matchesPrice =
                            workerPrice >= 5000;

                    } else {

                        matchesPrice =
                            workerPrice === price;

                    }

                }


                return (
                    matchesSearch &&
                    matchesSkill &&
                    matchesPrice
                );

            }
        );


    /*
        Update the empty-state message depending
        on whether a price filter caused the
        empty result.
    */

    if (!filteredWorkers.length) {

        if (selectedPrice) {

            emptyStateText.textContent =
                `No workers found at this price.`;

        } else {

            emptyStateText.textContent =
                "Try changing your search or filter options.";

        }

    }


    displayWorkers(
        filteredWorkers
    );

}


/* =========================================================
   14. VIEW WORKER PROFILE
========================================================= */

function viewWorkerProfile(worker) {

    /*
        The backend now returns workerId.

        This is the unique ID of the selected worker.
    */

    const workerId =
        worker.workerId;


    /*
        A worker ID is required so the details page
        knows which worker the client selected.
    */

    if (!workerId) {

        showNotification(
            "error",
            "Unable to Open Profile",
            "The selected worker profile could not be opened.",
            "Close"
        );

        return;

    }


    /*
        Store the selected worker ID temporarily.

        This avoids putting authentication tokens
        inside the URL.
    */

    sessionStorage.setItem(
        "selectedWorkerId",
        workerId
    );


    /*
        Open the worker details page.
    */

    window.location.href =
        "../client-worker-details/index.html";

}


/* =========================================================
   15. NAVIGATION SETUP
========================================================= */

function setupNavigation() {

    menuBtn.addEventListener(
        "click",
        openSidebar
    );


    closeMenuBtn.addEventListener(
        "click",
        closeSidebar
    );


    overlay.addEventListener(
        "click",
        closeSidebar
    );


    /*
        Close the mobile sidebar when a navigation
        link is clicked.
    */

    sidebar
        .querySelectorAll(".nav-link")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    closeSidebar
                );

            }
        );

}


/* =========================================================
   16. OPEN SIDEBAR
========================================================= */

function openSidebar() {

    sidebar.classList.add(
        "active"
    );

    overlay.classList.add(
        "active"
    );

    menuBtn.setAttribute(
        "aria-expanded",
        "true"
    );

}


/* =========================================================
   17. CLOSE SIDEBAR
========================================================= */

function closeSidebar() {

    sidebar.classList.remove(
        "active"
    );

    overlay.classList.remove(
        "active"
    );

    menuBtn.setAttribute(
        "aria-expanded",
        "false"
    );

}


/* =========================================================
   18. FIXED SEARCH/FILTER SECTION
========================================================= */

function setupFixedSearch() {

    /*
        Save the original position of the section.
    */

    const sectionTop =
        searchFilterSection.offsetTop;


    window.addEventListener(
        "scroll",
        function () {

            /*
                Once the client scrolls to the search
                section, make it fixed.
            */

            if (
                window.scrollY >=
                sectionTop
            ) {

                searchFilterSection.classList.add(
                    "search-fixed"
                );

            } else {

                searchFilterSection.classList.remove(
                    "search-fixed"
                );

            }

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   19. SHOW NOTIFICATION MODAL
========================================================= */

function showNotification(
    type,
    title,
    message,
    buttonText = "Continue",
    action = null,
    cancelText = null,
    cancelAction = null
) {

    notificationCard.className =
        `notification-card ${type}`;


    notificationIcon.textContent =
        getNotificationIcon(type);


    notificationTitle.textContent =
        title;


    notificationText.textContent =
        message;


    notificationButton.textContent =
        buttonText;


    notificationAction =
        action;


    notificationCancelAction =
        cancelAction;


    /*
        Configure optional cancel button.
    */

    if (cancelAction) {

        notificationCancelButton.hidden =
            false;

        notificationCancelButton.textContent =
            cancelText || "Cancel";

    } else {

        notificationCancelButton.hidden =
            true;

    }


    /*
        Display modal.
    */

    notificationOverlay.hidden =
        false;


    /*
        Prevent background interaction.
    */

    document.body.style.overflow =
        "hidden";


    notificationButton.focus();

}


/* =========================================================
   20. NOTIFICATION ICON
========================================================= */

function getNotificationIcon(type) {

    if (type === "error") {

        return "×";

    }


    if (type === "success") {

        return "✓";

    }


    return "i";

}


/* =========================================================
   21. CLOSE / CONTINUE MODAL
========================================================= */

notificationButton.addEventListener(
    "click",
    function () {

        /*
            Save the action BEFORE closing the modal.

            This is important because closeNotification()
            clears notificationAction.
        */

        const action =
            notificationAction;


        /*
            Close the modal first.
        */

        closeNotification();


        /*
            Execute the saved action AFTER the
            user closes the modal.
        */

        if (
            typeof action ===
            "function"
        ) {

            action();

        }

    }
);


/* =========================================================
   22. CANCEL MODAL
========================================================= */

notificationCancelButton.addEventListener(
    "click",
    function () {

        /*
            Save the cancel action BEFORE closing
            the modal.

            closeNotification() clears the action,
            so it must be saved first.
        */

        const action =
            notificationCancelAction;


        /*
            Close the modal.
        */

        closeNotification();


        /*
            Execute the saved cancel action,
            if one exists.
        */

        if (
            typeof action ===
            "function"
        ) {

            action();

        }

    }
);

/* =========================================================
   23. CLOSE NOTIFICATION
========================================================= */

function closeNotification() {

    notificationOverlay.hidden =
        true;


    document.body.style.overflow =
        "";


    notificationAction =
        null;


    notificationCancelAction =
        null;

}


/* =========================================================
   24. REDIRECT TO AUTHENTICATION
========================================================= */

function redirectToAuthentication() {

    window.location.href =
        "../client-authentication/index.html";

}


/* =========================================================
   25. LOGOUT FLOW
========================================================= */

logoutBtn.addEventListener(
    "click",
    function () {

        showNotification(
            "info",
            "Logout",
            "Are you sure you want to log out?",
            "Logout",
            performLogout,
            "Cancel",
            null
        );

    }
);


/* =========================================================
   26. PERFORM LOGOUT
========================================================= */

function performLogout() {

    /*
        Clear the client access token.
    */

    sessionStorage.removeItem(
        "accessToken"
    );


    /*
        Clear the selected worker as well.
    */

    sessionStorage.removeItem(
        "selectedWorkerId"
    );


    /*
        Redirect to client authentication.
    */

    window.location.href =
        "../client-authentication/index.html";

}