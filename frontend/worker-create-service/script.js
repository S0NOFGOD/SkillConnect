"use strict";

/* =========================================================
   1. DOM ELEMENTS
========================================================= */

const createServicePage = document.getElementById("createServicePage");
const serviceForm = document.getElementById("serviceForm");
const skillInput = document.getElementById("skill");
const experienceInput = document.getElementById("experience");
const descriptionInput = document.getElementById("description");
const descriptionWordCount = document.getElementById("descriptionWordCount");

const portfolioPhoto1 = document.getElementById("portfolioPhoto1");
const portfolioPhoto2 = document.getElementById("portfolioPhoto2");
const portfolioPhoto3 = document.getElementById("portfolioPhoto3");

const portfolioPreview1 = document.getElementById("portfolioPreview1");
const portfolioPreview2 = document.getElementById("portfolioPreview2");
const portfolioPreview3 = document.getElementById("portfolioPreview3");

const addServiceBtn = document.getElementById("addServiceBtn");

const notificationOverlay = document.getElementById("notificationOverlay");
const notificationCard = document.getElementById("notificationCard");
const notificationCancelButton = document.getElementById("notificationCancelButton");
const notificationIcon = document.getElementById("notificationIcon");
const notificationTitle = document.getElementById("notificationTitle");
const notificationText = document.getElementById("notificationText");
const notificationButton = document.getElementById("notificationButton");


/* =========================================================
   2. CONFIGURATION
========================================================= */

const MAX_DESCRIPTION_WORDS = 150;
const MAX_PORTFOLIO_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PORTFOLIO_IMAGES = 3;

const CREATE_SERVICE_ENDPOINT = "/api/worker/create-service";

const DASHBOARD_REDIRECT = "../worker-dashboard/index.html";
const SERVICES_REDIRECT = "../worker-services/index.html";

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

const DEFAULT_LOCAL_SKILLS = [
    "Swimming Instructor",
    "Barber",
    "Hairdresser",
    "Makeup Artist",
    "Tailor",
    "Bricklayer",
    "Plumber",
    "Electrician",
    "Painter",
    "Welder",
    "Carpenter",
    "Cleaner",
    "Laundry Service",
    "Mechanic",
    "Auto Electrician",
    "Phone Repair",
    "Computer Repair",
    "Graphic Designer",
    "Web Developer",
    "Photographer",
    "Videographer",
    "Caterer",
    "Baker",
    "Cook",
    "Event Planner",
    "Interior Decorator",
    "AC Technician",
    "Generator Repair",
    "POP Installer",
    "Tiler",
    "Furniture Maker",
    "Driver",
    "Tutor",
    "Fitness Trainer",
    "Other"
];

let isAddingService = false;
let modalCloseCallback = null;


/* =========================================================
   3. SKILL DROPDOWN
========================================================= */

function getLocalSkills() {
    return Array.isArray(window.LOCAL_SKILLS) &&
        window.LOCAL_SKILLS.length
        ? window.LOCAL_SKILLS
        : DEFAULT_LOCAL_SKILLS;
}

function populateSkillDropdown() {
    if (!skillInput) return;

    skillInput.innerHTML = "";

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "Select your skill";
    placeholder.disabled = true;
    placeholder.selected = true;

    skillInput.appendChild(placeholder);

    getLocalSkills().forEach(skill => {
        const option = document.createElement("option");

        option.value = skill;
        option.textContent = skill;

        skillInput.appendChild(option);
    });
}


/* =========================================================
   4. BUTTON LOADING STATE
========================================================= */

function setButtonLoading(button, isLoading) {
    if (!button) return;

    const textElement = button.querySelector(".button-text");

    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);

    if (textElement) {
        textElement.textContent = isLoading
            ? "Creating..."
            : "Create Service";
    } else {
        button.textContent = isLoading
            ? "Creating..."
            : "Create Service";
    }
}


/* =========================================================
   5. NOTIFICATION MODAL
========================================================= */

const MODAL_ICONS = {
    success: "✓",
    error: "!",
    info: "i",
    confirm: "?"
};

function showNotification(type, title, message, onClose = null) {
    if (!notificationOverlay || !notificationCard) return;

    modalCloseCallback = onClose;

    notificationCard.classList.remove(
        "success",
        "error",
        "info",
        "confirm"
    );

    notificationCard.classList.add(type);

    if (notificationIcon) {
        notificationIcon.textContent = MODAL_ICONS[type] || "!";
    }

    if (notificationTitle) {
        notificationTitle.textContent = title;
    }

    if (notificationText) {
        notificationText.textContent = message;
    }

    if (notificationButton) {
        notificationButton.disabled = false;
        notificationButton.textContent = "Continue";
    }

    notificationOverlay.hidden = false;
    document.body.style.overflow = "hidden";

    setTimeout(() => notificationButton?.focus(), 0);
}

