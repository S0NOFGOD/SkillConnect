"use strict";

const $ = id => document.getElementById(id);

const profilePage = $("profilePage"),
    workerProfileForm = $("workerProfileForm"),
    profilePhotoInput = $("profilePhoto"),
    profilePhotoImage = $("profilePhotoImage"),
    profilePhotoPlaceholder = $("profilePhotoPlaceholder"),
    fullNameInput = $("fullName"),
    phoneInput = $("phone"),
    latitudeInput = $("latitude"),
    longitudeInput = $("longitude"),
    getLocationBtn = $("getLocationBtn"),
    locationButtonText = getLocationBtn?.querySelector(".location-button-text"),
    progressPercentage = $("progressPercentage"),
    progressFill = $("progressFill"),
    continueBtn = $("continueBtn"),
    buttonText = continueBtn?.querySelector(".button-text"),
    notificationOverlay = $("notificationOverlay"),
    notificationCard = $("notificationCard"),
    notificationIcon = $("notificationIcon"),
    notificationTitle = $("notificationTitle"),
    notificationText = $("notificationText"),
    notificationButton = $("notificationButton"),
    menuToggle = $("menuToggle"),
    sidebar = $("mobileSidebar"),
    sidebarOverlay = $("sidebarOverlay"),
    sidebarClose = $("sidebarClose"),
    footerYear = $("footerYear");

const CREATE_PROFILE_ENDPOINT = "/api/worker/create-profile",
    AUTHENTICATION_REDIRECT = "../worker-authentication/index.html",
    SERVICES_REDIRECT = "../worker-services/index.html",
    MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]),
    MODAL_ICONS = { success: "✓", error: "!", info: "i" };

let isCreatingProfile = false,
    isGettingLocation = false,
    modalCloseCallback = null;

/* SIDEBAR */

function openSidebar() {
    if (!sidebar || !sidebarOverlay || !menuToggle) return;

    sidebar.classList.add("open");
    sidebarOverlay.classList.add("show");
    sidebar.setAttribute("aria-hidden", "false");
    sidebar.removeAttribute("inert");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    sidebarClose?.focus();
}

function closeSidebar() {
    if (!sidebar || !sidebarOverlay || !menuToggle) return;

    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
    sidebar.setAttribute("aria-hidden", "true");
    sidebar.setAttribute("inert", "");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    menuToggle.focus();
}

menuToggle?.addEventListener("click", openSidebar);
sidebarClose?.addEventListener("click", closeSidebar);
sidebarOverlay?.addEventListener("click", closeSidebar);

sidebar?.querySelectorAll(".sidebar-links a").forEach(link =>
    link.addEventListener("click", closeSidebar)
);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar?.classList.contains("open"))
        closeSidebar();
});

if (footerYear) footerYear.textContent = new Date().getFullYear();

/* WORKER EMAIL */

function initializeWorkerEmail() {
    const googleEmail = new URLSearchParams(location.search).get("email");

    if (googleEmail?.trim()) {
        const email = googleEmail.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            sessionStorage.removeItem("workerEmail");

            showNotification(
                "error",
                "Invalid Registration",
                "The email address received from Google is invalid.",
                () => location.href = AUTHENTICATION_REDIRECT
            );

            return false;
        }

        sessionStorage.setItem("workerEmail", email);
        history.replaceState({}, document.title, location.pathname);
        return true;
    }

    if (sessionStorage.getItem("workerEmail")?.trim()) return true;

    showNotification(
        "error",
        "Registration Session Missing",
        "Your registration session could not be found. Please register or log in again.",
        () => location.href = AUTHENTICATION_REDIRECT
    );

    return false;
}

/* LOADING STATE */

function setCreateProfileLoading(loading) {
    if (!continueBtn) return;

    continueBtn.disabled = loading;
    continueBtn.classList.toggle("loading", loading);

    if (buttonText)
        buttonText.textContent = loading ? "Creating..." : "Create Profile";
}

function resetCreateProfileState() {
    isCreatingProfile = false;
    setCreateProfileLoading(false);
}

/* NOTIFICATIONS */

function showNotification(type, title, message, onClose = null) {
    if (!notificationOverlay || !notificationCard) return;

    modalCloseCallback = onClose;

    notificationCard.classList.remove("success", "error", "info");
    notificationCard.classList.add(type);
    notificationIcon.textContent = MODAL_ICONS[type] || "!";
    notificationTitle.textContent = title;
    notificationText.textContent = message;
    notificationButton.disabled = false;
    notificationButton.textContent = "Continue";
    notificationOverlay.hidden = false;

    document.body.classList.add("modal-open");
    notificationButton.focus();
}

