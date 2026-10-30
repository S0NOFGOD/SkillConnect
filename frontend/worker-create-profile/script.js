"use strict";

/* =========================================================
   1. DOM ELEMENTS
========================================================= */

const profilePage = document.getElementById("profilePage");
const workerProfileForm = document.getElementById("workerProfileForm");

const profilePhotoInput = document.getElementById("profilePhoto");
const profilePhotoImage = document.getElementById("profilePhotoImage");
const profilePhotoPlaceholder = document.getElementById("profilePhotoPlaceholder");

const fullNameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phone");

const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");

const getLocationBtn = document.getElementById("getLocationBtn");
const locationButtonText = getLocationBtn?.querySelector(".location-button-text");

const progressPercentage = document.getElementById("progressPercentage");
const progressFill = document.getElementById("progressFill");

const continueBtn = document.getElementById("continueBtn");
const buttonText = continueBtn?.querySelector(".button-text");

const notificationOverlay = document.getElementById("notificationOverlay");
const notificationCard = document.getElementById("notificationCard");
const notificationIcon = document.getElementById("notificationIcon");
const notificationTitle = document.getElementById("notificationTitle");
const notificationText = document.getElementById("notificationText");
const notificationButton = document.getElementById("notificationButton");


/* =========================================================
   2. CONFIGURATION
========================================================= */

const CREATE_PROFILE_ENDPOINT = "/api/worker/create-profile";

const AUTHENTICATION_REDIRECT =
    "../worker-authentication/index.html";

const SERVICES_REDIRECT =
    "../worker-services/index.html";

const MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

let isCreatingProfile = false;
let isGettingLocation = false;
let modalCloseCallback = null;


/* =========================================================
   3. BUTTON LOADING STATE
========================================================= */

function setCreateProfileLoading(isLoading) {
    if (!continueBtn) return;

    continueBtn.disabled = isLoading;

    continueBtn.classList.toggle(
        "loading",
        isLoading
    );

    if (buttonText) {
        buttonText.textContent = isLoading
            ? "Creating..."
            : "Create Profile";
    }
}

function resetCreateProfileState() {
    isCreatingProfile = false;

    setCreateProfileLoading(false);
}


/* =========================================================
   4. NOTIFICATION MODAL
========================================================= */

const MODAL_ICONS = {
    success: "✓",
    error: "!",
    info: "i"
};

function showNotification(
    type,
    title,
    message,
    onClose = null
) {
    if (!notificationOverlay || !notificationCard) return;

    modalCloseCallback = onClose;

    notificationCard.classList.remove(
        "success",
        "error",
        "info"
    );

    notificationCard.classList.add(type);

    notificationIcon.textContent =
        MODAL_ICONS[type] || "!";

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

    if (typeof callback === "function") {
        callback();
    }
}

notificationButton?.addEventListener(
    "click",
    closeNotification
);

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        notificationOverlay &&
        !notificationOverlay.hidden
    ) {
        closeNotification();
    }
});


/* =========================================================
   5. AUTHENTICATION SESSION EXPIRY
========================================================= */

window.addEventListener("authSessionExpired", () => {
    resetCreateProfileState();

    if (
        notificationOverlay &&
        !notificationOverlay.hidden
    ) {
        return;
    }

    showNotification(
        "error",
        "Authentication Required",
        "Your session has expired. Please log in again.",
        () => {
            window.location.href = AUTHENTICATION_REDIRECT;
        }
    );
});


/* =========================================================
   6. PROFILE PHOTO VALIDATION AND PREVIEW
========================================================= */

function validateProfilePhoto(file) {
    if (!file) {
        return {
            valid: false,
            message: "Please upload your profile photo."
        };
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return {
            valid: false,
            message: "Profile photo must be a JPG, PNG, or WebP image."
        };
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
        return {
            valid: false,
            message: "Profile photo must not exceed 10 MB."
        };
    }

    return { valid: true };
}

function resetProfilePhotoPreview() {
    profilePhotoImage.src = "";
    profilePhotoImage.hidden = true;

    profilePhotoPlaceholder.hidden = false;

    const addText = document.querySelector(
        ".profile-photo-add-text"
    );

    if (addText) {
        addText.hidden = false;
    }
}

