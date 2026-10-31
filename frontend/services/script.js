"use strict";

/* =========================================================
   1. ENDPOINTS
========================================================= */

const SERVICES_ENDPOINT = "/api/services";
const LOGOUT_ENDPOINT = "/api/auth/logout";
const IP_ENDPOINT = "https://api.ipify.org?format=json";

/* =========================================================
   2. DOM ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const menuBtn = $("menuBtn");
const closeMenuBtn = $("closeMenuBtn");
const sidebar = $("sidebar");
const overlay = $("overlay");

const dashboardBtn = $("dashboardBtn");
const findWorkersBtn = $("findWorkersBtn");
const editProfileBtn = $("editProfileBtn");
const logoutBtn = $("logoutBtn");

const skillFilter = $("skillFilter");
const skillSearch = $("skillSearch");

const workersContainer = $("workersContainer");
const workersLoading = $("workersLoading");
const workersEmpty = $("workersEmpty");
const workersEmptyText = $("workersEmptyText");

const notificationOverlay = $("notificationOverlay");
const notificationCard = $("notificationCard");
const notificationIcon = $("notificationIcon");
const notificationTitle = $("notificationTitle");
const notificationText = $("notificationText");
const notificationButton = $("notificationButton");
const notificationCancelButtonMobile = $("notificationCancelButtonMobile");

/* =========================================================
   3. STATE
========================================================= */

let workers = [];
let notificationCallback = null;

/* =========================================================
   4. API REQUEST
========================================================= */

async function apiRequest(endpoint, options = {}) {
    if (typeof API_REQUEST === "function") {
        return API_REQUEST(endpoint, options);
    }

    const response = await fetch(endpoint, {
        credentials: "include",
        ...options,
        headers: {
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

async function readResponse(response) {
    if (response && typeof response.json === "function") {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    }

    if (response?.success === false) {
        throw new Error(response.message || "Something went wrong.");
    }

    return response;
}

/* =========================================================
   5. NOTIFICATION
========================================================= */

function showNotification(message, type = "error", callback = null) {
    notificationCard.className = `notification-card ${type}`;
    notificationIcon.textContent = type === "success" ? "✓" : "!";
    notificationTitle.textContent =
        type === "success" ? "Success" : "Notification";

    notificationText.textContent = message;
    notificationCallback = callback;

    notificationButton.textContent = callback ? "Continue" : "Okay";
    notificationCancelButtonMobile.style.display = callback ? "block" : "none";

    notificationOverlay.hidden = false;
}

function closeNotification(runCallback = false) {
    notificationOverlay.hidden = true;

    const callback = notificationCallback;
    notificationCallback = null;

    if (runCallback && callback) callback();
}

notificationButton.addEventListener("click", () => {
    closeNotification(true);
});

notificationCancelButtonMobile.addEventListener("click", () => {
    closeNotification(false);
});

notificationOverlay.addEventListener("click", event => {
    if (event.target === notificationOverlay) {
        closeNotification(false);
    }
});

/* =========================================================
   6. LOADING AND EMPTY STATES
========================================================= */

function showLoading(show) {
    workersLoading.hidden = !show;
    workersContainer.hidden = show;
    workersEmpty.hidden = true;
}

function showEmpty(message) {
    workersContainer.hidden = true;
    workersEmpty.hidden = false;
    workersEmptyText.textContent = message;
}

function showWorkers() {
    workersContainer.hidden = false;
    workersEmpty.hidden = true;
}

/* =========================================================
   7. BROWSER LOCATION
========================================================= */

function getDeviceLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Your browser does not support location services."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude) ||
                    latitude < -90 ||
                    latitude > 90 ||
                    longitude < -180 ||
                    longitude > 180
                ) {
                    reject(new Error("Your device returned invalid coordinates."));
                    return;
                }

                resolve({ latitude, longitude });
            },
            error => {
                let message = "Unable to retrieve your location.";

                if (error.code === error.PERMISSION_DENIED) {
                    message = "Location permission denied. Please allow location access to find nearby workers.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    message = "Your device location is currently unavailable. Please try again.";
                } else if (error.code === error.TIMEOUT) {
                    message = "Location request timed out. Please try again.";
                }

                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });
}

/* =========================================================
   8. GET PUBLIC IP ADDRESS
========================================================= */

async function getIPAddress() {
    const response = await fetch(IP_ENDPOINT, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Unable to retrieve your IP address. Please try again.");
    }

    const data = await response.json();
    const ipAddress = String(data.ip || "").trim();

    if (!ipAddress) {
        throw new Error("Unable to retrieve your IP address.");
    }

    return ipAddress;
}

/* =========================================================
   9. REQUEST NEARBY WORKERS
========================================================= */

async function loadWorkers() {
    showLoading(true);

    try {
        // Get device coordinates.
        const { latitude, longitude } = await getDeviceLocation();

        // Get public IP address.
        const ipAddress = await getIPAddress();

        // Send location details to backend.
        const response = await apiRequest(SERVICES_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ipAddress,
                latitude,
                longitude
            })
        });

        const data = await readResponse(response);

        if (!Array.isArray(data.workers)) {
            throw new Error("Invalid workers response from server.");
        }

        workers = data.workers;

        if (!workers.length) {
            showEmpty("No workers found within your location.");
            return;
        }

        populateSkillFilter();
        renderWorkers();

    } catch (error) {
        workers = [];
        showEmpty("Unable to load nearby workers.");

        showNotification(
            error.message || "Unable to connect. Please try again."
        );

    } finally {
        workersLoading.hidden = true;
    }
}

