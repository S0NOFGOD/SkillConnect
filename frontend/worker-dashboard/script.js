/* =========================================================
   WORKER DASHBOARD
========================================================= */

const DASHBOARD_ENDPOINT = "/api/worker/dashboard";
const SEND_PHONE_OTP_ENDPOINT = "/api/worker/send-phone-otp";
const LOGOUT_ENDPOINT = "/api/auth/logout";

const $ = id => document.getElementById(id);

const sidebar = $("sidebar");
const overlay = $("overlay");
const menuBtn = $("menuBtn");
const closeMenuBtn = $("closeMenuBtn");

const viewServicesBtn = $("viewServicesBtn");
const editProfileBtn = $("editProfileBtn");
const logoutBtn = $("logoutBtn");
const verificationActionBtn = $("verificationActionBtn");

const workerFirstName = $("workerFirstName");
const fullName = $("fullName");
const phoneNumber = $("phoneNumber");
const country = $("country");
const state = $("state");
const city = $("city");
const lga = $("lga");
const totalSkills = $("totalSkills");
const phoneVerification = $("phoneVerification");

const profilePhoto = $("profilePhoto");
const profilePhotoPlaceholder = $("profilePhotoPlaceholder");

const notificationOverlay = $("notificationOverlay");
const notificationCard = $("notificationCard");
const notificationTitle = $("notificationTitle");
const notificationText = $("notificationText");
const notificationCloseButton = $("notificationCancelButton");
const notificationNoButton = $("notificationNoButton");
const notificationButton = $("notificationButton");

let modalAction = null;
let modalRedirect = null;
let countdownTimer = null;
let cooldownTimer = null;
let dashboardLoading = false;
let otpSending = false;
let logoutInProgress = false;

/* =========================================================
   NOTIFICATION MODAL
========================================================= */

function showModal(
    title,
    message,
    type = "info",
    action = null,
    buttonText = "Continue",
    confirmation = false,
    redirect = null
) {
    notificationTitle.textContent = title;
    notificationText.textContent = message;
    notificationButton.textContent = buttonText;

    notificationCard.className = `notification-card ${type}`;

    notificationButton.hidden = false;
    notificationNoButton.hidden = !confirmation;
    notificationCloseButton.hidden = confirmation;

    notificationButton.disabled = false;
    notificationNoButton.disabled = false;

    notificationButton.classList.remove("is-loading");
    delete notificationButton.dataset.originalText;

    modalAction = action;
    modalRedirect = redirect;

    notificationOverlay.hidden = false;
}

function hideModal() {
    notificationOverlay.hidden = true;

    modalAction = null;
    modalRedirect = null;

    clearInterval(cooldownTimer);
    cooldownTimer = null;

    notificationButton.disabled = false;
    notificationNoButton.disabled = false;

    notificationButton.classList.remove("is-loading");
    delete notificationButton.dataset.originalText;
}

function setLoading(button, loading, text = "Connecting...") {
    if (!button) return;

    if (loading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent.trim();
        }

        button.disabled = true;
        button.classList.add("is-loading");
        button.textContent = text;
        return;
    }

    button.disabled = false;
    button.classList.remove("is-loading");

    if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

/* =========================================================
   COOLDOWN COUNTDOWN
========================================================= */

function formatCooldown(remainingMilliseconds) {
    const totalSeconds = Math.max(
        0,
        Math.ceil(remainingMilliseconds / 1000)
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
}

function showCooldownModal(coolDownUntil, message) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;

    const expiryTime = new Date(coolDownUntil).getTime();

    if (!Number.isFinite(expiryTime)) {
        showModal(
            "Verification Cooldown",
            message || "You cannot request another OTP yet.",
            "error"
        );
        return;
    }

    if (expiryTime <= Date.now()) {
        showModal(
            "Cooldown Expired",
            "Your cooldown has expired. You can try requesting another OTP.",
            "info"
        );
        return;
    }

    showModal(
        "Verification Cooldown",
        message || "You cannot request another OTP yet.",
        "error"
    );

    const updateCountdown = () => {
        const remaining = expiryTime - Date.now();

        if (remaining <= 0) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;

            notificationText.textContent =
                "Your cooldown has expired. You can try requesting another OTP.";

            return;
        }

        notificationText.textContent =
            `${message || "You cannot request another OTP yet."}\n\n` +
            ` ${formatCooldown(remaining)}`;
    };

    updateCountdown();
    cooldownTimer = setInterval(updateCountdown, 1000);
}

/* =========================================================
   MODAL CONTINUE BUTTON
========================================================= */

