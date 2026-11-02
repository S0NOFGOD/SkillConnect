"use strict";

const $ = id => document.getElementById(id);

/* ENDPOINTS & OPTIONS */

const VIEW_ENDPOINT = "/api/worker/view-service";

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

const MAX_IMAGES = 3;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_WORDS = 150;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

let modalCallback = null;

/* INITIALIZATION */

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

    $("serviceSeeMoreReviews").addEventListener("click", () => {
        location.href = "../client-view-ratings/index.html";
    });

    updateWordCount();
    initializePage();
});

/* SKILLS & NAVIGATION */

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
        sessionStorage.removeItem("serviceId");
        location.href = "../worker-services/index.html";
    });
}

function goToServices() {
    location.href = "../worker-services/index.html";
}

/* INITIALIZE PAGE */

async function initializePage() {
    const serviceId = sessionStorage.getItem("serviceId");

    if (!serviceId) {
        showNotification("error", "Service Not Found",
            "The service ID could not be found. Please return to your services.",
            "Continue", goToServices);
        return;
    }

    showLoadingModal("Connecting...", "Please wait while we load your service.");

    try {
        const response = await API_REQUEST(
            `${VIEW_ENDPOINT}/${encodeURIComponent(serviceId)}`,
            { method: "GET" }
        );

        const data = await readResponse(response);

        if (response.status === 401) return showAuthenticationError();
        if (!response.ok) throw new Error(data.message || "Unable to load this service.");
        if (!data.service) throw new Error("The server did not return service details.");

        displayService(data.service);
        $("viewServicePage").hidden = false;
        closeNotification();

    } catch (error) {
        closeNotification();
        showNotification("error", "Unable to Load Service",
            error.message || "Something went wrong. Please try again.");
    }
}

/* DISPLAY SERVICE */

function displayService(service) {
    const skill = $("skill");

    skill.value = service.skill || "";

    if (service.skill && skill.value !== service.skill) {
        skill.add(new Option(service.skill, service.skill));
        skill.value = service.skill;
    }

    $("experience").value = service.experience || "";
    $("description").value = service.description || "";

    const status = String(service.adminApproval || "in review").trim().toLowerCase();

    const classes = {
        "in review": "status-in-review",
        "under review": "status-in-review",
        rejected: "status-rejected",
        approved: "status-approved"
    };

    $("adminApproval").textContent = service.adminApproval || "In Review";
    $("adminResponse").textContent =
        service.adminResponse || "Your service is awaiting admin review.";

    $("adminStatusContainer").classList.remove(
        "status-in-review", "status-rejected", "status-approved"
    );
    $("adminStatusContainer").classList.add(classes[status] || "status-in-review");

    displayPortfolios(service.portfolios || []);
    displayReviews(service.ratingAndReview || []);
    updateWordCount();
}

/* DISPLAY REVIEWS */

function displayReviews(reviews) {
    const list = $("serviceReviewList");
    list.replaceChildren();

    const total = reviews.length;
    const average = total
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
        : 0;

    $("serviceAverageRating").textContent = total ? average.toFixed(1) : "—";

    const rounded = Math.round(average);
    $("serviceAverageStars").textContent = "★".repeat(rounded) + "☆".repeat(5 - rounded);
    $("serviceAverageStars").setAttribute(
        "aria-label", `Average rating: ${average.toFixed(1)} out of 5`
    );

    $("serviceReviewCount").textContent = total === 0
        ? "No reviews yet"
        : `${total} ${total === 1 ? "review" : "reviews"}`;

    if (!total) {
        const empty = document.createElement("p");
        empty.className = "empty-service-reviews";
        empty.textContent = "Your customer reviews will appear here.";
        list.appendChild(empty);
    } else {
        reviews.forEach(review => {
            const item = document.createElement("article");
            item.className = "service-review-item";

            const top = document.createElement("div");
            top.className = "service-review-top";

            const name = document.createElement("div");
            name.className = "service-review-name";
            name.textContent = review.fullName || "Client";

            const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));

            const stars = document.createElement("div");
            stars.className = "service-review-rating";
            stars.textContent =
                `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)`;

            top.append(name, stars);

            const text = document.createElement("p");
            text.className = "service-review-text";
            text.textContent = review.review || "No written review.";

            item.append(top, text);

            if (review.date) {
                const date = new Date(review.date);

                if (Number.isFinite(date.getTime())) {
                    const dateElement = document.createElement("p");
                    dateElement.className = "service-review-date";
                    dateElement.textContent = date.toLocaleDateString(undefined, {
                        day: "numeric", month: "short", year: "numeric"
                    });
                    item.appendChild(dateElement);
                }
            }

            list.appendChild(item);
        });
    }

    // Three returned reviews means more reviews may exist.
    $("serviceSeeMoreReviews").hidden = total < 3;
}

