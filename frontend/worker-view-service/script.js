"use strict";

const $ = id => document.getElementById(id);

const VIEW_ENDPOINT = "/api/worker/view-service";
const ACTIVATE_ENDPOINT = "/api/worker/activate-service";

const SKILLS = [
    "Swimming Instructor", "Barber", "Hairdresser", "Makeup Artist",
    "Tailor", "Fashion Designer", "Plumber", "Electrician", "Painter",
    "Welder", "Carpenter", "Bricklayer", "Cleaner", "Laundry Service",
    "Mechanic", "Auto Electrician", "Phone Repair", "Computer Repair",
    "Graphic Designer", "Web Developer", "Photographer", "Videographer",
    "Caterer", "Baker", "Cook", "Event Planner", "Interior Decorator",
    "AC Technician", "Generator Repair", "POP Installer", "Tiler",
    "Furniture Maker", "Driver", "Tutor", "Fitness Trainer", "Other"
];

const EXPERIENCES = [
    "Less than 1 year", "1 year", "2 years",
    "3 years", "4 years", "5 years+"
];

let modalCallback = null;
let modalBusy = false;
let countdownTimer = null;
let serviceDate = null;

document.addEventListener("DOMContentLoaded", () => {
    populateSkills();
    initializeModal();
    initializeBackNavigation();
    initializePortfolioInputs();

    $("description").addEventListener("input", updateWordCount);

    $("serviceForm").addEventListener("submit", event => {
        event.preventDefault();
        updateService();
    });

    $("activateServiceBtn").addEventListener("click", activateService);

    updateWordCount();
    initializePage();
});

function populateSkills() {
    const select = $("skill");

    SKILLS.forEach(skill => {
        if (![...select.options].some(option => option.value === skill)) {
            select.add(new Option(skill, skill));
        }
    });
}

function initializeBackNavigation() {
    $("backNavigation").addEventListener("click", () => {
        if (modalBusy) return;

        sessionStorage.removeItem("serviceId");
        location.href = "../worker-services/index.html";
    });
}

async function initializePage() {
    const serviceId = sessionStorage.getItem("serviceId");

    if (!serviceId) {
        showNotification(
            "error",
            "Service Not Found",
            "The service ID could not be found. Please return to your services.",
            "Continue",
            goToServices
        );
        return;
    }

    showLoadingModal(
        "Connecting...",
        "Please wait while we load your service."
    );

    try {
        const response = await API_REQUEST(
            `${VIEW_ENDPOINT}/${encodeURIComponent(serviceId)}`,
            { method: "GET" }
        );

        const data = await readResponse(response);

        if (response.status === 401) {
            showAuthenticationError();
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || "Unable to load this service.");
        }

        if (!data.service) {
            throw new Error("The server did not return service details.");
        }

        displayService(data.service);
        $("viewServicePage").hidden = false;
        closeNotification();
    } catch (error) {
        closeNotification();

        showNotification(
            "error",
            "Unable to Load Service",
            error.message || "Something went wrong. Please try again."
        );
    }
}

function displayService(service) {
    $("skill").value = service.skill || "";

    if (service.skill && $("skill").value !== service.skill) {
        $("skill").add(new Option(service.skill, service.skill));
        $("skill").value = service.skill;
    }

    $("experience").value = service.experience || "";
    $("description").value = service.description || "";

    const status = String(
        service.adminApproval || "in review"
    ).trim().toLowerCase();

    const classes = {
        "in review": "status-in-review",
        rejected: "status-rejected",
        approved: "status-approved"
    };

    $("adminApproval").textContent =
        service.adminApproval || "In Review";

    $("adminResponse").textContent =
        service.adminResponse ||
        "Your service is awaiting admin review.";

    const container = $("adminStatusContainer");

    container.classList.remove(
        "status-in-review",
        "status-rejected",
        "status-approved"
    );

    container.classList.add(
        classes[status] || "status-in-review"
    );

    displayPortfolios(service.portfolios || []);

    serviceDate = service.serviceCountDown
        ? new Date(service.serviceCountDown)
        : null;

    renderActivationStatus();
    updateWordCount();
}

