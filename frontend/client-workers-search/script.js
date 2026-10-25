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
    const changeLocationBtn = $("changeLocationBtn");
    const skillFilter = $("skillFilter");

    const profilePhoto = $("profilePhoto");
    const profilePhotoPlaceholder = $("profilePhotoPlaceholder");

    const workersContainer = $("workersContainer");
    const workersLoading = $("workersLoading");
    const workersEmpty = $("workersEmpty");

    const notificationOverlay = $("notificationOverlay");
    const notificationCard = $("notificationOverlay").querySelector(".notification-card");
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

    /* Sidebar — matches client dashboard */
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

    changeLocationBtn.addEventListener("click", () => {
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
            const client = data.client || data;
            displayProfilePhoto(client.profilePhoto);
        } catch (error) {
            console.error("Client profile photo request failed:", error);
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
        if (typeof notificationButton.onclick === "function") return;
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

    /* Session expiry — refresh and retry are handled by config.js */
    window.addEventListener("authSessionExpired", () => {
        sessionExpired = true;
        workersLoading.hidden = true;
        isLoadingWorkers = false;

        if (isLoggingOut) return;

        showNotification(
            "Session Expired",
            "Your authentication session has expired. Please log in again.",
            "error",
            () => {
                window.location.href = "../client-authentication/index.html";
            }
        );
    });

    /* Worker data helpers */
    const getWorkerId = worker => worker.workerId || worker._id || "";

    function getWorkerServices(worker) {
        if (Array.isArray(worker.services)) {
            return worker.services.filter(service =>
                service && service.skill && String(service.skill).trim()
            );
        }

        return worker.skill
            ? [{ skill: worker.skill, id: worker.serviceId || worker.id || "" }]
            : [];
    }

    const getServiceId = service =>
        service.id || service.Id || service._id || service.serviceId || "";

    const getWorkerLocation = worker => worker.lga || "Location unavailable";

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

    /* Skills dropdown */
    function loadSkills() {
        const selectedSkill = skillFilter.value;
        const skills = [...new Set(
            workers.flatMap(worker =>
                getWorkerServices(worker).map(service => String(service.skill).trim())
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

        skillFilter.value = skills.includes(selectedSkill) ? selectedSkill : "";
    }

    /* Worker cards */
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
        card.setAttribute("aria-label", `View ${name}, ${skill}, ${location}`);

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
            if (!workerId || !serviceId) {
                showNotification(
                    "Worker Details Unavailable",
                    "The worker or service identifier is missing. Please try again later.",
                    "error"
                );
                return;
            }

            sessionStorage.setItem("workerId", String(workerId));
            sessionStorage.setItem("serviceId", String(serviceId));
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

    /* Render filtered workers */
    function renderWorkers() {
        workersContainer.replaceChildren();

        const selectedSkill = skillFilter.value.trim().toLowerCase();
        const cards = [];

        workers.forEach(worker => {
            getWorkerServices(worker).forEach(service => {
                const skill = String(service.skill).trim();

                if (!selectedSkill || skill.toLowerCase() === selectedSkill) {
                    cards.push(createWorkerCard(worker, service));
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

    skillFilter.addEventListener("change", () => {
        if (!isLoadingWorkers && !sessionExpired) renderWorkers();
    });

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
            const response = await API_REQUEST("/api/client/worker-search", {
                method: "GET"
            });

            if (requestVersion !== workerRequestVersion || sessionExpired) return;

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

            if (requestVersion !== workerRequestVersion || sessionExpired) return;

            workers = Array.isArray(data.workers) ? data.workers : [];
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
            "info"
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
                const response = await API_REQUEST("/api/auth/logout", {
                    method: "POST"
                });

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

                window.location.href = "../client-authentication/index.html";
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