/* DISPLAY PORTFOLIOS */

function displayPortfolios(portfolios = []) {
    for (let i = 1; i <= MAX_IMAGES; i++) {
        const preview = $(`portfolioPreview${i}`);
        const url = portfolios[i - 1];

        if (!url) {
            const plus = document.createElement("span");
            plus.className = "portfolio-placeholder";
            plus.textContent = "+";

            const label = document.createElement("span");
            label.className = "portfolio-add-text";
            label.textContent = "Add Image";

            preview.replaceChildren(plus, label);
            continue;
        }

        const image = document.createElement("img");
        image.src = typeof url === "string" ? url : url.url || url.secure_url || "";
        image.alt = `Portfolio ${i}`;

        if (image.src) preview.replaceChildren(image);
    }
}

/* PORTFOLIO INPUTS */

function initializePortfolioInputs() {
    for (let i = 1; i <= MAX_IMAGES; i++) {
        const input = $(`portfolioPhoto${i}`);
        const preview = $(`portfolioPreview${i}`);

        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) return;

            const error = validateImage(file, i) || await validateImageIntegrity(file, i);
            if (input.files?.[0] !== file) return;

            if (error) {
                input.value = "";
                showNotification("error", "Invalid Image", error);
                return;
            }

            const reader = new FileReader();

            reader.onload = event => {
                if (input.files?.[0] !== file) return;

                const image = document.createElement("img");
                image.src = event.target.result;
                image.alt = `Portfolio ${i}`;
                preview.replaceChildren(image);
            };

            reader.readAsDataURL(file);
        });
    }
}

/* IMAGE VALIDATION */

function validateImage(file, number) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return `Portfolio ${number} must be a JPG, PNG, or WebP image.`;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
        return `Portfolio ${number} exceeds 10 MB. Choose an image that is 10 MB or smaller.`;
    }

    return "";
}

function validateImageIntegrity(file, number) {
    return new Promise(resolve => {
        const objectURL = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectURL);
            resolve(image.naturalWidth > 0 && image.naturalHeight > 0
                ? ""
                : `Portfolio ${number} is corrupted or cannot be read as an image. Please select another image.`);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectURL);
            resolve(`Portfolio ${number} is corrupted or cannot be read as an image. Please select another image.`);
        };

        image.src = objectURL;
    });
}

async function validatePortfolioImages() {
    for (let i = 1; i <= MAX_IMAGES; i++) {
        const file = $(`portfolioPhoto${i}`).files?.[0];
        if (!file) continue;

        const error = validateImage(file, i) || await validateImageIntegrity(file, i);

        if (error) return validationError("Invalid Portfolio Image", error);
    }

    return true;
}

/* DESCRIPTION WORD COUNT */

function updateWordCount() {
    const value = $("description").value.trim();
    const count = value ? value.split(/\s+/).length : 0;
    $("descriptionWordCount").textContent = `${count} / ${MAX_WORDS} words`;
}

/* VALIDATE SERVICE */

function validateService() {
    const skill = $("skill").value.trim();
    const experience = $("experience").value.trim();
    const description = $("description").value.trim();

    if (!skill || !SKILLS.includes(skill)) {
        return validationError("Skill Required", "Please select a valid skill.");
    }

    if (!experience || !EXPERIENCES.includes(experience)) {
        return validationError("Experience Required", "Please select a valid experience level.");
    }

    if (!description) {
        return validationError("Description Required", "Please describe the service you provide.");
    }

    if (description.split(/\s+/).length > MAX_WORDS) {
        return validationError("Description Too Long", "Your description must not exceed 150 words.");
    }

    for (let i = 1; i <= MAX_IMAGES; i++) {
        const file = $(`portfolioPhoto${i}`).files?.[0];
        if (file) {
            const error = validateImage(file, i);
            if (error) return validationError("Invalid Portfolio Image", error);
        }
    }

    return true;
}

