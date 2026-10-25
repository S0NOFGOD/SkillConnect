"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const sidebar = $("sidebar");
    const menuBtn = $("menuBtn");
    const closeMenuBtn = $("closeMenuBtn");
    const overlay = $("overlay");
    const findWorkersBtn = $("findWorkersBtn");
    const editProfileBtn = $("editProfileBtn");
    const logoutBtn = $("logoutBtn");

    const clientFirstName = $("clientFirstName");
    const profilePhoto = $("profilePhoto");
    const profilePhotoPlaceholder = $("profilePhotoPlaceholder");
    const fullName = $("fullName");
    const phoneNumber = $("phoneNumber");
    const country = $("country");
    const state = $("state");
    const city = $("city");
    const lga = $("lga");

    const notificationOverlay = $("notificationOverlay");
    const notificationCard = $("notificationCard");
    const notificationIcon = $("notificationIcon");
    const notificationTitle = $("notificationTitle");
    const notificationText = $("notificationText");
    const notificationButton = $("notificationButton");
    const notificationCancelButton = $("notificationCancelButton");

    let notificationAction = null;
    let logoutInProgress = false;

    /* Sidebar navigation */
    function openMenu() {
        sidebar.classList.add("active");
        overlay.classList.add("active");
        menuBtn.setAttribute("aria-expanded", "true");
        overlay.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        menuBtn.setAttribute("aria-expanded", "false");
        overlay.setAttribute("aria-hidden", "true");
    }

    menuBtn.addEventListener("click", openMenu);
    closeMenuBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
            closeNotification();
        }
    });

    /* Notifications */
    function showNotification(type, title, message, buttonText = "Continue", action = null) {
        notificationCard.className = `notification-card ${type}`;
        notificationIcon.textContent =
            type === "success" ? "✓" :
            type === "error" ? "!" :
            type === "confirm" ? "?" : "i";

        notificationTitle.textContent = title;
        notificationText.textContent = message;
        notificationButton.textContent = buttonText;
        notificationCancelButton.textContent = type === "confirm" ? "No" : "×";
        notificationCancelButton.setAttribute(
            "aria-label",
            type === "confirm" ? "Cancel action" : "Close notification"
        );

        notificationAction = action;
        notificationOverlay.hidden = false;
    }

    function closeNotification() {
        if (!notificationOverlay || notificationOverlay.hidden) return;
        notificationOverlay.hidden = true;
        notificationAction = null;
        notificationCancelButton.textContent = "×";
        notificationCancelButton.setAttribute("aria-label", "Close notification");
    }

    notificationCancelButton.addEventListener("click", closeNotification);

    notificationOverlay.addEventListener("click", event => {
        if (event.target === notificationOverlay) closeNotification();
    });

    function setLoading(button, loading, text = "Please wait...") {
        if (loading) {
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            button.textContent = text;
            button.disabled = true;
            button.classList.add("is-loading");
        } else {
            button.textContent = button.dataset.originalText || button.textContent;
            delete button.dataset.originalText;
            button.disabled = false;
            button.classList.remove("is-loading");
        }
    }

    notificationButton.addEventListener("click", async () => {
        const action = notificationAction;

        if (!action) {
            closeNotification();
            return;
        }

        notificationAction = null;
        setLoading(notificationButton, true, "Please wait...");

        try {
            await action();
        } catch (error) {
            console.error("Notification action failed:", error);
            showNotification("error", "Something Went Wrong", "Please try again.");
        } finally {
            setLoading(notificationButton, false);
        }
    });

    function getFirstName(name = "") {
        return name.trim().split(/\s+/)[0] || "Client";
    }

    /* Dashboard data */
    function setDashboardData(data) {
        const client = data.client || data;
        const name = client.fullName || "";

        clientFirstName.textContent = getFirstName(name);
        fullName.textContent = name || "—";
        phoneNumber.textContent = client.phone || "—";
        country.textContent = client.country || "—";
        state.textContent = client.state || "—";
        city.textContent = client.city || "—";
        lga.textContent = client.lga || "—";

        displayProfilePhoto(client.profilePhoto);
    }

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

    async function loadDashboard() {
        try {
            const response = await API_REQUEST("/api/client-dashboard");

            if (response.ok) {
                const data = await response.json();
                setDashboardData(data);
                return;
            }

            if (response.status === 401) {
                showNotification(
                    "error",
                    "Session Expired",
                    "Your session has expired. Please log in again.",
                    "Continue",
                    () => {
                        window.location.href = "../client-authentication/index.html";
                    }
                );
                return;
            }

            let message = "Unable to load your dashboard.";
            try {
                const data = await response.json();
                if (data.message) message = data.message;
            } catch {}

            showNotification("error", "Dashboard Error", message);
        } catch (error) {
            console.error("Client dashboard request failed:", error);
            showNotification(
                "error",
                "Connection Error",
                "Unable to connect to SkillConnect. Please try again."
            );
        }
    }

    /* Navigation */
    findWorkersBtn.addEventListener("click", () => {
        closeMenu();
        window.location.href = "../client-workers-search/index.html";
    });

    editProfileBtn.addEventListener("click", () => {
        closeMenu();
        window.location.href = "../client-edit-profile/index.html";
    });

    /* Logout */
    logoutBtn.addEventListener("click", () => {
        showNotification(
            "confirm",
            "Logout",
            "Are you sure you want to log out?",
            "Yes",
            logoutClient
        );
    });

    async function logoutClient() {
        if (logoutInProgress) return;
        logoutInProgress = true;
        setLoading(notificationButton, true, "Logging out...");

        try {
            const response = await API_REQUEST("/api/auth/logout", {
                method: "POST"
            });

            if (response.ok) {
                window.location.href = "../client-authentication/index.html";
                return;
            }

            let message = "Unable to log out. Please try again.";
            try {
                const data = await response.json();
                if (data.message) message = data.message;
            } catch {}

            showNotification("error", "Logout Failed", message);
        } catch (error) {
            console.error("Logout request failed:", error);
            showNotification(
                "error",
                "Connection Error",
                "Unable to connect to SkillConnect. Please try again."
            );
        } finally {
            logoutInProgress = false;
            setLoading(notificationButton, false);
        }
    }

    /* Session expiry */
    window.addEventListener("authSessionExpired", () => {
        showNotification(
            "error",
            "Session Expired",
            "Your authentication session has expired. Please log in again.",
            "Continue",
            () => {
                window.location.href = "../client-authentication/index.html";
            }
        );
    });

    loadDashboard();
});