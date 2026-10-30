"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    /* Demo worker data — no API requests */
    const workers = [
        {
            workerId: "demo-worker-001",
            fullName: "Demo Worker One",
            profilePhoto: "",
            lga: "Ibadan North",
            services: [
                { id: "demo-service-001", skill: "Electrician" },
                { id: "demo-service-002", skill: "Generator Repair" }
            ]
        },
        {
            workerId: "demo-worker-002",
            fullName: "Demo Worker Two",
            profilePhoto: "",
            lga: "Ibadan South-West",
            services: [
                { id: "demo-service-003", skill: "Plumber" }
            ]
        },
        {
            workerId: "demo-worker-003",
            fullName: "Demo Worker Three",
            profilePhoto: "",
            lga: "Ibadan North-West",
            services: [
                { id: "demo-service-004", skill: "Carpenter" },
                { id: "demo-service-005", skill: "Painter" }
            ]
        },
        {
            workerId: "demo-worker-004",
            fullName: "Demo Worker Four",
            profilePhoto: "",
            lga: "Oluyole",
            services: [
                { id: "demo-service-006", skill: "Barber" }
            ]
        },
        {
            workerId: "demo-worker-005",
            fullName: "Demo Worker Five",
            profilePhoto: "",
            lga: "Akinyele",
            services: [
                { id: "demo-service-007", skill: "Mechanic" }
            ]
        },
        {
            workerId: "demo-worker-006",
            fullName: "Demo Worker Six",
            profilePhoto: "",
            lga: "Ibadan North-East",
            services: [
                { id: "demo-service-008", skill: "Cleaner" },
                { id: "demo-service-009", skill: "Welder" }
            ]
        }
    ];

    /* Page elements */
    const skillFilter = $("skillFilter");
    const workersContainer = $("workersContainer");
    const workersLoading = $("workersLoading");
    const workersEmpty = $("workersEmpty");

    /* Location elements */
    const getLocationButton = $("getLocationButton");
    const locationButtonText = $("locationButtonText");

    let currentLocation = null;

    /* Notification elements */
    const notificationOverlay = $("notificationOverlay");
    const notificationCard = $("notificationCard");
    const notificationIcon = $("notificationIcon");
    const notificationTitle = $("notificationTitle");
    const notificationText = $("notificationText");
    const notificationButton = $("notificationButton");
    const notificationCancelButton = $("notificationCancelButtonMobile");

    /* ==========================
       Notifications
    ========================== */

    function resetNotificationButtons() {
        notificationButton.disabled = false;
        notificationCancelButton.disabled = false;

        notificationButton.textContent = "Continue";
        notificationCancelButton.textContent = "Close";

        notificationButton.onclick = null;
        notificationCancelButton.onclick = null;
    }

    function showNotification(title, message, type = "info") {
        notificationCard.className = `notification-card ${type}`;
        notificationTitle.textContent = title;
        notificationText.textContent = message;

        notificationIcon.textContent =
            type === "error" ? "!" :
            type === "success" ? "✓" : "i";

        resetNotificationButtons();

        notificationOverlay.hidden = false;
        notificationButton.focus();
    }

    function closeNotification() {
        notificationOverlay.hidden = true;
        resetNotificationButtons();
    }

    notificationButton.addEventListener("click", closeNotification);

    notificationCancelButton.addEventListener(
        "click",
        closeNotification
    );

    notificationOverlay.addEventListener("click", event => {
        if (event.target === notificationOverlay) {
            closeNotification();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !notificationOverlay.hidden) {
            closeNotification();
        }
    });

    /* ==========================
       Get My Location
    ========================== */

    function resetLocationButton() {
        getLocationButton.disabled = false;

        locationButtonText.textContent = currentLocation
            ? "Refresh My Location"
            : "Get My Location";
    }

    function handleLocationError(error) {
        let message;

        switch (error.code) {
            case 1:
                message =
                    "Location permission was denied. Please allow location access in your browser settings and try again.";
                break;

            case 2:
                message =
                    "Your location could not be determined. Check your device's location settings and try again.";
                break;

            case 3:
                message =
                    "The location request timed out. Please try again.";
                break;

            default:
                message =
                    "Something went wrong while getting your location. Please try again.";
        }

        resetLocationButton();

        showNotification(
            "Unable to Get Location",
            message,
            "error"
        );
    }

    getLocationButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
            showNotification(
                "Location Not Supported",
                "Your browser does not support geolocation. Try using an updated browser.",
                "error"
            );

            return;
        }

        getLocationButton.disabled = true;
        locationButtonText.textContent = "Getting Location...";

        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                currentLocation = {
                    latitude,
                    longitude
                };

                resetLocationButton();

                showNotification(
                    "Location Retrieved",
                    `Your current coordinates are:\n\nLatitude: ${latitude}\nLongitude: ${longitude}\n\nYour location has been retrieved successfully.`,
                    "success"
                );
            },

            error => {
                handleLocationError(error);
            },

            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });

    /* ==========================
       Worker Data Helpers
    ========================== */

    const getWorkerId = worker =>
        worker.workerId || worker._id || "";

    function getWorkerServices(worker) {
        if (Array.isArray(worker.services)) {
            return worker.services.filter(service =>
                service &&
                service.skill &&
                String(service.skill).trim()
            );
        }

        return worker.skill
            ? [{
                skill: worker.skill,
                id: worker.serviceId || worker.id || ""
            }]
            : [];
    }

    const getServiceId = service =>
        service.id ||
        service.Id ||
        service._id ||
        service.serviceId ||
        "";

    const getWorkerLocation = worker =>
        worker.lga || "Location unavailable";

    function getWorkerInitials(name) {
        return String(name || "Worker")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(part => part.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }

    /* ==========================
       Populate Skill Dropdown
    ========================== */

    function loadSkills() {
        const selectedSkill = skillFilter.value;

        const skills = [...new Set(
            workers.flatMap(worker =>
                getWorkerServices(worker).map(service =>
                    String(service.skill).trim()
                )
            )
        )].sort((a, b) => a.localeCompare(b));

        skillFilter.replaceChildren();

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All Skills";

        skillFilter.appendChild(allOption);

        skills.forEach(skill => {
            const option = document.createElement("option");

            option.value = skill;
            option.textContent = skill;

            skillFilter.appendChild(option);
        });

        skillFilter.value = skills.includes(selectedSkill)
            ? selectedSkill
            : "";
    }

    /* ==========================
       Create Worker Cards
    ========================== */

    function createWorkerCard(worker, service) {
        const name = worker.fullName || "Worker";
        const skill = String(service.skill).trim();
        const location = getWorkerLocation(worker);
        const workerId = getWorkerId(worker);
        const serviceId = getServiceId(service);

        const card = document.createElement("div");

        card.className = "worker-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");

        card.setAttribute(
            "aria-label",
            `View ${name}, ${skill}, ${location}`
        );

        const info = document.createElement("div");
        info.className = "worker-info";

        const workerName = document.createElement("div");
        workerName.className = "worker-name";
        workerName.textContent = name;

        const details = document.createElement("div");
        details.className = "worker-details";

        const skillElement = document.createElement("span");
        skillElement.className = "worker-skill";
        skillElement.textContent = skill;

        const divider = document.createElement("span");
        divider.className = "worker-divider";
        divider.textContent = "|";
        divider.setAttribute("aria-hidden", "true");

        const locationElement = document.createElement("span");
        locationElement.className = "worker-location";
        locationElement.textContent = location;

        details.append(
            skillElement,
            divider,
            locationElement
        );

        info.append(workerName, details);

        const placeholder = document.createElement("div");

        placeholder.className = "worker-photo-placeholder";
        placeholder.textContent = getWorkerInitials(name);
        placeholder.setAttribute("aria-hidden", "true");

        if (worker.profilePhoto) {
            const photo = document.createElement("img");

            photo.className = "worker-photo";
            photo.src = worker.profilePhoto;
            photo.alt = `${name}'s profile photo`;
            photo.loading = "lazy";

            photo.onerror = () => photo.replaceWith(placeholder);

            card.append(info, photo);
        } else {
            card.append(info, placeholder);
        }

        function openWorkerDetails() {
            if (!workerId || !serviceId) {
                showNotification(
                    "Worker Details Unavailable",
                    "The demo worker or service identifier is missing.",
                    "error"
                );

                return;
            }

            sessionStorage.setItem("workerId", String(workerId));
            sessionStorage.setItem("serviceId", String(serviceId));

            window.location.href =
                "../client-worker-details/index.html";
        }

        card.addEventListener("click", openWorkerDetails);

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openWorkerDetails();
            }
        });

        return card;
    }

    /* ==========================
       Render Workers by Skill
    ========================== */

    function renderWorkers() {
        workersContainer.replaceChildren();

        const selectedSkill = skillFilter.value
            .trim()
            .toLowerCase();

        const cards = [];

        workers.forEach(worker => {
            getWorkerServices(worker).forEach(service => {
                const skill = String(service.skill).trim();

                if (
                    !selectedSkill ||
                    skill.toLowerCase() === selectedSkill
                ) {
                    cards.push(
                        createWorkerCard(worker, service)
                    );
                }
            });
        });

        if (!cards.length) {
            workersContainer.hidden = true;
            workersEmpty.hidden = false;
            return;
        }

        workersContainer.append(...cards);

        workersContainer.hidden = false;
        workersEmpty.hidden = true;
    }

    skillFilter.addEventListener("change", renderWorkers);

    /* ==========================
       Initial Page Load
       Demo Data Only
    ========================== */

    function loadDemoWorkers() {
        workersLoading.hidden = false;
        workersContainer.hidden = true;
        workersEmpty.hidden = true;

        loadSkills();
        renderWorkers();

        workersLoading.hidden = true;
    }

    loadDemoWorkers();
});