profilePhotoInput?.addEventListener("change", () => {
    const file = profilePhotoInput.files?.[0];

    if (!file) {
        resetProfilePhotoPreview();
        updateProgress();
        return;
    }

    const result = validateProfilePhoto(file);

    if (!result.valid) {
        profilePhotoInput.value = "";

        resetProfilePhotoPreview();
        updateProgress();

        showNotification(
            "error",
            "Invalid Profile Photo",
            result.message
        );

        return;
    }

    const imageUrl = URL.createObjectURL(file);

    profilePhotoImage.src = imageUrl;
    profilePhotoImage.hidden = false;

    profilePhotoPlaceholder.hidden = true;

    const addText = document.querySelector(
        ".profile-photo-add-text"
    );

    if (addText) {
        addText.hidden = true;
    }

    updateProgress();
});


/* =========================================================
   7. FULL NAME VALIDATION
========================================================= */

function validateFullName(value) {
    const cleanName = value.trim().replace(/\s+/g, " ");

    const nameParts = cleanName.split(" ");

    const namePattern =
        /^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;

    if (
        nameParts.length !== 2 ||
        !namePattern.test(nameParts[0]) ||
        !namePattern.test(nameParts[1])
    ) {
        return {
            valid: false,
            message: "Please enter exactly two names with a space between them, for example: Destiny Okpone."
        };
    }

    return { valid: true };
}


/* =========================================================
   8. PHONE VALIDATION
========================================================= */

function validatePhone(value) {
    const phone = value.trim().replace(/[\s\-()]/g, "");

    const localFormat = /^0[789]\d{9}$/;

    const internationalFormat = /^\+?234[789]\d{9}$/;

    if (
        !localFormat.test(phone) &&
        !internationalFormat.test(phone)
    ) {
        return {
            valid: false,
            message: "Please enter a valid Nigerian phone number."
        };
    }

    return { valid: true };
}


/* =========================================================
   9. LOCATION RETRIEVAL
========================================================= */

function getWorkerLocation() {
    if (isGettingLocation) return;

    if (!navigator.geolocation) {
        showNotification(
            "error",
            "Location Unavailable",
            "Your browser does not support location services."
        );

        return;
    }

    isGettingLocation = true;

    getLocationBtn.disabled = true;

    locationButtonText.textContent = "Getting Location...";

    navigator.geolocation.getCurrentPosition(
        position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            latitudeInput.value = latitude.toFixed(7);
            longitudeInput.value = longitude.toFixed(7);

            isGettingLocation = false;

            getLocationBtn.disabled = false;

            locationButtonText.textContent = "Get My Location";

            updateProgress();
        },

        error => {
            isGettingLocation = false;

            getLocationBtn.disabled = false;

            locationButtonText.textContent = "Get My Location";

            let message =
                "Unable to retrieve your location. Please try again.";

            if (error.code === error.PERMISSION_DENIED) {
                message =
                    "Location permission was denied. Please allow location access in your browser settings and try again.";
            }

            if (error.code === error.POSITION_UNAVAILABLE) {
                message =
                    "Your current location is unavailable. Please try again.";
            }

            if (error.code === error.TIMEOUT) {
                message =
                    "Getting your location took too long. Please try again.";
            }

            showNotification(
                "error",
                "Location Error",
                message
            );
        },

        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        }
    );
}

getLocationBtn?.addEventListener(
    "click",
    getWorkerLocation
);


/* =========================================================
   10. LATITUDE AND LONGITUDE VALIDATION
========================================================= */

function validateCoordinates() {
    const latitude = Number(latitudeInput.value);
    const longitude = Number(longitudeInput.value);

    if (
        !latitudeInput.value.trim() ||
        !longitudeInput.value.trim()
    ) {
        return {
            valid: false,
            message: "Please get your location before creating your profile."
        };
    }

    if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {
        return {
            valid: false,
            message: "Your latitude is invalid. Please get your location again."
        };
    }

    if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        return {
            valid: false,
            message: "Your longitude is invalid. Please get your location again."
        };
    }

    return { valid: true };
}


/* =========================================================
   11. PROFILE COMPLETION PROGRESS
========================================================= */

function updateProgress() {
    const fields = [
        Boolean(profilePhotoInput?.files?.[0]),
        Boolean(fullNameInput?.value.trim()),
        Boolean(phoneInput?.value.trim()),
        Boolean(latitudeInput?.value.trim()),
        Boolean(longitudeInput?.value.trim())
    ];

    const completed = fields.filter(Boolean).length;

    const percentage = Math.round(
        (completed / fields.length) * 100
    );

    progressPercentage.textContent = `${percentage}%`;

    progressFill.style.width = `${percentage}%`;
}

[
    fullNameInput,
    phoneInput
].forEach(input => {
    input?.addEventListener("input", updateProgress);
});


