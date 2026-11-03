"use strict";

document.addEventListener("DOMContentLoaded", () => {

const $ = id => document.getElementById(id);

const loadingState = $("loadingState");
const workerContent = $("workerContent");
const errorState = $("errorState");
const errorMessage = $("errorMessage");

const backBtn = $("backBtn");
const retryBtn = $("retryBtn");
const seeMoreBtn = $("seeMoreBtn");
const contactWorkerBtn = $("contactWorkerBtn");
const rateWorkerBtn = $("rateWorkerBtn");

const workerPhoto = $("workerPhoto");
const workerName = $("workerName");
const workerSkill = $("workerSkill");
const workerLocation = $("workerLocation");
const workerDescription = $("workerDescription");

const infoSkill = $("infoSkill");
const infoExperience = $("infoExperience");
const infoLocation = $("infoLocation");
const infoRating = $("infoRating");

const portfolioGrid = $("portfolioGrid");
const reviewList = $("reviewList");

const notificationOverlay = $("notificationOverlay");
const notificationTitle = $("notificationTitle");
const notificationMessage = $("notificationMessage");
const notificationButton = $("notificationButton");

const ratingOverlay = $("ratingOverlay");
const ratingCancelButton = $("ratingCancelButton");
const ratingConfirmButton = $("ratingConfirmButton");

let workerData = null;

const workerId = sessionStorage.getItem("workerId");
const serviceId = sessionStorage.getItem("serviceId");

const API_URL = API_ENDPOINT.replace(/\/$/, "");

function showLoading() {
    loadingState.hidden = false;
    workerContent.hidden = true;
    errorState.hidden = true;
}

function showError(message) {
    loadingState.hidden = true;
    workerContent.hidden = true;
    errorState.hidden = false;
    errorMessage.textContent = message;
}

function showNotification(title, message) {
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    notificationOverlay.hidden = false;
}

function closeNotification() {
    notificationOverlay.hidden = true;
}

function openRatingModal() {
    ratingOverlay.hidden = false;
}

function closeRatingModal() {
    ratingOverlay.hidden = true;
}

notificationButton.addEventListener("click", closeNotification);

notificationOverlay.addEventListener("click", event => {
    if (event.target === notificationOverlay) {
        closeNotification();
    }
});

ratingCancelButton.addEventListener("click", closeRatingModal);

ratingOverlay.addEventListener("click", event => {
    if (event.target === ratingOverlay) {
        closeRatingModal();
    }
});

/* LOAD WORKER DETAILS */

async function loadWorkerDetails() {

    showLoading();

    if (!workerId || !serviceId) {
        showError("Worker information could not be found.");
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/client-worker-details`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    workerId,
                    serviceId
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showError(data.message || "Unable to load worker details.");
            return;
        }

        workerData = data.worker;

        displayWorker(workerData);

    } catch (error) {

        console.error("Worker details error:", error);

        showError("Unable to connect to the server. Please try again.");

    }
}

/* DISPLAY WORKER */

function displayWorker(data) {

    workerPhoto.src = data.profilePhoto || "";
    workerPhoto.alt = `${data.fullName || "Worker"} profile photo`;

    workerName.textContent = data.fullName || "-";
    workerSkill.textContent = data.skill || "-";

    const latitude = data.latitude;

    workerLocation.textContent =
        latitude !== null && latitude !== undefined
        ? `Latitude: ${latitude}`
        : "Location unavailable";

    workerDescription.textContent = data.description || "-";

    infoSkill.textContent = data.skill || "-";
    infoExperience.textContent = data.experience || "-";
    infoLocation.textContent =
        latitude !== null && latitude !== undefined
        ? String(latitude)
        : "Unavailable";

    infoRating.textContent =
        `⭐ ${Number(data.rating || 0).toFixed(1)} (${data.reviewCount || 0} Reviews)`;

    displayPortfolio(data.portfolioPhotos || []);

    displayReviews(data.ratingAndReview || []);

    loadingState.hidden = true;
    errorState.hidden = true;
    workerContent.hidden = false;
}

/* PORTFOLIO */

function displayPortfolio(photos) {

    portfolioGrid.innerHTML = "";

    if (!photos.length) {
        portfolioGrid.innerHTML =
            `<p class="empty-reviews">No portfolio photos available.</p>`;
        return;
    }

    photos.forEach(photo => {

        const image = document.createElement("img");

        image.src = photo;
        image.alt = "Worker portfolio";
        image.loading = "lazy";

        portfolioGrid.appendChild(image);

    });
}

/* REVIEWS */

function displayReviews(reviews) {

    reviewList.innerHTML = "";

    if (!reviews.length) {
        reviewList.innerHTML =
            `<p class="empty-reviews">No ratings or reviews yet.</p>`;
        return;
    }

    reviews
        .slice()
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 3)
        .forEach(review => {

            const item = document.createElement("div");
            item.className = "review-item";

            const top = document.createElement("div");
            top.className = "review-top";

            const name = document.createElement("span");
            name.className = "review-name";
            name.textContent = review.fullName || "Client";

            const rating = document.createElement("span");
            rating.className = "review-rating";
            rating.textContent = `⭐ ${review.rating}/5`;

            top.append(name, rating);

            const text = document.createElement("p");
            text.className = "review-text";
            text.textContent = review.review || "";

            const date = document.createElement("p");
            date.className = "review-date";
            date.textContent = formatDate(review.date);

            item.append(top, text, date);

            reviewList.appendChild(item);

        });
}

function formatDate(date) {

    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

/* BACK NAVIGATION */

backBtn.addEventListener("click", () => {

    sessionStorage.removeItem("workerId");
    sessionStorage.removeItem("serviceId");

    window.location.href = "../services/index.html";

});

/* SEE MORE */

seeMoreBtn.addEventListener("click", () => {

    window.location.href = "../client-view-ratings/index.html";

});

/* CONTACT WORKER */

contactWorkerBtn.addEventListener("click", async () => {

    if (!workerId) return;

    contactWorkerBtn.disabled = true;
    contactWorkerBtn.textContent = "Connecting...";

    try {

        const response = await fetch(
            `${API_URL}/api/client-worker-details/contact`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    workerId
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            showNotification(
                "Unable to Contact Worker",
                data.message || "Unable to contact this worker."
            );

            return;
        }

        contactWorkerBtn.textContent = "Contact Worker";

        if (!data.phone) {

            showNotification(
                "Phone Number Unavailable",
                "This worker's phone number is not available."
            );

            return;
        }

        window.location.href = `tel:${data.phone}`;

    } catch (error) {

        console.error("Contact worker error:", error);

        showNotification(
            "Connection Error",
            "Unable to contact this worker. Please try again."
        );

    } finally {

        contactWorkerBtn.disabled = false;
        contactWorkerBtn.textContent = "Contact Worker";

    }

});

/* RATE WORKER CONFIRMATION */

rateWorkerBtn.addEventListener("click", openRatingModal);

ratingCancelButton.addEventListener("click", closeRatingModal);

ratingConfirmButton.addEventListener("click", () => {

    closeRatingModal();

    window.location.href = "../client-authentication/index.html";

});

/* RETRY */

retryBtn.addEventListener("click", loadWorkerDetails);

loadWorkerDetails();

});