notificationButton.addEventListener("click", async () => {
    console.log("Notification Continue clicked.");

    if (notificationButton.disabled) {
        console.log("Continue is disabled.");
        return;
    }

    const redirect = modalRedirect;
    const action = modalAction;

    if (redirect) {
        console.log("Redirecting to:", redirect);
        window.location.href = redirect;
        return;
    }

    if (!action) {
        hideModal();
        return;
    }

    modalAction = null;

    try {
        await action();
    } catch (error) {
        console.error("Modal action failed:", error);

        hideModal();

        showModal(
            "Something Went Wrong",
            "Please try again.",
            "error"
        );
    }
});

notificationNoButton.addEventListener("click", () => {
    if (!notificationNoButton.disabled) {
        hideModal();
    }
});

notificationCloseButton.addEventListener("click", () => {
    if (!notificationButton.disabled) {
        hideModal();
    }
});

/* =========================================================
   AUTHENTICATION
========================================================= */

function redirectToAuthentication() {
    window.location.href = "../worker-authentication/index.html";
}

function handleAuthenticationError() {
    if (dashboardLoading) return;

    showModal(
        "Authentication Required",
        "Your session has expired. Please log in again.",
        "error",
        redirectToAuthentication
    );
}

/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {
    if (dashboardLoading) return;

    dashboardLoading = true;

    showModal(
        "Connecting",
        "Connecting to your dashboard...",
        "info"
    );

    notificationButton.hidden = true;
    notificationCloseButton.hidden = true;
    notificationNoButton.hidden = true;

    try {
        const response = await API_REQUEST(DASHBOARD_ENDPOINT, {
            method: "GET"
        });

        if (response.status === 401) {
            hideModal();

            showModal(
                "Authentication Required",
                "Your session has expired. Please log in again.",
                "error",
                redirectToAuthentication
            );

            return;
        }

        const data = await response.json();

        if (!response.ok) {
            hideModal();

            showModal(
                "Unable to Load Dashboard",
                data.message ||
                    "Unable to load your dashboard. Please try again.",
                "error"
            );

            return;
        }

        displayWorkerData(data.worker || data);
        hideModal();

    } catch (error) {
        console.error("Dashboard request failed:", error);

        hideModal();

        showModal(
            "Connection Error",
            "Unable to connect to the server. Please try again.",
            "error"
        );

    } finally {
        dashboardLoading = false;
    }
}

/* =========================================================
   DISPLAY WORKER DATA
========================================================= */

function displayWorkerData(worker) {
    const name = worker.fullName || "";

    workerFirstName.textContent =
        name.trim().split(/\s+/)[0] || "Worker";

    fullName.textContent = name || "Not provided";
    phoneNumber.textContent = worker.phone || "Not provided";
    country.textContent = worker.country || "Not provided";
    state.textContent = worker.state || "Not provided";
    city.textContent = worker.city || "Not provided";
    lga.textContent = worker.lga || "Not provided";

    totalSkills.textContent = Number.isFinite(Number(worker.totalSkill))
        ? Number(worker.totalSkill)
        : 0;

    phoneVerification.textContent =
        Number.isFinite(Number(worker.totalClients))
            ? Number(worker.totalClients)
            : 0;

    displayProfilePhoto(worker.profilePhoto);
    checkPhoneVerification(worker.phoneVerificationExpires);
}

/* =========================================================
   PROFILE PHOTO
========================================================= */

function displayProfilePhoto(photoUrl) {
    profilePhoto.hidden = true;
    profilePhotoPlaceholder.hidden = false;

    profilePhoto.onload = null;
    profilePhoto.onerror = null;

    if (typeof photoUrl !== "string" || !photoUrl.trim()) {
        profilePhoto.removeAttribute("src");
        return;
    }

    profilePhoto.onload = () => {
        profilePhoto.hidden = false;
        profilePhotoPlaceholder.hidden = true;
    };

    profilePhoto.onerror = () => {
        profilePhoto.hidden = true;
        profilePhoto.removeAttribute("src");
        profilePhotoPlaceholder.hidden = false;
    };

    profilePhoto.src = photoUrl.trim();
}

/* =========================================================
   PHONE VERIFICATION COUNTDOWN
========================================================= */

function checkPhoneVerification(expiresAt) {
    clearInterval(countdownTimer);

    const expiryTime = expiresAt
        ? new Date(expiresAt).getTime()
        : NaN;

    if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) {
        showVerificationPrompt();
        return;
    }

    verificationActionBtn.classList.add("verified");
    phoneVerification.dataset.verificationStatus = "verified";

    startVerificationCountdown(expiryTime);
}