function renderActivationStatus() {
    clearInterval(countdownTimer);
    countdownTimer = null;

    const button = $("activateServiceBtn");
    const text = $("activateButtonText");
    const countdown = $("serviceCountdown");

    const validDate =
        serviceDate &&
        Number.isFinite(serviceDate.getTime()) &&
        serviceDate.getTime() > Date.now();

    if (!validDate) {
        button.hidden = false;
        button.disabled = false;
        button.style.backgroundColor = "#dc2626";
        button.style.color = "#ffffff";

        text.textContent = "Activate";

        countdown.hidden = true;
        countdown.textContent = "";
        countdown.style.color = "";

        return;
    }

    button.hidden = true;
    countdown.hidden = false;
    countdown.style.color = "#16a34a";

    const tick = () => {
        const remaining = serviceDate.getTime() - Date.now();

        if (remaining <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            serviceDate = null;
            renderActivationStatus();
            return;
        }

        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor(
            (remaining % 86400000) / 3600000
        );
        const minutes = Math.floor(
            (remaining % 3600000) / 60000
        );
        const seconds = Math.floor(
            (remaining % 60000) / 1000
        );

        countdown.textContent =
            `Active · ${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    tick();
    countdownTimer = setInterval(tick, 1000);
}

async function activateService() {
    if (modalBusy) return;

    const serviceId = sessionStorage.getItem("serviceId");

    if (!serviceId) {
        showNotification(
            "error",
            "Service Not Found",
            "The service ID could not be found.",
            "Continue",
            goToServices
        );
        return;
    }

    const button = $("activateServiceBtn");
    const text = $("activateButtonText");

    button.disabled = true;
    text.textContent = "Activating…";

    try {
        const response = await API_REQUEST(
            `${ACTIVATE_ENDPOINT}/${encodeURIComponent(serviceId)}`,
            { method: "POST" }
        );

        const data = await readResponse(response);

        if (response.status === 401) {
            showAuthenticationError();
            return;
        }

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to activate this service."
            );
        }

        serviceDate = data.serviceCountDown
            ? new Date(data.serviceCountDown)
            : null;

        if (
            !serviceDate ||
            !Number.isFinite(serviceDate.getTime()) ||
            serviceDate.getTime() <= Date.now()
        ) {
            throw new Error(
                "The server did not return a valid activation expiry date."
            );
        }

        renderActivationStatus();

        showNotification(
            "success",
            "Service Activated",
            data.message ||
                "Your service has been activated successfully for 30 days."
        );
    } catch (error) {
        button.disabled = false;
        text.textContent = "Activate";

        showNotification(
            "error",
            "Activation Failed",
            error.message || "Unable to activate this service."
        );
    }
}

function displayPortfolios(portfolios = []) {
    for (let i = 1; i <= 3; i++) {
        const preview = $(`portfolioPreview${i}`);
        const url = portfolios[i - 1];

        if (!url) {
            preview.replaceChildren();
            continue;
        }

        const image = document.createElement("img");

        image.src = typeof url === "string"
            ? url
            : url.url || url.secure_url || "";

        image.alt = `Portfolio ${i}`;

        if (image.src) {
            preview.replaceChildren(image);
        }
    }
}

function initializePortfolioInputs() {
    for (let i = 1; i <= 3; i++) {
        const input = $(`portfolioPhoto${i}`);
        const preview = $(`portfolioPreview${i}`);

        input.addEventListener("change", () => {
            const file = input.files?.[0];

            if (!file) return;

            const error = validateImage(file);

            if (error) {
                input.value = "";
                showNotification("error", "Invalid Image", error);
                return;
            }

            const reader = new FileReader();

            reader.onload = event => {
                const image = document.createElement("img");

                image.src = event.target.result;
                image.alt = `Portfolio ${i}`;

                preview.replaceChildren(image);
            };

            reader.readAsDataURL(file);
        });
    }
}

function validateImage(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return `"${file.name}" must be a JPG, PNG, or WebP image.`;
    }

    if (file.size > 10 * 1024 * 1024) {
        return `"${file.name}" exceeds 10 MB. Choose an image that is 10 MB or smaller.`;
    }

    return "";
}

function updateWordCount() {
    const value = $("description").value.trim();
    const count = value ? value.split(/\s+/).length : 0;

    $("descriptionWordCount").textContent = `${count} / 150 words`;
}

function validateService() {
    const skill = $("skill").value.trim();
    const experience = $("experience").value.trim();
    const description = $("description").value.trim();

    if (!skill || !SKILLS.includes(skill)) {
        return validationError(
            "Skill Required",
            "Please select a valid skill."
        );
    }

    if (!experience || !EXPERIENCES.includes(experience)) {
        return validationError(
            "Experience Required",
            "Please select a valid experience level."
        );
    }

    if (!description) {
        return validationError(
            "Description Required",
            "Please describe the service you provide."
        );
    }

    if (description.split(/\s+/).length > 150) {
        return validationError(
            "Description Too Long",
            "Your description must not exceed 150 words."
        );
    }

    for (let i = 1; i <= 3; i++) {
        const file = $(`portfolioPhoto${i}`).files?.[0];

        if (file) {
            const error = validateImage(file);

            if (error) {
                return validationError(
                    "Invalid Portfolio Image",
                    error
                );
            }
        }
    }

    return true;
}

function validationError(title, message) {
    showNotification("error", title, message);
    return false;
}

async function updateService() {
    if (modalBusy || !validateService()) return;

    const serviceId = sessionStorage.getItem("serviceId");

    if (!serviceId) {
        showNotification(
            "error",
            "Service Not Found",
            "The service ID could not be found.",
            "Continue",
            goToServices
        );
        return;
    }

    const button = $("updateServiceBtn");
    const buttonText = button.querySelector(".update-button-text");
    const loader = button.querySelector(".update-button-loader");

    button.disabled = true;
    buttonText.textContent = "Updating…";
    loader.hidden = false;

    const formData = new FormData();

    formData.append("serviceId", serviceId);
    formData.append("skill", $("skill").value.trim());
    formData.append("experience", $("experience").value.trim());
    formData.append("description", $("description").value.trim());

    for (let i = 1; i <= 3; i++) {
        const file = $(`portfolioPhoto${i}`).files?.[0];

        if (file) {
            formData.append("portfolioPhotos", file);
            formData.append("portfolioIndexes", String(i - 1));
        }
    }

    try {
        const response = await API_REQUEST(
            `${VIEW_ENDPOINT}/${encodeURIComponent(serviceId)}`,
            {
                method: "PUT",
                body: formData
            }
        );

        const data = await readResponse(response);

        if (response.status === 401) {
            showAuthenticationError();
            return;
        }

        if (!response.ok) {
            if (data.code === "PROFILE_VERIFICATION_EXPIRED") {
                showNotification(
                    "error",
                    "Profile Verification Required",
                    data.message ||
                        "Your profile verification has expired. Please verify your profile before updating this service.",
                    "Continue",
                    goToWorkerDashboard
                );
                return;
            }

            throw new Error(
                data.message || "Unable to update this service."
            );
        }

        showNotification(
            "success",
            "Service Updated",
            data.message || "Your service has been updated successfully.",
            "Continue",
            goToServices
        );
    } catch (error) {
        showNotification(
            "error",
            "Update Failed",
            error.message || "Unable to update this service."
        );
    } finally {
        button.disabled = false;
        buttonText.textContent = "Update Service";
        loader.hidden = true;
    }
}

function initializeModal() {
    $("notificationActions").addEventListener("click", event => {
        const button = event.target.closest("button");

        if (
            !button ||
            modalBusy ||
            button.id !== "notificationButton"
        ) {
            return;
        }

        const callback = modalCallback;
        modalCallback = null;

        closeNotification();

        if (typeof callback === "function") {
            callback();
        }
    });

    $("notificationCancelButton").addEventListener("click", () => {
        if (!modalBusy) closeNotification();
    });

    $("notificationOverlay").addEventListener("click", event => {
        if (
            event.target === $("notificationOverlay") &&
            !modalBusy
        ) {
            closeNotification();
        }
    });
}

function showNotification(
    type,
    title,
    message,
    buttonText = "Continue",
    callback = null
) {
    const overlay = $("notificationOverlay");
    const icon = $("notificationIcon");

    modalCallback = callback;

    $("notificationCard").className = `notification-card ${type}`;
    $("notificationTitle").textContent = title;
    $("notificationText").textContent = message;

    icon.textContent = type === "success" ? "✓" : "!";
    icon.style.color =
        type === "success"
            ? "#22c55e"
            : type === "warning"
                ? "#f59e0b"
                : "#ef4444";

    icon.style.background =
        type === "success"
            ? "rgba(34,197,94,.1)"
            : type === "warning"
                ? "rgba(245,158,11,.1)"
                : "rgba(239,68,68,.1)";

    const actions = $("notificationActions");
    actions.replaceChildren();

    const button = document.createElement("button");

    button.type = "button";
    button.id = "notificationButton";
    button.textContent = buttonText;

    actions.appendChild(button);

    $("notificationCancelButton").style.display =
        callback ? "none" : "flex";

    overlay.hidden = false;
    overlay.classList.add("active");
}

function showLoadingModal(title, message) {
    modalCallback = null;

    $("notificationCard").className = "notification-card";
    $("notificationTitle").textContent = title;
    $("notificationText").textContent = message;
    $("notificationIcon").textContent = "…";
    $("notificationIcon").style.color = "#22c55e";
    $("notificationIcon").style.background = "rgba(34,197,94,.1)";

    $("notificationActions").replaceChildren();
    $("notificationCancelButton").style.display = "none";

    $("notificationOverlay").hidden = false;
    $("notificationOverlay").classList.add("active");
}

function closeNotification() {
    $("notificationOverlay").classList.remove("active");
    $("notificationOverlay").hidden = true;
    $("notificationCancelButton").style.display = "flex";

    modalCallback = null;
}

function showAuthenticationError() {
    closeNotification();

    showNotification(
        "error",
        "Authentication Required",
        "Your session has expired. Please log in again.",
        "Continue",
        () => {
            location.href = "../worker-authentication/index.html";
        }
    );
}

function goToServices() {
    location.href = "../worker-services/index.html";
}

function goToWorkerDashboard() {
    location.href = "../worker-dashboard/index.html";
}

async function readResponse(response) {
    const responseText = await response.text();

    if (!responseText) return {};

    try {
        return JSON.parse(responseText);
    } catch {
        throw new Error(
            "The server returned an invalid response. Please try again."
        );
    }
}