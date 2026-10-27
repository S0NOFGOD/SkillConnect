document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const profilePage = $("profilePage");
    const form = $("workerProfileForm");
    const photoInput = $("profilePhoto");
    const photoImage = $("profilePhotoImage");
    const photoPlaceholder = $("profilePhotoPlaceholder");
    const nameInput = $("fullName");
    const phoneInput = $("phone");
    const countryInput = $("country");
    const stateInput = $("state");
    const cityInput = $("city");
    const lgaInput = $("lga");
    const button = $("continueBtn");
    const buttonText = button.querySelector(".button-text");

    const overlay = $("notificationOverlay");
    const modal = $("notificationCard");
    const icon = $("notificationIcon");
    const title = $("notificationTitle");
    const message = $("notificationText");
    const modalButton = $("notificationButton");

    const MAX_SIZE = 10 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const AUTH_PAGE = "../worker-authentication/index.html";
    const DASHBOARD = "../worker-services/index.html";

    let modalCallback = null;
    let photoPreviewUrl = null;

    // Require an existing worker email session.
    if (!sessionStorage.getItem("workerEmail")) {
        showModal(
            "error",
            "Authentication Required",
            "Your worker session could not be found. Please sign in again.",
            "Continue",
            () => window.location.href = AUTH_PAGE
        );
        return;
    }

    profilePage.hidden = false;

    // Profile photo preview and validation.
    photoInput.addEventListener("change", () => {
        const file = photoInput.files[0];

        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = null;

        if (!file) {
            photoImage.hidden = true;
            photoPlaceholder.hidden = false;
            photoImage.removeAttribute("src");
            updateProgress();
            return;
        }

        if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE) {
            photoInput.value = "";
            photoImage.hidden = true;
            photoPlaceholder.hidden = false;
            photoImage.removeAttribute("src");

            showModal(
                "error",
                "Invalid Profile Photo",
                "Choose a JPG, PNG, or WebP image no larger than 10 MB."
            );
            updateProgress();
            return;
        }

        photoPreviewUrl = URL.createObjectURL(file);
        photoImage.src = photoPreviewUrl;
        photoImage.hidden = false;
        photoPlaceholder.hidden = true;
        updateProgress();
    });

    // Country → state → city and LGA.
    countryInput.addEventListener("change", () => {
        resetOptions(stateInput, "Select State");
        resetOptions(cityInput, "Select City");
        resetOptions(lgaInput, "Select LGA");

        stateInput.disabled = cityInput.disabled = lgaInput.disabled = true;

        if (countryInput.value === "Nigeria") {
            getNigeriaStates().forEach(state => addOption(stateInput, state));
            stateInput.disabled = false;
        }

        updateProgress();
    });

    stateInput.addEventListener("change", () => {
        resetOptions(cityInput, "Select City");
        resetOptions(lgaInput, "Select LGA");
        cityInput.disabled = lgaInput.disabled = true;

        if (stateInput.value) {
            getCitiesByState(stateInput.value).forEach(city => addOption(cityInput, city));
            getLGAsByState(stateInput.value).forEach(lga => addOption(lgaInput, lga));
            cityInput.disabled = lgaInput.disabled = false;
        }

        updateProgress();
    });

    [nameInput, phoneInput, cityInput, lgaInput].forEach(input => {
        input.addEventListener("input", updateProgress);
        input.addEventListener("change", updateProgress);
    });

    // Validate first, then send the request.
    form.addEventListener("submit", async event => {
        event.preventDefault();

        const validation = validateForm();

        if (!validation.valid) {
            showModal("error", "Invalid Information", validation.message);
            return;
        }

        const workerEmail = sessionStorage.getItem("workerEmail");

        if (!workerEmail) {
            showModal(
                "error",
                "Session Expired",
                "Your worker session could not be found. Please sign in again.",
                "Continue",
                () => window.location.href = AUTH_PAGE
            );
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("email", workerEmail);
            formData.append("profilePhoto", photoInput.files[0]);
            formData.append("fullName", nameInput.value.trim());
            formData.append("phone", phoneInput.value.trim());
            formData.append("country", countryInput.value);
            formData.append("state", stateInput.value);
            formData.append("city", cityInput.value);
            formData.append("lga", lgaInput.value);

            const response = await API_REQUEST("/api/worker/create-profile", {
                method: "POST",
                body: formData
            });

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok || data.success === false) {
                setLoading(false);

                const unverified = data.code === "EMAIL_NOT_VERIFIED";

                showModal(
                    "error",
                    unverified ? "Email Not Verified" : "Profile Update Failed",
                    data.message || "Unable to complete your profile. Please try again.",
                    "Continue",
                    unverified ? () => window.location.href = AUTH_PAGE : null
                );
                return;
            }

            sessionStorage.removeItem("workerEmail");
            setLoading(false);

            showModal(
                "success",
                "Profile Completed",
                data.message || "Your worker profile has been completed successfully.",
                "Continue",
                () => window.location.href = DASHBOARD
            );
        } catch (error) {
            console.error("Worker profile request failed:", error);
            setLoading(false);

            showModal(
                "error",
                "Connection Error",
                "Unable to connect to the server. Please check your connection and try again."
            );
        }
    });

    modalButton.addEventListener("click", () => {
        const callback = modalCallback;
        closeModal();
        if (callback) callback();
    });

    function validateForm() {
        const file = photoInput.files[0];
        const name = nameInput.value.trim().replace(/\s+/g, " ");
        const parts = name.split(" ");
        const namePattern = /^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/;
        const phone = phoneInput.value.trim().replace(/[\s()-]/g, "");

        if (!file)
            return invalid("Please select a profile photo.");

        if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE)
            return invalid("Choose a JPG, PNG, or WebP image no larger than 10 MB.");

        if (parts.length !== 2 || !parts.every(part => namePattern.test(part)))
            return invalid("Enter exactly two names, for example: Destiny Okpone.");

        if (!/^(?:0[789]\d{9}|\+?234[789]\d{9})$/.test(phone))
            return invalid("Please enter a valid Nigerian phone number.");

        if (countryInput.value !== "Nigeria")
            return invalid("Please select Nigeria as your country.");

        if (!stateInput.value || !getNigeriaStates().includes(stateInput.value))
            return invalid("Please select a valid state.");

        if (!cityInput.value || !getCitiesByState(stateInput.value).includes(cityInput.value))
            return invalid("Please select a valid city.");

        if (!lgaInput.value || !getLGAsByState(stateInput.value).includes(lgaInput.value))
            return invalid("Please select a valid LGA.");

        return { valid: true, message: "" };
    }

    function invalid(message) {
        return { valid: false, message };
    }

    function normalizePhone(value) {
        const phone = value.replace(/[\s()-]/g, "");
        if (phone.startsWith("0")) return "+234" + phone.slice(1);
        if (phone.startsWith("234")) return "+" + phone;
        return phone;
    }

    function resetOptions(select, label) {
        select.replaceChildren(new Option(label, ""));
    }

    function addOption(select, value) {
        select.add(new Option(value, value));
    }

    function updateProgress() {
        const fields = [
            photoInput.files.length > 0,
            nameInput.value.trim(),
            phoneInput.value.trim(),
            countryInput.value,
            stateInput.value,
            cityInput.value,
            lgaInput.value
        ];

        const percentage = Math.round(
            fields.filter(Boolean).length / fields.length * 100
        );

        if ($("progressFill")) $("progressFill").style.width = `${percentage}%`;
        if ($("progressPercentage")) $("progressPercentage").textContent = `${percentage}%`;
    }

    function setLoading(loading) {
        button.disabled = loading;
        button.classList.toggle("loading", loading);
        if (buttonText) buttonText.textContent = loading ? "Creating…" : "Create Profile";
    }

    function showModal(type, heading, text, label = "Continue", callback = null) {
        modal.className = `notification-card ${type}`;
        icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "i";
        title.textContent = heading;
        message.textContent = text;
        modalButton.textContent = label;
        modalCallback = callback;
        overlay.hidden = false;
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        overlay.hidden = true;
        document.body.classList.remove("modal-open");
        modalCallback = null;
    }

    updateProgress();
});