function closeNotification() {
    if (!notificationOverlay) return;

    notificationOverlay.hidden = true;
    document.body.classList.remove("modal-open");

    const callback = modalCloseCallback;
    modalCloseCallback = null;

    if (typeof callback === "function") callback();
}

notificationButton?.addEventListener("click", closeNotification);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && notificationOverlay && !notificationOverlay.hidden)
        closeNotification();
});

/* AUTHENTICATION EXPIRY */

window.addEventListener("authSessionExpired", () => {
    resetCreateProfileState();

    if (notificationOverlay && !notificationOverlay.hidden) return;

    showNotification(
        "error",
        "Authentication Required",
        "Your session has expired. Please log in again.",
        () => location.href = AUTHENTICATION_REDIRECT
    );
});

/* PROFILE PHOTO */

async function validateProfilePhoto(file) {
    if (!file)
        return { valid: false, message: "Please upload your profile photo." };

    if (!ALLOWED_IMAGE_TYPES.has(file.type))
        return { valid: false, message: "Profile photo must be a JPG, PNG, or WebP image." };

    if (file.size > MAX_PROFILE_PHOTO_SIZE)
        return { valid: false, message: "Profile photo must not exceed 10 MB." };

    try {
        const image = await createImageBitmap(file);
        image.close();

        return { valid: true };
    } catch {
        return {
            valid: false,
            message: "Your profile photo could not be decoded. Please upload a valid JPG, PNG, or WebP image."
        };
    }
}

function resetProfilePhotoPreview() {
    profilePhotoImage.src = "";
    profilePhotoImage.hidden = true;
    profilePhotoPlaceholder.hidden = false;

    const addText = document.querySelector(".profile-photo-add-text");
    if (addText) addText.hidden = false;
}

profilePhotoInput?.addEventListener("change", () => {
    const file = profilePhotoInput.files?.[0];

    if (!file) {
        resetProfilePhotoPreview();
        updateProgress();
        return;
    }

    profilePhotoImage.src = URL.createObjectURL(file);
    profilePhotoImage.hidden = false;
    profilePhotoPlaceholder.hidden = true;

    const addText = document.querySelector(".profile-photo-add-text");
    if (addText) addText.hidden = true;

    updateProgress();
});

/* NAME VALIDATION */

function validateFullName(value) {
    const parts = value.trim().replace(/\s+/g, " ").split(" "),
        pattern = /^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

    if (parts.length !== 2 || !parts.every(part => pattern.test(part)))
        return {
            valid: false,
            message: "Please enter exactly two names with a space between them, for example: Destiny Okpone."
        };

    return { valid: true };
}

/* PHONE VALIDATION */

function validatePhone(value) {
    const phone = value.trim().replace(/[\s\-()]/g, "");

    if (!/^0[789]\d{9}$/.test(phone) && !/^\+?234[789]\d{9}$/.test(phone))
        return { valid: false, message: "Please enter a valid Nigerian phone number." };

    return { valid: true };
}

/* LOCATION */