/* =========================================================
   10. SKILL DROPDOWN
========================================================= */

function populateSkillFilter() {
    const skills = [
        ...new Set(
            workers
                .map(worker => String(worker.skill || "").trim())
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    skillFilter.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All Skills";
    skillFilter.appendChild(defaultOption);

    skills.forEach(skill => {
        const option = document.createElement("option");
        option.value = skill;
        option.textContent = skill;
        skillFilter.appendChild(option);
    });
}

/* =========================================================
   11. FILTER AND SEARCH WORKERS
========================================================= */

function getFilteredWorkers() {
    const selectedSkill = skillFilter.value.toLowerCase();
    const searchValue = skillSearch.value.trim().toLowerCase();

    return workers.filter(worker => {
        const skill = String(worker.skill || "").toLowerCase();

        const matchesFilter =
            !selectedSkill || skill === selectedSkill;

        const matchesSearch =
            !searchValue || skill.includes(searchValue);

        return matchesFilter && matchesSearch;
    });
}

/* =========================================================
   12. RENDER WORKERS
========================================================= */

function renderWorkers() {
    const filteredWorkers = getFilteredWorkers();

    workersContainer.replaceChildren();

    if (!filteredWorkers.length) {
        if (skillFilter.value) {
            showEmpty("No workers found for this skill.");
        } else if (skillSearch.value.trim()) {
            showEmpty("No workers found for your search.");
        } else {
            showEmpty("No workers found within your location.");
        }

        return;
    }

    showWorkers();

    filteredWorkers.forEach(worker => {
        workersContainer.appendChild(createWorkerCard(worker));
    });
}

/* =========================================================
   13. WORKER CARD
========================================================= */

function createWorkerCard(worker) {
    const card = document.createElement("div");

    card.className = "worker-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute(
        "aria-label",
        `View ${worker.fullName || "worker"}'s service`
    );

    const info = document.createElement("div");
    info.className = "worker-info";

    const name = document.createElement("h3");
    name.className = "worker-name";
    name.textContent = worker.fullName || "Worker";

    const details = document.createElement("div");
    details.className = "worker-details";

    const skill = document.createElement("span");
    skill.className = "worker-skill";
    skill.textContent = worker.skill || "Skill not specified";

    const divider = document.createElement("span");
    divider.className = "worker-divider";
    divider.textContent = "•";

    const location = document.createElement("span");
    location.className = "worker-location";

    const latitude = Number(worker.latitude);

    location.textContent = Number.isFinite(latitude)
        ? latitude.toFixed(5)
        : "Location unavailable";

    details.append(skill, divider, location);
    info.append(name, details);

    let photo;

    if (worker.profilePhoto) {
        photo = document.createElement("img");
        photo.className = "worker-photo";
        photo.src = worker.profilePhoto;
        photo.alt = `${worker.fullName || "Worker"}'s profile photo`;
        photo.loading = "lazy";

        photo.onerror = () => {
            const placeholder = createPhotoPlaceholder();
            photo.replaceWith(placeholder);
        };
    } else {
        photo = createPhotoPlaceholder();
    }

    card.append(info, photo);

    const openService = () => {
        if (!worker.serviceId) {
            showNotification("This worker's service ID is unavailable.");
            return;
        }

        sessionStorage.setItem("serviceId", worker.serviceId);

        window.location.href =
            "../client-worker-details/index.html";
    };

    card.addEventListener("click", openService);

    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openService();
        }
    });

    return card;
}

function createPhotoPlaceholder() {
    const placeholder = document.createElement("div");

    placeholder.className = "worker-photo-placeholder";
    placeholder.textContent = "👤";
    placeholder.setAttribute("aria-label", "Worker photo unavailable");

    return placeholder;
}

/* =========================================================
   14. FILTER EVENTS
========================================================= */

skillFilter.addEventListener("change", renderWorkers);

skillSearch.addEventListener("input", renderWorkers);

/* =========================================================
   15. SIDEBAR
========================================================= */

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

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeSidebar();

        if (!notificationOverlay.hidden) {
            closeNotification(false);
        }
    }
});

/* =========================================================
   16. SIDEBAR NAVIGATION
========================================================= */

dashboardBtn.addEventListener("click", () => {
    window.location.href = "../client-dashboard/index.html";
});

findWorkersBtn.addEventListener("click", () => {
    closeSidebar();
});

editProfileBtn.addEventListener("click", () => {
    window.location.href = "../client-edit-profile/index.html";
});

/* =========================================================
   17. LOGOUT
========================================================= */

logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;

    try {
        await apiRequest(LOGOUT_ENDPOINT, {
            method: "POST"
        });

        sessionStorage.clear();
        window.location.href = "../index.html";

    } catch (error) {
        showNotification(error.message || "Unable to logout. Please try again.");
    } finally {
        logoutBtn.disabled = false;
    }
});

/* =========================================================
   18. INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", loadWorkers);