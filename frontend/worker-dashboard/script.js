/* =========================================================
   SKILLCONNECT WORKER DASHBOARD
   worker-dashboard/script.js

   PURPOSE:
   1. Load the authenticated worker dashboard.
   2. Display worker information.
   3. Display the worker profile photo.
   4. Handle phone verification.
   5. Send phone OTP.
   6. Handle logout.
   7. Protect authenticated requests.
   8. Keep backend-request modals visible while
      the request is running.
   9. Show loading state on every button that
      directly starts a backend request.
========================================================= */


/* =========================================================
   1. BACKEND ENDPOINTS
========================================================= */

const DASHBOARD_ENDPOINT =
    "/api/worker/dashboard";

const SEND_PHONE_OTP_ENDPOINT =
    "/api/worker/send-phone-otp";

const LOGOUT_ENDPOINT =
    "/api/worker/logout";


/* =========================================================
   2. PAGE ELEMENTS
========================================================= */

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");

const menuBtn =
    document.getElementById("menuBtn");

const closeMenuBtn =
    document.getElementById("closeMenuBtn");

const viewServicesBtn =
    document.getElementById("viewServicesBtn");

const editProfileBtn =
    document.getElementById("editProfileBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const verificationActionBtn =
    document.getElementById(
        "verificationActionBtn"
    );


/* =========================================================
   3. DASHBOARD DATA ELEMENTS
========================================================= */

const workerFirstName =
    document.getElementById(
        "workerFirstName"
    );

const fullName =
    document.getElementById(
        "fullName"
    );

const phoneNumber =
    document.getElementById(
        "phoneNumber"
    );

const country =
    document.getElementById(
        "country"
    );

const state =
    document.getElementById(
        "state"
    );

const city =
    document.getElementById(
        "city"
    );

const lga =
    document.getElementById(
        "lga"
    );

const totalSkills =
    document.getElementById(
        "totalSkills"
    );

const phoneVerification =
    document.getElementById(
        "phoneVerification"
    );


/* =========================================================
   3A. PROFILE PHOTO ELEMENTS
========================================================= */

const profilePhoto =
    document.getElementById(
        "profilePhoto"
    );

const profilePhotoPlaceholder =
    document.getElementById(
        "profilePhotoPlaceholder"
    );


/* =========================================================
   4. NOTIFICATION MODAL ELEMENTS
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

const notificationCloseButton =
    document.getElementById(
        "notificationCancelButton"
    );

const notificationButton =
    document.getElementById(
        "notificationButton"
    );


/* =========================================================
   5. MODAL STATE
========================================================= */

/*
   Stores the function that should run when
   the modal Continue button is clicked.
*/

let modalAction = null;


/*
   Determines whether the modal should remain
   visible while modalAction is running.

   TRUE:
   Backend request is running.
   Keep modal visible so loading can be seen.

   FALSE:
   Normal modal action.
   Hide modal before running the action.
*/

let keepModalOpenDuringAction = false;


/* =========================================================
   6. MODAL FUNCTIONS
========================================================= */

function showModal(
    title,
    message,
    type = "info",
    action = null,
    buttonText = "OK",
    keepOpenDuringAction = false
) {

    notificationTitle.textContent =
        title;

    notificationText.textContent =
        message;

    notificationButton.textContent =
        buttonText;


    notificationCard.className =
        `notification-card ${type}`;


    modalAction =
        action;


    keepModalOpenDuringAction =
        keepOpenDuringAction;


    notificationCloseButton.hidden =
        false;


    notificationOverlay.hidden =
        false;


    notificationOverlay.classList.add(
        "active"
    );
}


/* =========================================================
   7. HIDE MODAL
========================================================= */

function hideModal(
    executeAction = false
) {

    notificationOverlay.classList.remove(
        "active"
    );

    notificationOverlay.hidden =
        true;


    const action =
        modalAction;


    modalAction = null;

    keepModalOpenDuringAction =
        false;


    if (
        executeAction &&
        action
    ) {

        action();
    }
}


/* =========================================================
   8. CLOSE MODAL
========================================================= */

function closeModal() {

    /*
       If the modal action is a backend request,
       do NOT hide the modal first.

       The backend function will control when
       the modal disappears.
    */

    if (
        modalAction &&
        keepModalOpenDuringAction
    ) {

        const action =
            modalAction;

        modalAction = null;

        keepModalOpenDuringAction =
            false;

        action();

        return;
    }


    /*
       Normal modal actions hide the modal first.
    */

    hideModal(true);
}


/* =========================================================
   9. MODAL EVENTS
========================================================= */

notificationButton.addEventListener(
    "click",
    closeModal
);


notificationCloseButton.addEventListener(
    "click",
    () => {

        /*
           Do not allow the close button to
           interfere while a backend request
           is running.
        */

        if (
            notificationButton.disabled
        ) {
            return;
        }


        hideModal(false);

    }
);


/* =========================================================
   10. LOADING STATE
========================================================= */

/*
   Adds a visible loading state to a button.

   While loading:
   - The button is disabled.
   - The button receives .is-loading.
   - The original button text is temporarily
     replaced with "Processing..."
   - CSS displays the spinner.
*/

function setLoading(
    button,
    loading
) {

    if (!button) {
        return;
    }


    if (loading) {

        /*
           Prevent duplicate loading initialization.
        */

        if (
            !button.dataset.originalText
        ) {

            button.dataset.originalText =
                button.textContent.trim();
        }


        button.disabled =
            true;


        button.classList.add(
            "is-loading"
        );


        button.textContent =
            "Processing...";


        return;
    }


    /*
       Restore the original button text.
    */

    button.disabled =
        false;


    button.classList.remove(
        "is-loading"
    );


    if (
        button.dataset.originalText
    ) {

        button.textContent =
            button.dataset.originalText;

        delete button.dataset.originalText;
    }
}


/* =========================================================
   11. AUTHENTICATION
========================================================= */

function redirectToAuthentication() {

    window.location.href =
        "../worker-authentication/index.html";
}


function handleAuthenticationError(
    message =
        "Your session has expired. Please log in again."
) {

    removeAccessToken();

    showModal(
        "Authentication Required",
        message,
        "error",
        redirectToAuthentication,
        "Continue"
    );
}


function checkAccessToken() {

    const accessToken =
        getAccessToken();

    if (!accessToken) {

        showModal(
            "Authentication Required",
            "Please log in to access your worker dashboard.",
            "error",
            redirectToAuthentication,
            "Continue"
        );

        return false;
    }

    return true;
}


/* =========================================================
   12. LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    if (!checkAccessToken()) {
        return;
    }


    try {

        const response =
            await API_REQUEST(
                DASHBOARD_ENDPOINT,
                {
                    method: "GET"
                }
            );


        if (
            response.status === 401
        ) {
            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            showModal(
                "Unable to Load Dashboard",
                data.message ||
                    "Something went wrong while loading your dashboard.",
                "error"
            );

            return;
        }


        displayWorkerData(
            data
        );

    }

    catch (error) {

        console.error(
            "Dashboard request failed:",
            error
        );


        showModal(
            "Connection Error",
            "Unable to connect to the server. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   13. DISPLAY WORKER DATA
========================================================= */

function displayWorkerData(data) {

    const worker =
        data.worker || data;


    const name =
        worker.fullName || "";


    fullName.textContent =
        name || "Not provided";

    phoneNumber.textContent =
        worker.phone || "Not provided";

    country.textContent =
        worker.country || "Not provided";

    state.textContent =
        worker.state || "Not provided";

    city.textContent =
        worker.city || "Not provided";

    lga.textContent =
        worker.lga || "Not provided";


    workerFirstName.textContent =
        name.split(" ")[0] ||
        "Worker";


    totalSkills.textContent =
        worker.totalSkills ?? 0;


    displayProfilePhoto(
        worker.profilePhoto
    );


    checkPhoneVerification(
        worker.phoneVerificationExpires
    );
}


/* =========================================================
   14. DISPLAY PROFILE PHOTO
========================================================= */

function displayProfilePhoto(photoUrl) {

    if (
        !profilePhoto ||
        !profilePhotoPlaceholder
    ) {
        return;
    }


    profilePhoto.hidden =
        true;

    profilePhotoPlaceholder.hidden =
        true;


    profilePhoto.onload =
        null;

    profilePhoto.onerror =
        null;


    if (
        !photoUrl ||
        typeof photoUrl !== "string" ||
        !photoUrl.trim()
    ) {

        profilePhoto.removeAttribute(
            "src"
        );

        profilePhotoPlaceholder.hidden =
            false;

        return;
    }


    profilePhoto.onload = () => {

        profilePhoto.hidden =
            false;

        profilePhotoPlaceholder.hidden =
            true;
    };


    profilePhoto.onerror = () => {

        profilePhoto.hidden =
            true;

        profilePhoto.removeAttribute(
            "src"
        );

        profilePhotoPlaceholder.hidden =
            false;
    };


    profilePhoto.hidden =
        true;


    profilePhoto.src =
        photoUrl.trim();
}


/* =========================================================
   15. PHONE VERIFICATION
========================================================= */

function checkPhoneVerification(
    phoneVerificationExpires
) {

    const expiryTime =
        phoneVerificationExpires
            ? new Date(
                phoneVerificationExpires
            ).getTime()
            : NaN;


    if (
        !phoneVerificationExpires ||
        Number.isNaN(expiryTime) ||
        expiryTime <= Date.now()
    ) {

        showVerificationPrompt();

        return;
    }


    phoneVerification.textContent =
        "Verified";


    startVerificationCountdown(
        expiryTime
    );
}


/* =========================================================
   16. VERIFICATION PROMPT
========================================================= */

function showVerificationPrompt() {

    phoneVerification.textContent =
        "Unverified";


    verificationActionBtn.textContent =
        "Verify Profile";


    showModal(
        "Verify Your Profile",
        "Verify your profile to be discovered by nearby clients.",
        "info",
        sendPhoneOtp,
        "Continue",

        /*
           IMPORTANT:

           Keep this modal open while the
           phone OTP backend request runs.
        */

        true
    );
}


/* =========================================================
   17. VERIFICATION COUNTDOWN
========================================================= */

let countdownTimer = null;


function startVerificationCountdown(
    expiryTime
) {

    clearInterval(
        countdownTimer
    );


    updateVerificationCountdown(
        expiryTime
    );


    countdownTimer =
        setInterval(
            () => {

                if (
                    expiryTime <=
                    Date.now()
                ) {

                    clearInterval(
                        countdownTimer
                    );


                    showVerificationPrompt();

                    return;
                }


                updateVerificationCountdown(
                    expiryTime
                );

            },
            1000
        );
}


function updateVerificationCountdown(
    expiryTime
) {

    verificationActionBtn.textContent =
        formatCountdown(
            expiryTime
        );
}


function formatCountdown(
    expiryTime
) {

    const totalSeconds =
        Math.floor(
            Math.max(
                0,
                expiryTime - Date.now()
            ) / 1000
        );


    const days =
        Math.floor(
            totalSeconds / 86400
        );


    const hours =
        Math.floor(
            (totalSeconds % 86400) /
            3600
        );


    const minutes =
        Math.floor(
            (totalSeconds % 3600) /
            60
        );


    const seconds =
        totalSeconds % 60;


    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}


/* =========================================================
   18. VERIFY PROFILE BUTTON
========================================================= */

verificationActionBtn.addEventListener(
    "click",
    () => {

        if (
            verificationActionBtn.textContent.trim() !==
            "Verify Profile"
        ) {

            return;
        }


        showVerificationPrompt();
    }
);


/* =========================================================
   19. SEND PHONE OTP
========================================================= */

async function sendPhoneOtp() {

    /*
       The verification modal is STILL visible.

       Therefore the user can actually see
       the loading state.
    */

    setLoading(
        notificationButton,
        true
    );


    try {

        const response =
            await API_REQUEST(
                SEND_PHONE_OTP_ENDPOINT,
                {
                    method: "POST"
                }
            );


        if (
            response.status === 401
        ) {

            setLoading(
                notificationButton,
                false
            );

            hideModal(false);

            return;
        }


        const data =
            await response.json();


        /* -------------------------------------------------
           BACKEND ERROR
        ------------------------------------------------- */

        if (!response.ok) {

            setLoading(
                notificationButton,
                false
            );


            hideModal(false);


            showModal(
                "Verification Error",
                data.message ||
                    "Unable to send verification code.",
                "error"
            );


            return;
        }


        /* -------------------------------------------------
           SAVE PHONE NUMBER
        ------------------------------------------------- */

        if (data.phone) {

            sessionStorage.setItem(
                "workerPhone",
                data.phone
            );
        }


        /* -------------------------------------------------
           REQUEST SUCCESS

           Stop loading while the current modal
           is still visible.
        ------------------------------------------------- */

        setLoading(
            notificationButton,
            false
        );


        /*
           Now hide the verification modal.
        */

        hideModal(false);


        /*
           Display the success modal.

           User must click Continue manually.
        */

        showModal(
            "OTP Sent",
            data.message ||
                "A verification code has been sent to your phone.",
            "success",

            () => {

                window.location.href =
                    "../worker-phone-otp/index.html";

            },

            "Continue"
        );

    }

    catch (error) {

        console.error(
            "Phone OTP request failed:",
            error
        );


        setLoading(
            notificationButton,
            false
        );


        hideModal(false);


        showModal(
            "Connection Error",
            "Unable to send the verification code. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   20. MOBILE SIDEBAR
========================================================= */

function openSidebar() {

    sidebar.classList.add(
        "active"
    );

    overlay.classList.add(
        "active"
    );
}


function closeSidebar() {

    sidebar.classList.remove(
        "active"
    );

    overlay.classList.remove(
        "active"
    );
}


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


/* =========================================================
   21. DASHBOARD NAVIGATION
========================================================= */

viewServicesBtn.addEventListener(
    "click",
    () => {

        window.location.href =
            "../worker-services/index.html";
    }
);


editProfileBtn.addEventListener(
    "click",
    () => {

        window.location.href =
            "../worker-edit-profile/index.html";
    }
);


/* =========================================================
   22. LOGOUT CONFIRMATION
========================================================= */

logoutBtn.addEventListener(
    "click",
    () => {

        showModal(
            "Logout",
            "Are you sure you want to log out.",
            "confirm",
            logoutWorker,
            "Logout",

            true
        );
    }
);


/* =========================================================
   23. LOGOUT REQUEST
========================================================= */

async function logoutWorker() {

    /*
       The confirmation modal remains visible.

       The Logout button now changes to:

           Processing... [spinner]

       and becomes disabled.
    */

    setLoading(
        notificationButton,
        true
    );


    try {

        const response =
            await API_REQUEST(
                LOGOUT_ENDPOINT,
                {
                    method: "POST"
                }
            );


        if (
            response.status === 401
        ) {

            setLoading(
                notificationButton,
                false
            );


            hideModal(false);

            return;
        }


        const data =
            await response.json();


        /* -------------------------------------------------
           LOGOUT ERROR
        ------------------------------------------------- */

        if (!response.ok) {

            setLoading(
                notificationButton,
                false
            );


            /*
               Replace the confirmation modal
               with the error modal.
            */

            showModal(
                "Logout Failed",
                data.message ||
                    "Unable to log out. Please try again.",
                "error"
            );


            return;
        }


        /* -------------------------------------------------
           SUCCESSFUL LOGOUT
        ------------------------------------------------- */

        removeAccessToken();


        /*
           Stop loading before replacing
           the modal with the success message.
        */

        setLoading(
            notificationButton,
            false
        );


        hideModal(false);


        /*
           User must manually click Continue
           before redirecting.
        */

        showModal(
            "Logged Out",
            data.message ||
                "You have been logged out successfully.",
            "success",

            redirectToAuthentication,

            "Continue"
        );

    }

    catch (error) {

        console.error(
            "Logout request failed:",
            error
        );


        setLoading(
            notificationButton,
            false
        );


        hideModal(false);


        showModal(
            "Connection Error",
            "Unable to log out at this time. Please try again.",
            "error"
        );
    }
}


/* =========================================================
   24. SESSION EXPIRED EVENT
========================================================= */

window.addEventListener(
    "authSessionExpired",
    () => {

        handleAuthenticationError();

    }
);


/* =========================================================
   25. INITIALIZE DASHBOARD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

    }
);