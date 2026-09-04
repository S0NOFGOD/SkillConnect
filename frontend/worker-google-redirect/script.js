/* =========================================================
   1. INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeNotificationModal();
    initializeReturnButton();
    initializeGoogleExchange();

});


/* =========================================================
   2. ELEMENT HELPER
========================================================= */

const getElement = (id) =>
    document.getElementById(id);


/* =========================================================
   3. SESSION STORAGE
========================================================= */

function saveWorkerEmail(email) {

    sessionStorage.setItem(
        "workerEmail",
        email
    );

}


function saveAccessToken(token) {

    sessionStorage.setItem(
        "accessToken",
        token
    );

}


/* =========================================================
   4. NOTIFICATION MODAL
========================================================= */

let pendingRedirect = null;


function showModal(
    title,
    message,
    type = "error",
    redirect = null
) {

    getElement("notificationTitle")
        .textContent = title;

    getElement("notificationMessage")
        .textContent = message;

    getElement("notificationIcon")
        .textContent =
            type === "success" ? "✓" : "!";

    pendingRedirect = redirect;

    const modal =
        getElement("notificationModal");

    modal.classList.add("show");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


/* =========================================================
   5. CLOSE MODAL
========================================================= */

function closeNotificationModal() {

    const modal =
        getElement("notificationModal");

    modal.classList.remove("show");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    const redirect = pendingRedirect;

    pendingRedirect = null;

    if (redirect) {

        window.location.href =
            redirect;

    }

}


/* =========================================================
   6. MODAL EVENTS
========================================================= */

function initializeNotificationModal() {

    getElement("closeNotification")
        .addEventListener(
            "click",
            closeNotificationModal
        );

    getElement("notificationButton")
        .addEventListener(
            "click",
            closeNotificationModal
        );

}


/* =========================================================
   7. RETURN TO LOGIN
========================================================= */

function initializeReturnButton() {

    getElement("returnButton")
        .addEventListener("click", () => {

            window.location.href =
                "../worker-authentication/index.html";

        });

}


/* =========================================================
   8. GOOGLE EXCHANGE FLOW
========================================================= */

async function initializeGoogleExchange() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const code =
        params.get("code");


    /* -----------------------------------------------------
       NO EXCHANGE CODE
    ----------------------------------------------------- */

    if (!code) {

        handleExchangeError(
            "No authentication code was received."
        );

        return;

    }


    /* -----------------------------------------------------
       EXCHANGE CODE WITH BACKEND
    ----------------------------------------------------- */

    try {

        const response =
            await fetch(
                API_ENDPOINT(
                    "/api/worker-authentication/google/exchange"
                ),
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        code
                    })
                }
            );


        const data =
            await response.json();


        /* -------------------------------------------------
           BACKEND ERROR
        -------------------------------------------------- */

        if (!response.ok) {

            handleExchangeError(
                data.message ||
                "Google authentication could not be completed."
            );

            return;

        }


        /* -------------------------------------------------
           SAVE EMAIL WHEN PROVIDED
        -------------------------------------------------- */

        if (data.email) {

            saveWorkerEmail(
                data.email
            );

        }


        /* -------------------------------------------------
           PROFILE REQUIRED
        -------------------------------------------------- */

        if (
            data.nextStep ===
            "profile"
        ) {

            showModal(
                "Google Authentication Successful",
                data.message ||
                "Your Google account has been connected. Please complete your worker profile.",
                "success",
                "../worker-create-profile/index.html"
            );

            return;

        }


        /* -------------------------------------------------
           FULLY AUTHENTICATED
        -------------------------------------------------- */

        if (
            data.nextStep ===
            "authenticated"
        ) {

            if (!data.accessToken) {

                handleExchangeError(
                    "Authentication completed, but no access token was received."
                );

                return;

            }


            saveAccessToken(
                data.accessToken
            );


            showModal(
                "Login Successful",
                data.message ||
                "Welcome back. Your account is ready.",
                "success",
                "../worker-dashboard/index.html"
            );

            return;

        }


        /* -------------------------------------------------
           GOOGLE ACCOUNT NOT ALLOWED
        -------------------------------------------------- */

        if (
            data.nextStep ===
            "login-required"
        ) {

            handleExchangeError(
                data.message ||
                "This account uses password authentication. Please log in with your password."
            );

            return;

        }


        /* -------------------------------------------------
           SUSPENDED ACCOUNT
        -------------------------------------------------- */

        if (
            data.nextStep ===
            "suspended"
        ) {

            handleExchangeError(
                data.message ||
                "Your account has been suspended."
            );

            return;

        }


        /* -------------------------------------------------
           UNKNOWN RESPONSE
        -------------------------------------------------- */

        handleExchangeError(
            data.message ||
            "Unable to determine the result of Google authentication."
        );

    } catch (error) {

        console.error(
            "Google exchange error:",
            error
        );

        handleExchangeError(
            "Unable to connect to the server. Please try again."
        );

    }

}


/* =========================================================
   9. EXCHANGE ERROR HANDLER
========================================================= */

function handleExchangeError(message) {

    getElement("loadingSpinner")
        .classList.add("hidden");

    getElement("statusMessage")
        .textContent =
            "Google authentication could not be completed.";

    getElement("retryButton")
        .classList.remove("hidden");

    getElement("returnButton")
        .classList.remove("hidden");


    showModal(
        "Google Authentication Failed",
        message
    );

}


/* =========================================================
   10. RETRY GOOGLE AUTHENTICATION
========================================================= */

getElement("retryButton")
    ?.addEventListener("click", () => {

        const button =
            getElement("retryButton");

        button.disabled = true;

        button.textContent =
            "Connecting...";

        window.location.href =
            API_ENDPOINT(
                "/api/worker-authentication/google"
            );

    });