document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const menuBtn = document.getElementById("menuBtn");
    const closeMenuBtn = document.getElementById("closeMenuBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    const dashboardBtn = document.getElementById("dashboardBtn");
    const findWorkersBtn = document.getElementById("findWorkersBtn");
    const editProfileBtn = document.getElementById("editProfileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const changeLocationBtn = document.getElementById("changeLocationBtn");
    const skillFilter = document.getElementById("skillFilter");

    const workersContainer = document.getElementById("workersContainer");
    const workersLoading = document.getElementById("workersLoading");
    const workersEmpty = document.getElementById("workersEmpty");

    const notificationOverlay = document.getElementById("notificationOverlay");
    const notificationIcon = document.getElementById("notificationIcon");
    const notificationTitle = document.getElementById("notificationTitle");
    const notificationText = document.getElementById("notificationText");
    const notificationButton = document.getElementById("notificationButton");
    const notificationCancelButtonMobile = document.getElementById(
        "notificationCancelButtonMobile"
    );

    // ==========================================
    // STATE
    // ==========================================

    let workers = [];
    let notificationAction = null;
    let sessionExpired = false;
    let isLoggingOut = false;
    let isLoadingWorkers = false;

    // Prevent stale worker responses from replacing newer results.
    let workerRequestVersion = 0;

    // ==========================================
    // NAVIGATION
    // ==========================================

    const closeSidebar = () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");

        menuBtn.setAttribute("aria-expanded", "false");
    };

    const openSidebar = () => {
        sidebar.classList.add("open");
        overlay.classList.add("active");

        menuBtn.setAttribute("aria-expanded", "true");
    };

    menuBtn.addEventListener("click", () => {
        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    closeMenuBtn.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    dashboardBtn.addEventListener("click", () => {
        window.location.href = "../client-dashboard/index.html";
    });

    findWorkersBtn.addEventListener("click", () => {
        closeSidebar();

        // Already on the Find Workers page.
        renderWorkers();
    });

    editProfileBtn.addEventListener("click", () => {
        window.location.href = "../client-edit-profile/index.html";
    });

    changeLocationBtn.addEventListener("click", () => {
        window.location.href = "../client-edit-profile/index.html";
    });

    // ==========================================
    // NOTIFICATION MODAL
    // ==========================================

    const resetNotificationButtons = () => {
        notificationButton.disabled = false;
        notificationCancelButtonMobile.disabled = false;

        notificationButton.textContent = "Continue";
        notificationCancelButtonMobile.textContent = "No";

        notificationButton.onclick = null;
        notificationCancelButtonMobile.onclick = null;
    };

    const showNotification = (
        title,
        message,
        type = "info",
        action = null
    ) => {
        notificationTitle.textContent = title;
        notificationText.textContent = message;

        notificationIcon.textContent =
            type === "error"
                ? "!"
                : type === "success"
                    ? "✓"
                    : "i";

        notificationAction = action;

        resetNotificationButtons();

        notificationOverlay.hidden = false;

        notificationButton.focus();
    };

    const closeNotification = () => {
        notificationOverlay.hidden = true;

        const action = notificationAction;
        notificationAction = null;

        resetNotificationButtons();

        if (typeof action === "function") {
            action();
        }
    };

    // FIX: Do not close or reset the modal when a custom
    // button handler, such as the logout handler, is active.
    notificationButton.addEventListener("click", () => {
        if (typeof notificationButton.onclick === "function") {
            return;
        }

        closeNotification();
    });

    notificationCancelButtonMobile.addEventListener("click", () => {
        notificationOverlay.hidden = true;
        notificationAction = null;

        resetNotificationButtons();
    });

    // ==========================================
    // AUTHENTICATION SESSION EXPIRED
    // Uses the event dispatched by ../config.js
    // ==========================================

    window.addEventListener("authSessionExpired", () => {
        sessionExpired = true;

        workersLoading.hidden = true;
        isLoadingWorkers = false;

        if (isLoggingOut) {
            return;
        }

        showNotification(
            "Authentication Required",
            "Your session has expired. Please log in again.",
            "error",
            () => {
                window.location.href =
                    "../client-authentication/index.html";
            }
        );
    });

    // ==========================================
    // WORKER DATA HELPERS
    // ==========================================

    const getWorkerId = (worker) => {
        return worker.workerId || worker._id || "";
    };

    const getWorkerServices = (worker) => {
        if (Array.isArray(worker.services)) {
            return worker.services.filter(service => {
                return (
                    service &&
                    service.skill &&
                    String(service.skill).trim()
                );
            });
        }

        // Supports a single skill if the backend supplies one.
        if (worker.skill) {
            return [
                {
                    skill: worker.skill,
                    id: worker.serviceId || worker.id || ""
                }
            ];
        }

        return [];
    };

    const getServiceId = (service) => {
        return (
            service.id ||
            service.Id ||
            service._id ||
            service.serviceId ||
            ""
        );
    };

    const getWorkerLocation = (worker) => {
        return worker.lga || "Location unavailable";
    };

    const getWorkerInitials = (name) => {
        return String(name || "Worker")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(part => part.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    // ==========================================
    // SKILLS DROPDOWN
    // Skills are derived from loaded workers.
    // No additional API request is necessary.
    // ==========================================

    const loadSkills = () => {
        const selectedSkill = skillFilter.value;

        const skills = [
            ...new Set(
                workers.flatMap(worker => {
                    return getWorkerServices(worker).map(service => {
                        return String(service.skill).trim();
                    });
                })
            )
        ].sort((a, b) => a.localeCompare(b));

        skillFilter.replaceChildren();

        const allSkillsOption = document.createElement("option");
        allSkillsOption.value = "";
        allSkillsOption.textContent = "All Skills";

        skillFilter.appendChild(allSkillsOption);

        skills.forEach(skill => {
            const option = document.createElement("option");

            option.value = skill;
            option.textContent = skill;

            skillFilter.appendChild(option);
        });

        // Preserve the selection if the skill still exists.
        if (skills.some(skill => skill === selectedSkill)) {
            skillFilter.value = selectedSkill;
        } else {
            skillFilter.value = "";
        }
    };

    // ==========================================
    // WORKER CARD
    // ==========================================

    const createWorkerCard = (worker, service) => {
        const name = worker.fullName || "Worker";
        const initials = getWorkerInitials(name);
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
        placeholder.textContent = initials;
        placeholder.setAttribute("aria-hidden", "true");

        if (worker.profilePhoto) {
            const photo = document.createElement("img");

            photo.className = "worker-photo";
            photo.src = worker.profilePhoto;
            photo.alt = `${name}'s profile photo`;
            photo.loading = "lazy";

            photo.onerror = () => {
                photo.replaceWith(placeholder);
            };

            card.append(info, photo);
        } else {
            card.append(info, placeholder);
        }

        // ======================================
        // VIEW WORKER FLOW
        // Save workerId and service.id.
        // Redirect to worker details.
        // ======================================

        const openWorkerDetails = () => {
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

            window.location.href =
                "../client-worker-details/index.html";
        };

        card.addEventListener("click", openWorkerDetails);

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openWorkerDetails();
            }
        });

        return card;
    };

    // ==========================================
    // RENDER WORKERS
    // All Skills = every available service.
    // Selected skill = matching services only.
    // ==========================================

    const renderWorkers = () => {
        workersContainer.replaceChildren();

        const selectedSkill = skillFilter.value.trim().toLowerCase();

        const matchingCards = [];

        workers.forEach(worker => {
            const services = getWorkerServices(worker);

            services.forEach(service => {
                const skill = String(service.skill).trim();

                if (
                    !selectedSkill ||
                    skill.toLowerCase() === selectedSkill
                ) {
                    matchingCards.push(
                        createWorkerCard(worker, service)
                    );
                }
            });
        });

        if (matchingCards.length === 0) {
            workersContainer.hidden = true;
            workersEmpty.hidden = false;
            return;
        }

        workersContainer.append(...matchingCards);

        workersEmpty.hidden = true;
        workersContainer.hidden = false;
    };

    // ==========================================
    // SKILLS FILTER FLOW
    // ==========================================

    skillFilter.addEventListener("change", () => {
        if (isLoadingWorkers || sessionExpired) {
            return;
        }

        renderWorkers();
    });

    // ==========================================
    // LOAD WORKERS
    // Uses API_REQUEST() from ../config.js.
    //
    // Expected endpoint:
    // GET /api/client/worker-search
    //
    // config.js handles:
    // - credentials: "include"
    // - 401 detection
    // - POST /api/auth/refresh
    // - retrying the original request
    // ==========================================

    const loadWorkers = async () => {
        if (isLoadingWorkers) {
            return;
        }

        isLoadingWorkers = true;
        sessionExpired = false;

        const requestVersion = ++workerRequestVersion;

        workersLoading.hidden = false;
        workersContainer.hidden = true;
        workersEmpty.hidden = true;

        try {
            const response = await API_REQUEST(
                "/api/client/worker-search",
                {
                    method: "GET"
                }
            );

            if (requestVersion !== workerRequestVersion) {
                return;
            }

            if (sessionExpired) {
                return;
            }

            if (!response.ok) {
                let message =
                    "Unable to find workers. Please try again.";

                try {
                    const data = await response.json();

                    if (data.message) {
                        message = data.message;
                    }
                } catch {
                    // Keep the default error message.
                }

                showNotification(
                    "Search Error",
                    message,
                    "error"
                );

                return;
            }

            const data = await response.json();

            if (requestVersion !== workerRequestVersion) {
                return;
            }

            if (sessionExpired) {
                return;
            }

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
    };

    // ==========================================
    // LOGOUT FLOW
    //
    // No:
    // Close confirmation modal.
    //
    // Yes:
    // Display Connecting…
    // POST /api/auth/logout
    // Redirect after successful logout.
    // ==========================================

    logoutBtn.addEventListener("click", () => {
        closeSidebar();

        if (isLoggingOut) {
            return;
        }

        showNotification(
            "Logout",
            "Are you sure you want to logout?",
            "info"
        );

        notificationButton.textContent = "Yes";
        notificationCancelButtonMobile.textContent = "No";

        notificationButton.onclick = async () => {
            if (isLoggingOut) {
                return;
            }

            isLoggingOut = true;

            notificationButton.disabled = true;
            notificationCancelButtonMobile.disabled = true;

            notificationButton.textContent = "Connecting…";

            try {
                const response = await API_REQUEST(
                    "/api/auth/logout",
                    {
                        method: "POST"
                    }
                );

                if (!response.ok) {
                    let message = "Logout failed. Please try again.";

                    try {
                        const data = await response.json();

                        if (data.message) {
                            message = data.message;
                        }
                    } catch {
                        // Keep the default message.
                    }

                    isLoggingOut = false;

                    showNotification(
                        "Logout Error",
                        message,
                        "error"
                    );

                    return;
                }

                // Successful logout.
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
            // No: cancel logout and close the modal.
            notificationOverlay.hidden = true;
            notificationAction = null;

            isLoggingOut = false;

            resetNotificationButtons();
        };
    });

    // ==========================================
    // INITIAL PAGE LOAD
    // ==========================================

    loadWorkers();

});