function closeNotification() {
    if (!notificationOverlay) return;

    notificationOverlay.hidden = true;
    document.body.style.overflow = "";

    const callback = modalCloseCallback;

    modalCloseCallback = null;

    if (typeof callback === "function") {
        callback();
    }
}

notificationCancelButton?.addEventListener(
    "click",
    closeNotification
);

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
   6. AUTHENTICATION SESSION EXPIRY
========================================================= */

/*
   API_REQUEST is responsible for:
   1. Sending the authenticated request.
   2. Refreshing the access token when required.
   3. Retrying the original request.
   4. Returning the final response.

   This listener handles the existing global expiry event.
*/

window.addEventListener("authSessionExpired", () => {
    isAddingService = false;

    setButtonLoading(addServiceBtn, false);

    if (
        notificationOverlay &&
        !notificationOverlay.hidden
    ) {
        return;
    }

    showNotification(
        "error",
        "Authentication Required",
        "Your session has expired. Please log in again."
    );
});


/* =========================================================
   7. DESCRIPTION WORD COUNT
========================================================= */

function getWordCount(value) {
    const trimmedValue = value.trim();

    if (!trimmedValue) return 0;

    return trimmedValue
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

function updateDescriptionWordCount() {
    if (!descriptionInput || !descriptionWordCount) return;

    const wordCount = getWordCount(descriptionInput.value);

    descriptionWordCount.textContent =
        `${wordCount} / ${MAX_DESCRIPTION_WORDS} words`;

    descriptionWordCount.classList.toggle(
        "limit-reached",
        wordCount >= MAX_DESCRIPTION_WORDS
    );
}

descriptionInput?.addEventListener(
    "input",
    updateDescriptionWordCount
);


/* =========================================================
   8. PORTFOLIO IMAGE PREVIEWS
========================================================= */

function restorePortfolioPreview(preview) {
    if (!preview) return;

    preview.innerHTML = `
        <span class="portfolio-placeholder" aria-hidden="true">+</span>
        <span>Add Image</span>
    `;
}

function validatePortfolioImage(file) {
    if (!file) {
        return {
            valid: false,
            message: "Please select a portfolio image."
        };
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return {
            valid: false,
            message: `"${file.name}" must be a JPG, PNG, or WebP image.`
        };
    }

    if (file.size > MAX_PORTFOLIO_IMAGE_SIZE) {
        return {
            valid: false,
            message: `"${file.name}" exceeds the 10 MB image limit.`
        };
    }

    return { valid: true };
}

function showImagePreview(input, preview) {
    if (!input || !preview) return;

    const file = input.files?.[0];

    if (!file) {
        restorePortfolioPreview(preview);
        return;
    }

    const imageUrl = URL.createObjectURL(file);

    preview.innerHTML = "";

    const image = document.createElement("img");

    image.src = imageUrl;
    image.alt = "Selected portfolio image";

    preview.appendChild(image);

    image.addEventListener("load", () => {
        URL.revokeObjectURL(imageUrl);
    }, { once: true });

    image.addEventListener("error", () => {
        URL.revokeObjectURL(imageUrl);
    }, { once: true });
}

function validateSelectedPortfolioImage(input, preview) {
    const file = input?.files?.[0];

    if (!file) {
        restorePortfolioPreview(preview);
        return true;
    }

    const result = validatePortfolioImage(file);

    if (!result.valid) {
        input.value = "";
        restorePortfolioPreview(preview);

        showNotification(
            "error",
            "Invalid Portfolio Image",
            result.message
        );

        return false;
    }

    showImagePreview(input, preview);

    return true;
}

portfolioPhoto1?.addEventListener("change", () => {
    validateSelectedPortfolioImage(
        portfolioPhoto1,
        portfolioPreview1
    );
});

portfolioPhoto2?.addEventListener("change", () => {
    validateSelectedPortfolioImage(
        portfolioPhoto2,
        portfolioPreview2
    );
});

portfolioPhoto3?.addEventListener("change", () => {
    validateSelectedPortfolioImage(
        portfolioPhoto3,
        portfolioPreview3
    );
});


/* =========================================================
   9. FORM VALIDATION
========================================================= */

function validatePortfolioPhotos() {
    const portfolioItems = [
        { input: portfolioPhoto1, number: 1 },
        { input: portfolioPhoto2, number: 2 },
        { input: portfolioPhoto3, number: 3 }
    ];

    for (const item of portfolioItems) {
        const file = item.input?.files?.[0];

        if (!file) {
            return {
                valid: false,
                message: `Please select portfolio photo ${item.number}.`
            };
        }

        const result = validatePortfolioImage(file);

        if (!result.valid) {
            return result;
        }
    }

    return { valid: true };
}

function validateDescription() {
    const description = descriptionInput?.value.trim() || "";

    if (!description) {
        return {
            valid: false,
            message: "Please enter a description for the service."
        };
    }

    if (getWordCount(description) > MAX_DESCRIPTION_WORDS) {
        return {
            valid: false,
            message: "Your service description cannot contain more than 150 words."
        };
    }

    return { valid: true };
}

function validateServiceForm() {
    const portfolioResult = validatePortfolioPhotos();

    if (!portfolioResult.valid) {
        return portfolioResult;
    }

    if (!skillInput?.value.trim()) {
        return {
            valid: false,
            message: "Please select your skill."
        };
    }

    if (!experienceInput?.value.trim()) {
        return {
            valid: false,
            message: "Please select your experience."
        };
    }

    const descriptionResult = validateDescription();

    if (!descriptionResult.valid) {
        return descriptionResult;
    }

    return { valid: true };
}


/* =========================================================
   10. RESPONSE MESSAGE EXTRACTION
========================================================= */

async function extractResponseMessage(response) {
    try {
        const data = await response.json();

        return data.message ||
            data.error ||
            data.errorMessage ||
            data.msg ||
            "Something went wrong. Please try again.";

    } catch (error) {
        console.error(
            "Unable to read backend response:",
            error
        );

        return "Something went wrong. Please try again.";
    }
}


/* =========================================================
   11. BUILD FORM DATA
========================================================= */

function buildServiceFormData() {
    const formData = new FormData();

    formData.append("skill", skillInput.value.trim());
    formData.append("experience", experienceInput.value.trim());
    formData.append("description", descriptionInput.value.trim());

    formData.append("portfolioPhotos", portfolioPhoto1.files[0]);
    formData.append("portfolioPhotos", portfolioPhoto2.files[0]);
    formData.append("portfolioPhotos", portfolioPhoto3.files[0]);

    return formData;
}


/* =========================================================
   12. CREATE SERVICE REQUEST
========================================================= */

async function createService() {
    if (isAddingService) return;

    const validationResult = validateServiceForm();

    if (!validationResult.valid) {
        showNotification(
            "error",
            "Invalid Service",
            validationResult.message
        );

        return;
    }

    isAddingService = true;
    setButtonLoading(addServiceBtn, true);

    try {
        const formData = buildServiceFormData();

        /*
           Do not manually set Content-Type for FormData.
           API_REQUEST must preserve cookie credentials and
           perform its existing access-token refresh flow.
        */

        const response = await API_REQUEST(
            CREATE_SERVICE_ENDPOINT,
            {
                method: "POST",
                body: formData
            }
        );

        if (response.status === 401) {
            showNotification(
                "error",
                "Authentication Required",
                "Your session has expired or is invalid. Please log in again."
            );

            return;
        }

        if (!response.ok) {
            const message = await extractResponseMessage(response);

            /*
               Phone verification expiry redirects to the
               worker dashboard only after Continue is clicked.
            */

            const phoneVerificationExpired =
                response.status === 403;

            showNotification(
                "error",
                phoneVerificationExpired
                    ? "Profile Verification Required"
                    : "Unable To Create Service",
                message,
                phoneVerificationExpired
                    ? () => {
                        window.location.href = DASHBOARD_REDIRECT;
                    }
                    : null
            );

            return;
        }

        let successMessage = "Your service has been added successfully.";

        try {
            const data = await response.json();

            if (data.message) {
                successMessage = data.message;
            }
        } catch (error) {
            console.log("No JSON success response returned.");
        }

        showNotification(
            "success",
            "Service Added",
            successMessage,
            () => {
                window.location.href = SERVICES_REDIRECT;
            }
        );

    } catch (error) {
        console.error("Create service request failed:", error);

        showNotification(
            "error",
            "Request Failed",
            "Something went wrong. Please try again."
        );

    } finally {
        isAddingService = false;
        setButtonLoading(addServiceBtn, false);
    }
}


/* =========================================================
   13. FORM SUBMISSION
========================================================= */

serviceForm?.addEventListener("submit", event => {
    event.preventDefault();
    createService();
});


/* =========================================================
   14. INITIALIZATION
========================================================= */

function initializeCreateServicePage() {
    populateSkillDropdown();
    updateDescriptionWordCount();
}

initializeCreateServicePage();