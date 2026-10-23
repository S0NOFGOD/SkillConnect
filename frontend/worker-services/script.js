"use strict";

/* ENDPOINTS */
const SERVICES_ENDPOINT = "/api/worker/services";
const ACTIVATE_ENDPOINT = "/api/worker/services/activate";
const DASHBOARD_ENDPOINT = "/api/worker/dashboard";
const LOGOUT_ENDPOINT = "/api/auth/logout";

/* DOM ELEMENTS */
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const dashboardBtn = document.getElementById("dashboardBtn");
const viewServicesBtn = document.getElementById("viewServicesBtn");
const editProfileBtn = document.getElementById("editProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const addServiceBtn = document.getElementById("addServiceBtn");
const servicesContainer = document.getElementById("servicesContainer");
const servicesLoading = document.getElementById("servicesLoading");
const servicesEmpty = document.getElementById("servicesEmpty");
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoPlaceholder = document.getElementById("profilePhotoPlaceholder");
const notificationOverlay = document.getElementById("notificationOverlay");
const notificationCard = document.getElementById("notificationCard");
const notificationTitle = document.getElementById("notificationTitle");
const notificationText = document.getElementById("notificationText");
const notificationCloseButton = document.getElementById("notificationCancelButton");
const notificationNoButton = document.getElementById("notificationNoButton");
const notificationButton = document.getElementById("notificationButton");

/* STATE */
let modalAction = null;
let countdownInterval = null;
let currentServices = [];

/* NOTIFICATION MODAL */
function showModal(
    title,
    message,
    type = "info",
    action = null,
    buttonText = "Continue",
    confirmation = false
) {
    notificationTitle.textContent = title;
    notificationText.textContent = message;
    notificationButton.textContent = buttonText;
    notificationCard.className = `notification-card ${type}`;

    modalAction = action;

    notificationButton.hidden = false;
    notificationCloseButton.hidden = confirmation;
    notificationNoButton.hidden = !confirmation;

    notificationOverlay.hidden = false;
    notificationOverlay.classList.add("active");
}

function hideModal() {
    notificationOverlay.classList.remove("active");
    notificationOverlay.hidden = true;
    modalAction = null;

    notificationButton.disabled = false;
    notificationButton.classList.remove("is-loading");

    notificationNoButton.disabled = false;
    notificationNoButton.hidden = true;
    notificationCloseButton.hidden = false;

    if (notificationButton.dataset.originalText) {
        notificationButton.textContent =
            notificationButton.dataset.originalText;

        delete notificationButton.dataset.originalText;
    }
}

function closeModal() {
    const action = modalAction;

    if (!action) {
        hideModal();
        return;
    }

    setLoading(notificationButton, true);

    if (action === logoutWorker) {
        notificationButton.textContent = "Logging Out...";
    }

    modalAction = null;
    action();
}

notificationButton.addEventListener("click", closeModal);
notificationNoButton.addEventListener("click", hideModal);

notificationCloseButton.addEventListener("click", () => {
    if (!notificationButton.disabled) {
        hideModal();
    }
});

/* LOADING */
function setLoading(button, loading, text = "Connecting...") {
    if (!button) return;

    if (loading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent.trim();
        }

        button.disabled = true;
        button.classList.add("is-loading");
        button.textContent = text;
    } else {
        button.disabled = false;
        button.classList.remove("is-loading");

        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

function redirectToLogin() {
    window.location.href = "../worker-authentication/index.html";
}

function authenticationError(
    message = "Your session has expired. Please log in again."
) {
    showModal(
        "Authentication Required",
        message,
        "error",
        redirectToLogin,
        "Continue"
    );
}

/* SIDEBAR PROFILE PHOTO */
function displayProfilePhoto(photoUrl) {
    if (!profilePhoto) return;

    const photo =
        typeof photoUrl === "string" ? photoUrl.trim() : "";

    if (!photo) {
        profilePhoto.removeAttribute("src");
        profilePhoto.hidden = true;

        if (profilePhotoPlaceholder) {
            profilePhotoPlaceholder.hidden = false;
        }

        return;
    }

    profilePhoto.onerror = () => {
        profilePhoto.removeAttribute("src");
        profilePhoto.hidden = true;

        if (profilePhotoPlaceholder) {
            profilePhotoPlaceholder.hidden = false;
        }
    };

    profilePhoto.onload = () => {
        profilePhoto.hidden = false;

        if (profilePhotoPlaceholder) {
            profilePhotoPlaceholder.hidden = true;
        }
    };

    if (profilePhoto.src === photo && profilePhoto.complete) {
        if (profilePhoto.naturalWidth > 0) {
            profilePhoto.hidden = false;

            if (profilePhotoPlaceholder) {
                profilePhotoPlaceholder.hidden = true;
            }

            return;
        }
    }

    profilePhoto.hidden = false;

    if (profilePhotoPlaceholder) {
        profilePhotoPlaceholder.hidden = true;
    }

    profilePhoto.src = photo;
}

async function loadSidebarProfilePhoto() {
    try {
        const response = await API_REQUEST(DASHBOARD_ENDPOINT, {
            method: "GET"
        });

        // API_REQUEST handles access-token refresh.
        if (response.status === 401) return;

        if (!response.ok) {
            console.error(
                "Unable to load worker profile photo:",
                response.status
            );
            return;
        }

        const data = await response.json();

        displayProfilePhoto(
            (data.worker || data).profilePhoto
        );
    } catch (error) {
        console.error(
            "Worker profile photo request failed:",
            error
        );
    }
}

/* SERVICES LOADING */
function setServicesLoading(loading) {
    servicesLoading.hidden = !loading;

    if (loading) {
        servicesContainer.innerHTML = "";
        servicesEmpty.hidden = true;

        if (countdownInterval !== null) {
            clearInterval(countdownInterval);
        }

        countdownInterval = null;
    }
}

async function loadServices() {
    setServicesLoading(true);

    try {
        const response = await API_REQUEST(SERVICES_ENDPOINT, {
            method: "GET"
        });

        // API_REQUEST handles refresh-token requests.
        if (response.status === 401) return;

        const data = await response.json();

        if (!response.ok) {
            showModal(
                "Unable to Load Services",
                data.message ||
                    "Unable to load your services. Please try again.",
                "error"
            );

            return;
        }

        displayServices(data.services);
    } catch (error) {
        console.error("Services request failed:", error);

        showModal(
            "Connection Error",
            "Unable to connect to the server. Please try again.",
            "error"
        );
    } finally {
        setServicesLoading(false);
    }
}

/* SERVICE COUNTDOWN */
function formatServiceCountDown(expiryTime) {
    const remaining = expiryTime - Date.now();

    if (remaining <= 0) {
        return "00:00:00:00";
    }

    const seconds = Math.floor(remaining / 1000);

    return [
        Math.floor(seconds / 86400),
        Math.floor((seconds % 86400) / 3600),
        Math.floor((seconds % 3600) / 60),
        seconds % 60
    ]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
}

function serviceIsActive(service) {
    const expiry = new Date(
        service.serviceCountDown
    ).getTime();

    return Number.isFinite(expiry) && expiry > Date.now();
}

function updateServiceCountDowns() {
    servicesContainer
        .querySelectorAll(".service-card")
        .forEach(card => {
            const service = currentServices.find(
                item => String(item.id) === card.dataset.serviceId
            );

            if (!service) return;

            const countdown = card.querySelector(".service-date");
            const activateButton = card.querySelector(
                ".activate-service-btn"
            );

            const active = serviceIsActive(service);

            countdown.hidden = !active;
            activateButton.hidden = active;

            // Expired or invalid service: show a red Activate button.
            if (!active) {
                activateButton.style.backgroundColor = "#dc2626";
                activateButton.style.color = "#ffffff";
            } else {
                activateButton.style.backgroundColor = "";
                activateButton.style.color = "";
            }

            if (active) {
                countdown.dataset.expiryTime = String(
                    new Date(service.serviceCountDown).getTime()
                );

                countdown.textContent = formatServiceCountDown(
                    Number(countdown.dataset.expiryTime)
                );
            }
        });

    if (countdownInterval !== null) {
        clearInterval(countdownInterval);
    }

    countdownInterval = null;

    if (
        servicesContainer.querySelector(
            ".service-date:not([hidden])"
        )
    ) {
        countdownInterval = setInterval(
            updateServiceCountDowns,
            1000
        );
    }
}

/* DISPLAY SERVICES */
function displayServices(services) {
    currentServices = Array.isArray(services)
        ? [...services]
        : [];

    servicesContainer.innerHTML = "";

    if (!currentServices.length) {
        servicesEmpty.hidden = false;
        return;
    }

    servicesEmpty.hidden = true;

    // Most recent serviceCountDown first.
    currentServices.sort((a, b) => {
        const aDate = new Date(a.serviceCountDown).getTime();
        const bDate = new Date(b.serviceCountDown).getTime();

        return (
            (Number.isFinite(bDate) ? bDate : 0) -
            (Number.isFinite(aDate) ? aDate : 0)
        );
    });

    currentServices.forEach(service => {
        const card = document.createElement("article");

        card.className = "service-card";
        card.dataset.serviceId = String(service.id);
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute(
            "aria-label",
            `View ${service.skill || "service"}`
        );

        const skill = document.createElement("strong");
        skill.className = "service-skill";
        skill.textContent = service.skill || "Service";

        const info = document.createElement("div");
        info.className = "service-info";

        const countdown = document.createElement("span");
        countdown.className = "service-date";

        const approval = document.createElement("span");
        approval.className = "service-approval";
        approval.textContent = service.adminApproval || "in review";

        approval.classList.add(
            service.adminApproval === "approved"
                ? "approved"
                : service.adminApproval === "rejected"
                    ? "rejected"
                    : "in-review"
        );

        const activateButton = document.createElement("button");
        activateButton.type = "button";
        activateButton.className = "activate-service-btn";
        activateButton.textContent = "Activate";

        const active = serviceIsActive(service);

        activateButton.hidden = active;
        countdown.hidden = !active;

        info.append(countdown, approval);
        card.append(skill, info, activateButton);

        activateButton.addEventListener("click", event => {
            event.stopPropagation();

            activateService(
                service.id,
                activateButton,
                countdown
            );
        });

        card.addEventListener("click", () => {
            openService(service.id);
        });

        card.addEventListener("keydown", event => {
            if (event.target !== card) return;

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openService(service.id);
            }
        });

        servicesContainer.appendChild(card);
    });

    updateServiceCountDowns();
}

/* ACTIVATE SERVICE */
async function activateService(serviceId, button, countdown) {
    if (!serviceId) {
        showModal(
            "Service Error",
            "This service could not be activated.",
            "error"
        );

        return;
    }

    // Save the service ID, then retrieve it for the request.
    sessionStorage.setItem("serviceId", String(serviceId));

    const storedServiceId = sessionStorage.getItem("serviceId");

    button.disabled = true;
    button.textContent = "Activating...";

    try {
        const response = await API_REQUEST(ACTIVATE_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                serviceId: storedServiceId
            })
        });

        if (response.status === 401) return;

        const data = await response.json();

        if (!response.ok) {
            button.disabled = false;
            button.textContent = "Activate";

            showModal(
                "Activation Failed",
                data.message ||
                    "Unable to activate this service. Please try again.",
                "error"
            );

            return;
        }

        const updated = data.service;

        const service = currentServices.find(
            item => String(item.id) === String(storedServiceId)
        );

        if (service && updated) {
            service.serviceCountDown = updated.serviceCountDown;
        }

        button.hidden = true;
        button.disabled = false;
        button.textContent = "Activate";

        countdown.hidden = false;

        updateServiceCountDowns();
    } catch (error) {
        console.error("Service activation failed:", error);

        button.disabled = false;
        button.textContent = "Activate";

        showModal(
            "Connection Error",
            "Unable to activate this service. Please try again.",
            "error"
        );
    }
}