function validationError(title, message) {
    showNotification("error", title, message);
    return false;
}

/* UPDATE SERVICE */

async function updateService() {
    if (!validateService()) return;

    const button = $("updateServiceBtn");
    const buttonText = button.querySelector(".update-button-text");
    const loader = button.querySelector(".update-button-loader");
    const serviceId = sessionStorage.getItem("serviceId");

    if (!serviceId) {
        showNotification("error", "Service Not Found",
            "The service ID could not be found.", "Continue", goToServices);
        return;
    }

    button.disabled = true;
    buttonText.textContent = "Updating…";
    loader.hidden = false;

    try {
        if (!await validatePortfolioImages()) return;

        const formData = new FormData();

        formData.append("serviceId", serviceId);
        formData.append("skill", $("skill").value.trim());
        formData.append("experience", $("experience").value.trim());
        formData.append("description", $("description").value.trim());

        for (let i = 1; i <= MAX_IMAGES; i++) {
            const file = $(`portfolioPhoto${i}`).files?.[0];

            if (file) {
                formData.append("portfolioPhotos", file);
                formData.append("portfolioIndexes", String(i - 1));
            }
        }

        const response = await API_REQUEST(
            `${VIEW_ENDPOINT}/${encodeURIComponent(serviceId)}`,
            { method: "PUT", body: formData }
        );

        const data = await readResponse(response);

        if (response.status === 401) return showAuthenticationError();
        if (!response.ok) throw new Error(data.message || "Unable to update this service.");

        showNotification("success", "Service Updated",
            data.message || "Your service has been updated successfully.",
            "Continue", goToServices);

    } catch (error) {
        showNotification("error", "Update Failed",
            error.message || "Unable to update this service.");

    } finally {
        button.disabled = false;
        buttonText.textContent = "Update Service";
        loader.hidden = true;
    }
}

/* NOTIFICATION MODAL */

function initializeModal() {
    $("notificationActions").addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button || button.id !== "notificationButton") return;

        const callback = modalCallback;
        modalCallback = null;
        closeNotification();

        if (typeof callback === "function") callback();
    });

    $("notificationCancelButton").addEventListener("click", closeNotification);

    $("notificationOverlay").addEventListener("click", event => {
        if (event.target === $("notificationOverlay")) closeNotification();
    });
}

function showNotification(type, title, message, buttonText = "Continue", callback = null) {
    const overlay = $("notificationOverlay");
    const icon = $("notificationIcon");

    modalCallback = callback;
    $("notificationCard").className = `notification-card ${type}`;
    $("notificationTitle").textContent = title;
    $("notificationText").textContent = message;
    icon.textContent = type === "success" ? "✓" : "!";

    icon.style.color = type === "success" ? "#22c55e" :
        type === "warning" ? "#f59e0b" : "#ef4444";

    icon.style.background = type === "success" ? "rgba(34,197,94,.1)" :
        type === "warning" ? "rgba(245,158,11,.1)" : "rgba(239,68,68,.1)";

    const actions = $("notificationActions");
    actions.replaceChildren();

    const button = document.createElement("button");
    button.type = "button";
    button.id = "notificationButton";
    button.textContent = buttonText;
    actions.appendChild(button);

    $("notificationCancelButton").style.display = callback ? "none" : "flex";
    overlay.hidden = false;
    overlay.classList.add("active");
}

/* CONNECTING MODAL */

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

/* AUTHENTICATION ERROR */

function showAuthenticationError() {
    closeNotification();

    showNotification("error", "Authentication Required",
        "Your session has expired. Please log in again.",
        "Continue", () => {
            location.href = "../worker-authentication/index.html";
        });
}

/* SERVER RESPONSE */

async function readResponse(response) {
    const responseText = await response.text();
    if (!responseText) return {};

    try {
        return JSON.parse(responseText);
    } catch {
        throw new Error("The server returned an invalid response. Please try again.");
    }
}