"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const menuBtn = $("menuBtn");
    const closeMenuBtn = $("closeMenuBtn");
    const sidebar = $("sidebar");
    const overlay = $("overlay");

    const dashboardBtn = $("dashboardBtn");
    const findWorkersBtn = $("findWorkersBtn");
    const editProfileBtn = $("editProfileBtn");
    const logoutBtn = $("logoutBtn");

    const profilePhoto = $("profilePhoto");
    const profilePhotoPlaceholder = $("profilePhotoPlaceholder");

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

    let workers = [];
    let notificationAction = null;
    let sessionExpired = false;
    let isLoggingOut = false;
    let isLoadingWorkers = false;
    let workerRequestVersion = 0;

    /* Sidebar */

    function closeSidebar() {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        menuBtn.setAttribute("aria-expanded", "false");
        overlay.setAttribute("aria-hidden", "true");
    }

    function openSidebar() {
        sidebar.classList.add("active");
        overlay.classList.add("active");
        menuBtn.setAttribute("aria-expanded", "true");
        overlay.setAttribute("aria-hidden", "false");
    }

    menuBtn.addEventListener("click", () => {
        sidebar.classList.contains("active")
            ? closeSidebar()
            : openSidebar();
    });

    closeMenuBtn.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
            if (!notificationOverlay.hidden) closeNotification();
        }
    });

    dashboardBtn.addEventListener("click", () => {
        window.location.href = "../client-dashboard/index.html";
    });

    findWorkersBtn.addEventListener("click", () => {
        closeSidebar();
        renderWorkers();
    });

    editProfileBtn.addEventListener("click", () => {
        window.location.href = "../client-edit-profile/index.html";
    });

    /* Client profile photo */

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

    async function loadClientProfilePhoto() {
        try {
            const response = await API_REQUEST("/api/client-dashboard");

            if (!response.ok) return;

            const data = await response.json();
            displayProfilePhoto(
                (data.client || data).profilePhoto
            );
        } catch (error) {
            console.error("Client profile photo error:", error);
        }
    }

    /* Notifications */

    function resetNotificationButtons() {
        notificationButton.disabled = false;
        notificationCancelButtonMobile.disabled = false;

        notificationButton.textContent = "Continue";
        notificationCancelButtonMobile.textContent = "No";

        notificationButton.onclick = null;
        notificationCancelButtonMobile.onclick = null;
    }

    function showNotification(title, message, type = "info", action = null) {
        notificationCard.className = `notification-card ${type}`;

        notificationTitle.textContent = title;
        notificationText.textContent = message;

        notificationIcon.textContent =
            type === "error" ? "!" :
            type === "success" ? "✓" :
            type === "confirm" ? "?" : "i";

        notificationAction = action;

        resetNotificationButtons();
        notificationOverlay.hidden = false;
        notificationButton.focus();
    }

    function closeNotification() {
        notificationOverlay.hidden = true;

        const action = notificationAction;
        notificationAction = null;

        resetNotificationButtons();

        if (typeof action === "function") action();
    }

    notificationButton.addEventListener("click", () => {
        if (typeof notificationButton.onclick === "function") {
            return notificationButton.onclick();
        }

        closeNotification();
    });

    notificationCancelButtonMobile.addEventListener("click", () => {
        notificationOverlay.hidden = true;
        notificationAction = null;
        resetNotificationButtons();
    });

    notificationOverlay.addEventListener("click", event => {
        if (event.target === notificationOverlay) {
            notificationOverlay.hidden = true;
            notificationAction = null;
            resetNotificationButtons();
        }
    });

    /* Authentication expiry */

    window.addEventListener("authSessionExpired", () => {
        sessionExpired = true;
        workerRequestVersion++;
        isLoadingWorkers = false;

        workersLoading.hidden = true;
        workersContainer.hidden = true;

        showNotification(
            "Session Expired",
            "Your session has expired. Please log in again.",
            "error",
            () => {
                window.location.href = "../client-authentication/index.html";
            }
        );
    });

    /* Worker helpers */

    const getWorkerInitials = name =>
        String(name || "Worker")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(part => part.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase();

    const getLatitude = worker => {
        const latitude = Number(worker.latitude);

        return Number.isFinite(latitude)
            ? latitude.toFixed(5)
            : "Unavailable";
    };

    /* Load skill dropdown */

    function loadSkills() {
        const selectedSkill = skillFilter.value;

        const skills = [
            ...new Set(
                workers.map(worker => String(worker.skill || "").trim())
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));

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

    /* Create worker card */

    function createWorkerCard(worker) {
        const name = worker.fullName || "Worker";
        const skill = String(worker.skill || "Unknown Skill");
        const latitude = getLatitude(worker);

        const card = document.createElement("div");

        card.className = "worker-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute(
            "aria-label",
            `View ${name}, ${skill}, latitude ${latitude}`
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
        locationElement.textContent = latitude;

        details.append(skillElement, divider, locationElement);
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
            if (!worker.workerId || !worker.serviceId) {
                showNotification(
                    "Worker Details Unavailable",
                    "The worker or service identifier is missing.",
                    "error"
                );
                return;
            }

            sessionStorage.setItem("workerId", String(worker.workerId));
            sessionStorage.setItem("serviceId", String(worker.serviceId));

            window.location.href = "../client-worker-details/index.html";
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

    /* Search and filter workers */

    function renderWorkers() {
        workersContainer.replaceChildren();

        const selectedSkill = skillFilter.value.trim().toLowerCase();
        const searchValue = skillSearch.value.trim().toLowerCase();

        const filteredWorkers = workers
            .filter(worker => {
                const skill = String(worker.skill || "").toLowerCase();

                return (
                    (!selectedSkill || skill === selectedSkill) &&
                    (!searchValue || skill.includes(searchValue))
                );
            })
            .sort((a, b) =>
                Number(a.distanceKm ?? Infinity) -
                Number(b.distanceKm ?? Infinity)
            );

        if (!filteredWorkers.length) {
            workersContainer.hidden = true;
            workersEmpty.hidden = false;

            workersEmptyText.textContent =
                selectedSkill || searchValue
                    ? "No workers found for this skill."
                    : "No workers found within your location.";

            return;
        }

        const cards = filteredWorkers.map(createWorkerCard);

        workersContainer.append(...cards);
        workersContainer.hidden = false;
        workersEmpty.hidden = true;
    }

    skillFilter.addEventListener("change", renderWorkers);
    skillSearch.addEventListener("input", renderWorkers);

    /* Load workers */

    async function loadWorkers() {
        if (isLoadingWorkers) return;

        isLoadingWorkers = true;
        sessionExpired = false;

        const requestVersion = ++workerRequestVersion;

        workersLoading.hidden = false;
        workersContainer.hidden = true;
        workersEmpty.hidden = true;

        try {
            const response = await API_REQUEST(
                "/api/client/worker-search",
                { method: "GET" }
            );

            if (
                requestVersion !== workerRequestVersion ||
                sessionExpired
            ) return;

            if (!response.ok) {
                let message = "Unable to find workers. Please try again.";

                try {
                    const data = await response.json();
                    if (data.message) message = data.message;
                } catch {}

                showNotification("Search Error", message, "error");
                return;
            }

            const data = await response.json();

            if (
                requestVersion !== workerRequestVersion ||
                sessionExpired
            ) return;

            workers = Array.isArray(data.workers)
                ? data.workers
                : [];

            loadSkills();
            renderWorkers();

        } catch (error) {
            console.error("Worker search error:", error);

            if (!sessionExpired) {
                showNotification(
                    "Connection Error",
                    "Unable to connect to the server. Please check your connection and try again.",
                    "error"
                );
            }
        } finally {
            if (requestVersion === workerRequestVersion) {
                workersLoading.hidden = true;
                isLoadingWorkers = false;
            }
        }
    }

    /* Logout */

    logoutBtn.addEventListener("click", () => {
        closeSidebar();

        if (isLoggingOut) return;

        showNotification(
            "Logout",
            "Are you sure you want to log out?",
            "confirm"
        );

        notificationButton.textContent = "Yes";
        notificationCancelButtonMobile.textContent = "No";

        notificationButton.onclick = async () => {
            if (isLoggingOut) return;

            isLoggingOut = true;

            notificationButton.disabled = true;
            notificationCancelButtonMobile.disabled = true;
            notificationButton.textContent = "Connecting…";

            try {
                const response = await API_REQUEST(
                    "/api/auth/logout",
                    { method: "POST" }
                );

                if (!response.ok) {
                    let message = "Logout failed. Please try again.";

                    try {
                        const data = await response.json();
                        if (data.message) message = data.message;
                    } catch {}

                    isLoggingOut = false;

                    showNotification("Logout Error", message, "error");
                    return;
                }

                window.location.href =
                    "../client-authentication/index.html";

            } catch (error) {
                console.error("Logout error:", error);
                isLoggingOut = false;

                showNotification(
                    "Connection Error",
                    "Unable to connect to the server. Please try again.",
                    "error"
                );
            }
        };

        notificationCancelButtonMobile.onclick = () => {
            notificationOverlay.hidden = true;
            notificationAction = null;
            isLoggingOut = false;
            resetNotificationButtons();
        };
    });

    /* Initial page load */

    loadClientProfilePhoto();
    loadWorkers();
});