/* OPEN SERVICE */
function openService(serviceId) {
    if (!serviceId) {
        showModal(
            "Service Error",
            "This service could not be opened.",
            "error"
        );

        return;
    }

    sessionStorage.setItem("serviceId", String(serviceId));

    window.location.href = "../worker-view-service/index.html";
}

/* NAVIGATION */
addServiceBtn.addEventListener("click", () => {
    window.location.href = "../worker-create-service/index.html";
});

dashboardBtn.addEventListener("click", () => {
    window.location.href = "../worker-dashboard/index.html";
});

viewServicesBtn.addEventListener("click", closeSidebar);

editProfileBtn.addEventListener("click", () => {
    window.location.href = "../worker-edit-profile/index.html";
});

/* MOBILE SIDEBAR */
function openSidebar() {
    sidebar.classList.add("active");
    overlay.classList.add("active");
    menuBtn.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.addEventListener("click", openSidebar);
closeMenuBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

/* LOGOUT */
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
    try {
        const response = await API_REQUEST(LOGOUT_ENDPOINT, {
            method: "POST"
        });

        if (response.status === 401) {
            setLoading(notificationButton, false);
            hideModal();
            authenticationError();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            setLoading(notificationButton, false);
            hideModal();

            showModal(
                "Logout Failed",
                data.message ||
                    "Unable to log out. Please try again.",
                "error"
            );

            return;
        }

        window.location.href =
            "../worker-authentication/index.html";
    } catch (error) {
        console.error("Logout request failed:", error);

        setLoading(notificationButton, false);
        hideModal();

        showModal(
            "Connection Error",
            "Unable to log out at this time. Please try again.",
            "error"
        );
    }
}

/* SESSION EXPIRY */
window.addEventListener("authSessionExpired", () => {
    setServicesLoading(false);
    hideModal();
    authenticationError();
});

/* INITIALIZE */
document.addEventListener("DOMContentLoaded", () => {
    loadSidebarProfilePhoto();
    loadServices();
});