function showVerificationPrompt() {
    verificationActionBtn.classList.remove("verified");
    verificationActionBtn.textContent = "Verify Profile";

    phoneVerification.dataset.verificationStatus = "unverified";
}

function startVerificationCountdown(expiryTime) {
    const update = () => {
        const remaining = expiryTime - Date.now();

        if (remaining <= 0) {
            clearInterval(countdownTimer);
            showVerificationPrompt();
            return;
        }

        const seconds = Math.floor(remaining / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        verificationActionBtn.textContent =
            `${days}d ${hours}h ${minutes}m ${secs}s`;
    };

    update();
    countdownTimer = setInterval(update, 1000);
}

/* =========================================================
   VERIFY PROFILE
========================================================= */

verificationActionBtn.addEventListener("click", () => {
    if (
        verificationActionBtn.classList.contains("verified") ||
        verificationActionBtn.disabled ||
        verificationActionBtn.textContent !== "Verify Profile"
    ) {
        return;
    }

    showModal(
        "Verify Profile",
        "Verify your profile to be discovered by nearby clients?",
        "confirm",
        sendPhoneOtp,
        "Yes",
        true
    );
});

async function sendPhoneOtp() {
    if (otpSending) return;

    otpSending = true;

    setLoading(notificationButton, true, "Verifying...");

    try {
        const response = await API_REQUEST(SEND_PHONE_OTP_ENDPOINT, {
            method: "POST"
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
            hideModal();
            handleAuthenticationError();
            return;
        }

        if (!response.ok) {
            hideModal();

            // Display the backend cooldown timestamp when supplied.
            if (data.coolDownUntil) {
                showCooldownModal(
                    data.coolDownUntil,
                    data.message || "You have reached the OTP request limit."
                );
                return;
            }

            showModal(
                "Verification Error",
                data.message ||
                    "Unable to send the verification code.",
                "error"
            );

            return;
        }

        if (data.phone) {
            sessionStorage.setItem("workerPhone", data.phone);
        }

        showModal(
            "OTP Sent",
            data.message ||
                "A verification code has been sent to your phone.",
            "success",
            null,
            "Continue",
            false,
            "../worker-phone-otp/index.html"
        );

    } catch (error) {
        console.error("Phone OTP request failed:", error);

        hideModal();

        showModal(
            "Connection Error",
            "Unable to send the verification code. Please try again.",
            "error"
        );

    } finally {
        otpSending = false;
    }
}

/* =========================================================
   SIDEBAR NAVIGATION
========================================================= */

function openSidebar() {
    sidebar.classList.add("active");
    overlay.classList.add("active");

    menuBtn.setAttribute("aria-expanded", "true");
    overlay.setAttribute("aria-hidden", "false");
}

function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");

    menuBtn.setAttribute("aria-expanded", "false");
    overlay.setAttribute("aria-hidden", "true");
}

menuBtn.addEventListener("click", openSidebar);
closeMenuBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeSidebar();

        if (!notificationButton.disabled) {
            hideModal();
        }
    }
});

viewServicesBtn.addEventListener("click", () => {
    window.location.href = "../worker-services/index.html";
});

editProfileBtn.addEventListener("click", () => {
    window.location.href = "../worker-edit-profile/index.html";
});

/* =========================================================
   LOGOUT
========================================================= */

logoutBtn.addEventListener("click", () => {
    showModal(
        "Logout",
        "Are you sure you want to log out?",
        "confirm",
        logoutWorker,
        "Yes",
        true
    );
});

async function logoutWorker() {
    if (logoutInProgress) return;

    logoutInProgress = true;

    setLoading(notificationButton, true, "Logging Out...");

    try {
        const response = await fetch(API_ENDPOINT(LOGOUT_ENDPOINT), {
            method: "POST",
            credentials: "include"
        });

        if (response.status === 401) {
            hideModal();
            handleAuthenticationError();
            return;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            hideModal();

            showModal(
                "Logout Failed",
                data.message ||
                    "Unable to log out. Please try again.",
                "error"
            );

            return;
        }

        window.location.href = "../worker-authentication/index.html";

    } catch (error) {
        console.error("Logout request failed:", error);

        hideModal();

        showModal(
            "Connection Error",
            "Unable to log out at this time. Please try again.",
            "error"
        );

    } finally {
        logoutInProgress = false;
    }
}

/* =========================================================
   SESSION EXPIRY
========================================================= */

window.addEventListener("authSessionExpired", () => {
    if (dashboardLoading) return;

    if (notificationOverlay.hidden || !modalAction) {
        handleAuthenticationError();
    }
});

/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", loadDashboard);