/* =========================================================
   12. FRONTEND FORM VALIDATION
========================================================= */

function validateWorkerProfileForm() {

    /* PROFILE PHOTO */

    const photoResult = validateProfilePhoto(
        profilePhotoInput.files?.[0]
    );

    if (!photoResult.valid) {
        return photoResult;
    }

    /* FULL NAME */

    const nameResult = validateFullName(
        fullNameInput.value
    );

    if (!nameResult.valid) {
        return nameResult;
    }

    /* PHONE */

    const phoneResult = validatePhone(
        phoneInput.value
    );

    if (!phoneResult.valid) {
        return phoneResult;
    }

    /* LOCATION */

    const locationResult = validateCoordinates();

    if (!locationResult.valid) {
        return locationResult;
    }

    return { valid: true };
}


/* =========================================================
   13. RESPONSE MESSAGE EXTRACTION
========================================================= */

async function extractResponseData(response) {
    try {
        return await response.json();
    } catch (error) {
        console.error(
            "Unable to read backend response:",
            error
        );

        return {
            message: "Something went wrong. Please try again."
        };
    }
}


/* =========================================================
   14. BUILD PROFILE FORM DATA
========================================================= */

function buildProfileFormData(email) {
    const formData = new FormData();

    formData.append("email", email);

    formData.append(
        "profilePhoto",
        profilePhotoInput.files[0]
    );

    formData.append(
        "fullName",
        fullNameInput.value.trim()
    );

    formData.append(
        "phone",
        phoneInput.value.trim()
    );

    formData.append(
        "latitude",
        latitudeInput.value.trim()
    );

    formData.append(
        "longitude",
        longitudeInput.value.trim()
    );

    return formData;
}


/* =========================================================
   15. CREATE WORKER PROFILE REQUEST
========================================================= */

async function createWorkerProfile() {
    if (isCreatingProfile) return;

    /* FRONTEND VALIDATION */

    const validationResult =
        validateWorkerProfileForm();

    if (!validationResult.valid) {
        showNotification(
            "error",
            "Invalid Profile Information",
            validationResult.message
        );

        return;
    }

    /* GET EMAIL FROM SESSION STORAGE */

    const email = sessionStorage.getItem("workerEmail");

    if (!email || !email.trim()) {
        showNotification(
            "error",
            "Authentication Required",
            "Your registration session could not be found. Please register or log in again.",
            () => {
                window.location.href = AUTHENTICATION_REDIRECT;
            }
        );

        return;
    }

    /* START LOADING */

    isCreatingProfile = true;

    setCreateProfileLoading(true);

    try {
        const formData = buildProfileFormData(email);

        /*
            API_REQUEST handles:
            - HTTP-only cookies.
            - Access-token refresh.
            - Original request retry after refresh.
        */

        const response = await API_REQUEST(
            CREATE_PROFILE_ENDPOINT,
            {
                method: "POST",
                body: formData
            }
        );

        const data = await extractResponseData(response);

        /* AUTHENTICATION FAILURE */

        if (
            response.status === 401 ||
            data.code === "EMAIL_NOT_VERIFIED"
        ) {
            resetCreateProfileState();

            showNotification(
                "error",
                data.code === "EMAIL_NOT_VERIFIED"
                    ? "Email Verification Required"
                    : "Authentication Required",
                data.message ||
                    "Please verify your email address before completing your profile.",
                () => {
                    window.location.href = AUTHENTICATION_REDIRECT;
                }
            );

            return;
        }

        /* OTHER BACKEND ERRORS */

        if (!response.ok) {
            resetCreateProfileState();

            showNotification(
                "error",
                "Unable To Create Profile",
                data.message ||
                    "Unable to create your profile. Please try again."
            );

            return;
        }

        /* SUCCESSFUL PROFILE CREATION */

        sessionStorage.removeItem("workerEmail");

        resetCreateProfileState();

        showNotification(
            "success",
            "Profile Created Successfully",
            data.message ||
                "Your worker profile has been completed successfully.",
            () => {
                window.location.href = SERVICES_REDIRECT;
            }
        );

    } catch (error) {
        console.error(
            "Create worker profile request failed:",
            error
        );

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


/* =========================================================
   16. FORM SUBMISSION
========================================================= */

workerProfileForm?.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        createWorkerProfile();
    }
);


/* =========================================================
   17. INITIALIZATION
========================================================= */

function initializeWorkerProfilePage() {
    if (profilePage) {
        profilePage.hidden = false;
    }

    updateProgress();
}

initializeWorkerProfilePage();