function getWorkerLocation() {
    if (isGettingLocation) return;

    if (!navigator.geolocation) {
        showNotification("error", "Location Unavailable", "Your browser does not support location services.");
        return;
    }

    isGettingLocation = true;
    getLocationBtn.disabled = true;
    locationButtonText.textContent = "Getting Location...";

    navigator.geolocation.getCurrentPosition(
        position => {
            latitudeInput.value = position.coords.latitude.toFixed(7);
            longitudeInput.value = position.coords.longitude.toFixed(7);

            isGettingLocation = false;
            getLocationBtn.disabled = false;
            locationButtonText.textContent = "Get My Location";
            updateProgress();
        },
        error => {
            isGettingLocation = false;
            getLocationBtn.disabled = false;
            locationButtonText.textContent = "Get My Location";

            const messages = {
                [error.PERMISSION_DENIED]: "Location permission was denied. Please allow location access in your browser settings and try again.",
                [error.POSITION_UNAVAILABLE]: "Your current location is unavailable. Please try again.",
                [error.TIMEOUT]: "Getting your location took too long. Please try again."
            };

            showNotification(
                "error",
                "Location Error",
                messages[error.code] || "Unable to retrieve your location. Please try again."
            );
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
}

getLocationBtn?.addEventListener("click", getWorkerLocation);

/* COORDINATE VALIDATION */

function validateCoordinates() {
    const latitude = Number(latitudeInput.value),
        longitude = Number(longitudeInput.value);

    if (!latitudeInput.value.trim() || !longitudeInput.value.trim())
        return { valid: false, message: "Please get your location before creating your profile." };

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
        return { valid: false, message: "Your latitude is invalid. Please get your location again." };

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
        return { valid: false, message: "Your longitude is invalid. Please get your location again." };

    return { valid: true };
}

/* PROGRESS */

function updateProgress() {
    const fields = [
        Boolean(profilePhotoInput?.files?.[0]),
        Boolean(fullNameInput?.value.trim()),
        Boolean(phoneInput?.value.trim()),
        Boolean(latitudeInput?.value.trim()),
        Boolean(longitudeInput?.value.trim())
    ];

    const percentage = Math.round(fields.filter(Boolean).length / fields.length * 100);

    progressPercentage.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;
}

[fullNameInput, phoneInput].forEach(input =>
    input?.addEventListener("input", updateProgress)
);

/* FORM VALIDATION */

async function validateWorkerProfileForm() {
    const photoResult = await validateProfilePhoto(profilePhotoInput.files?.[0]);

    if (!photoResult.valid) return photoResult;

    return [
        validateFullName(fullNameInput.value),
        validatePhone(phoneInput.value),
        validateCoordinates()
    ].find(result => !result.valid) || { valid: true };
}

/* RESPONSE */

async function extractResponseData(response) {
    try {
        return await response.json();
    } catch (error) {
        console.error("Unable to read backend response:", error);
        return { message: "Something went wrong. Please try again." };
    }
}

/* FORM DATA */

function buildProfileFormData(email) {
    const formData = new FormData();

    formData.append("email", email);
    formData.append("profilePhoto", profilePhotoInput.files[0]);
    formData.append("fullName", fullNameInput.value.trim());
    formData.append("phone", phoneInput.value.trim());
    formData.append("latitude", latitudeInput.value.trim());
    formData.append("longitude", longitudeInput.value.trim());

    return formData;
}

/* CREATE PROFILE */

async function createWorkerProfile() {
    if (isCreatingProfile) return;

    const validation = await validateWorkerProfileForm();

    if (!validation.valid) {
        showNotification("error", "Invalid Profile Information", validation.message);
        return;
    }

    const email = sessionStorage.getItem("workerEmail");

    if (!email?.trim()) {
        showNotification(
            "error",
            "Authentication Required",
            "Your registration session could not be found. Please register or log in again.",
            () => location.href = AUTHENTICATION_REDIRECT
        );
        return;
    }

    isCreatingProfile = true;
    setCreateProfileLoading(true);

    try {
        const response = await API_REQUEST(CREATE_PROFILE_ENDPOINT, {
            method: "POST",
            body: buildProfileFormData(email)
        });

        const data = await extractResponseData(response);

        if (response.status === 401 || data.code === "EMAIL_NOT_VERIFIED") {
            resetCreateProfileState();

            showNotification(
                "error",
                data.code === "EMAIL_NOT_VERIFIED" ? "Email Verification Required" : "Authentication Required",
                data.message || "Please verify your email address before completing your profile.",
                () => location.href = AUTHENTICATION_REDIRECT
            );
            return;
        }

        if (!response.ok) {
            resetCreateProfileState();

            showNotification(
                "error",
                "Unable To Create Profile",
                data.message || "Unable to create your profile. Please try again."
            );
            return;
        }

        sessionStorage.removeItem("workerEmail");
        resetCreateProfileState();

        showNotification(
            "success",
            "Profile Created Successfully",
            data.message || "Your worker profile has been completed successfully.",
            () => location.href = SERVICES_REDIRECT
        );

    } catch (error) {
        console.error("Create worker profile request failed:", error);
        resetCreateProfileState();

        showNotification(
            "error",
            "Request Failed",
            "Something went wrong. Please check your internet connection and try again."
        );
    } finally {
        resetCreateProfileState();
    }
}

/* SUBMISSION */

workerProfileForm?.addEventListener("submit", event => {
    event.preventDefault();
    createWorkerProfile();
});

/* INITIALIZATION */

function initializeWorkerProfilePage() {
    if (!initializeWorkerEmail()) return;

    if (profilePage) profilePage.hidden = false;

    updateProgress();
}

initializeWorkerProfilePage();