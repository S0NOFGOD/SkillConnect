/* =========================================================
   SKILLCONNECT WORKER CREATE PROFILE
   FRONTEND PROFILE COMPLETION LOGIC
========================================================= */


/* =========================================================
   1. WAIT FOR PAGE TO LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       2. GET REQUIRED HTML ELEMENTS
    ===================================================== */

    const profilePage =
        document.getElementById("profilePage");

    const form =
        document.getElementById("workerProfileForm");

    const fullNameInput =
        document.getElementById("fullName");

    const phoneInput =
        document.getElementById("phone");

    const profilePhotoInput =
        document.getElementById("profilePhoto");

    const profilePhotoPreview =
        document.getElementById("profilePhotoPreview");

    const profilePhotoPlaceholder =
        document.getElementById("profilePhotoPlaceholder");

    const profilePhotoImage =
        document.getElementById("profilePhotoImage");

    const countrySelect =
        document.getElementById("country");

    const stateSelect =
        document.getElementById("state");

    const citySelect =
        document.getElementById("city");

    const lgaSelect =
        document.getElementById("lga");

    const continueBtn =
        document.getElementById("continueBtn");

    const buttonText =
        continueBtn.querySelector(".button-text");

    const notificationOverlay =
        document.getElementById("notificationOverlay");

    const notificationCard =
        document.getElementById("notificationCard");

    const notificationIcon =
        document.getElementById("notificationIcon");

    const notificationTitle =
        document.getElementById("notificationTitle");

    const notificationText =
        document.getElementById("notificationText");

    const notificationButton =
        document.getElementById("notificationButton");


    /* =====================================================
       3. CHECK WORKER EMAIL SESSION
    ===================================================== */

    const workerEmail =
        sessionStorage.getItem("workerEmail");


    /* =====================================================
       4. SHOW AUTHENTICATION ERROR
    ===================================================== */

    if (!workerEmail) {

        showModal(
            "error",
            "Authentication Required",
            "Your worker session could not be found. Please sign in again.",
            "Go to Login",
            () => {

                window.location.href =
                    "../worker-authentication/index.html";

            }
        );

        return;
    }


    /* =====================================================
       5. SHOW PROFILE PAGE
    ===================================================== */

    profilePage.hidden = false;


    /* =====================================================
       6. POPULATE COUNTRY
    ===================================================== */

    countrySelect.innerHTML = `
        <option value="">Select country</option>
        <option value="Nigeria">Nigeria</option>
    `;


    /* =====================================================
       7. PROFILE PHOTO SELECTION
    ===================================================== */

    profilePhotoInput.addEventListener(
        "change",
        () => {

            const file =
                profilePhotoInput.files[0];


            /* =============================================
               NO FILE SELECTED
            ============================================= */

            if (!file) {

                profilePhotoImage.hidden = true;

                profilePhotoPlaceholder.hidden = false;

                profilePhotoImage.removeAttribute("src");

                updateProgress();

                return;
            }


            /* =============================================
               VALIDATE IMAGE TYPE
            ============================================= */

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];


            if (!allowedTypes.includes(file.type)) {

                profilePhotoInput.value = "";

                profilePhotoImage.hidden = true;

                profilePhotoPlaceholder.hidden = false;

                profilePhotoImage.removeAttribute("src");


                showModal(
                    "error",
                    "Invalid Profile Photo",
                    "Please select a JPG, PNG, or WebP image."
                );


                updateProgress();

                return;
            }


            /* =============================================
               VALIDATE IMAGE SIZE
               Maximum: 5 MB
            ============================================= */

            const maximumFileSize =
                5 * 1024 * 1024;


            if (file.size > maximumFileSize) {

                profilePhotoInput.value = "";

                profilePhotoImage.hidden = true;

                profilePhotoPlaceholder.hidden = false;

                profilePhotoImage.removeAttribute("src");


                showModal(
                    "error",
                    "Profile Photo Too Large",
                    "Your profile photo must not exceed 5 MB."
                );


                updateProgress();

                return;
            }


            /* =============================================
               PREVIEW SELECTED IMAGE
            ============================================= */

            const imageUrl =
                URL.createObjectURL(file);


            profilePhotoImage.src =
                imageUrl;

            profilePhotoImage.hidden =
                false;

            profilePhotoPlaceholder.hidden =
                true;


            updateProgress();

        }
    );


    /* =====================================================
       8. COUNTRY CHANGE
    ===================================================== */

    countrySelect.addEventListener(
        "change",
        () => {

            resetSelect(
                stateSelect,
                "Select state"
            );

            resetSelect(
                citySelect,
                "Select city"
            );

            resetSelect(
                lgaSelect,
                "Select LGA"
            );

            stateSelect.disabled = true;
            citySelect.disabled = true;
            lgaSelect.disabled = true;


            const country =
                countrySelect.value;

            if (!country) {

                updateProgress();

                return;
            }


            const countryData =
                NIGERIAN_LOCATION_DATA[country];

            if (!countryData) {

                updateProgress();

                return;
            }


            Object.keys(countryData)
                .forEach(state => {

                    const option =
                        document.createElement("option");

                    option.value = state;
                    option.textContent = state;

                    stateSelect.appendChild(option);

                });


            stateSelect.disabled = false;

            updateProgress();

        }
    );


    /* =====================================================
       9. STATE CHANGE
    ===================================================== */

    stateSelect.addEventListener(
        "change",
        () => {

            resetSelect(
                citySelect,
                "Select city"
            );

            resetSelect(
                lgaSelect,
                "Select LGA"
            );

            citySelect.disabled = true;
            lgaSelect.disabled = true;


            const country =
                countrySelect.value;

            const state =
                stateSelect.value;

            if (!country || !state) {

                updateProgress();

                return;
            }


            const stateData =
                NIGERIAN_LOCATION_DATA[
                    country
                ]?.[state];


            if (!stateData) {

                updateProgress();

                return;
            }


            stateData.cities.forEach(city => {

                const option =
                    document.createElement("option");

                option.value = city;
                option.textContent = city;

                citySelect.appendChild(option);

            });


            stateData.lgas.forEach(lga => {

                const option =
                    document.createElement("option");

                option.value = lga;
                option.textContent = lga;

                lgaSelect.appendChild(option);

            });


            citySelect.disabled = false;
            lgaSelect.disabled = false;

            updateProgress();

        }
    );


    /* =====================================================
       10. LOCATION FIELD CHANGES
    ===================================================== */

    [
        fullNameInput,
        phoneInput,
        countrySelect,
        stateSelect,
        citySelect,
        lgaSelect
    ].forEach(element => {

        element.addEventListener(
            "input",
            updateProgress
        );

        element.addEventListener(
            "change",
            updateProgress
        );

    });


    /* =====================================================
       12. SUBMIT PROFILE
    ===================================================== */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            /* =============================================
               FRONTEND VALIDATION
            ============================================= */

            const validation =
                validateForm();

            if (!validation.valid) {

                showModal(
                    "error",
                    "Invalid Information",
                    validation.message
                );

                return;
            }


            /* =============================================
               NORMALIZE PHONE NUMBER
            ============================================= */

            const phone =
                normalizePhone(
                    phoneInput.value
                );


            /* =============================================
               SHOW LOADING STATE
            ============================================= */

            setLoading(true);


            try {

                /* =========================================
                   CREATE MULTIPART FORM DATA
                ========================================= */

                const formData =
                    new FormData();


                formData.append(
                    "email",
                    workerEmail
                );

                formData.append(
                    "fullName",
                    fullNameInput.value.trim()
                );

                formData.append(
                    "phone",
                    phone
                );

                formData.append(
                    "country",
                    countrySelect.value
                );

                formData.append(
                    "state",
                    stateSelect.value
                );

                formData.append(
                    "city",
                    citySelect.value
                );

                formData.append(
                    "lga",
                    lgaSelect.value
                );

                formData.append(
                    "profilePhoto",
                    profilePhotoInput.files[0]
                );


                /* =========================================
                   SEND PROFILE TO BACKEND
                ========================================= */

                const response =
                    await API_REQUEST(
                        "/api/worker/create-profile",
                        {
                            method: "POST",

                            /*
                               Do NOT manually set the
                               Content-Type header here.

                               The browser automatically sets
                               multipart/form-data together
                               with the required boundary.
                            */

                            body: formData
                        }
                    );


                /* =========================================
                   READ BACKEND RESPONSE
                ========================================= */

                let data = {};

                try {

                    data =
                        await response.json();

                } catch {

                    data = {};

                }


                /* =========================================
                   BACKEND ERROR
                ========================================= */

                if (!response.ok) {

                    showModal(
                        "error",
                        "Profile Update Failed",
                        data.message ||
                        "Unable to complete your profile. Please try again."
                    );

                    return;
                }


                /* =========================================
                   SUCCESS
                ========================================= */

                sessionStorage.removeItem(
                    "workerEmail"
                );


                showModal(
                    "success",
                    "Profile Completed",
                    data.message ||
                    "Your worker profile has been completed successfully.",
                    "Continue",
                    () => {

                        window.location.href =
                            "../worker-dashboard/index.html";

                    }
                );

            }

            catch (error) {

                console.error(
                    "Worker profile request failed:",
                    error
                );


                showModal(
                    "error",
                    "Connection Error",
                    "Unable to connect to the server. Please check your internet connection and try again."
                );

            }

            finally {

                setLoading(false);

            }

        }
    );


    /* =====================================================
       13. NOTIFICATION BUTTON
    ===================================================== */

    notificationButton.addEventListener(
        "click",
        () => {

            closeModal();

        }
    );


    /* =====================================================
       14. INITIAL PROGRESS
    ===================================================== */

    updateProgress();


    /* =====================================================
       15. RESET SELECT HELPER
    ===================================================== */

    function resetSelect(
        select,
        placeholder
    ) {

        select.innerHTML = "";

        const option =
            document.createElement("option");

        option.value = "";
        option.textContent = placeholder;

        select.appendChild(option);

    }


    /* =====================================================
       17. NORMALIZE NIGERIAN PHONE NUMBER
    ===================================================== */

    function normalizePhone(value) {

        let phone =
            value
                .trim()
                .replace(/\s+/g, "")
                .replace(/-/g, "")
                .replace(/\(/g, "")
                .replace(/\)/g, "");


        /* 080XXXXXXXXX → +23480XXXXXXXXX */

        if (
            /^0[789]\d{9}$/.test(phone)
        ) {

            phone =
                "+234" +
                phone.substring(1);

        }


        /* 234XXXXXXXXXX → +234XXXXXXXXXX */

        else if (
            /^234[789]\d{9}$/.test(phone)
        ) {

            phone =
                "+" +
                phone;

        }


        return phone;

    }


    /* =====================================================
       18. VALIDATE FORM
    ===================================================== */

    function validateForm() {

        const fullName =
            fullNameInput.value.trim();

        const phone =
            normalizePhone(
                phoneInput.value
            );

        const profilePhoto =
            profilePhotoInput.files[0];

        const country =
            countrySelect.value;

        const state =
            stateSelect.value;

        const city =
            citySelect.value;

        const lga =
            lgaSelect.value;


        if (!profilePhoto) {

            return {
                valid: false,
                message:
                    "Please select a profile photo."
            };

        }


        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        if (!allowedTypes.includes(profilePhoto.type)) {

            return {
                valid: false,
                message:
                    "Please select a JPG, PNG, or WebP profile photo."
            };

        }


        if (
            profilePhoto.size >
            5 * 1024 * 1024
        ) {

            return {
                valid: false,
                message:
                    "Your profile photo must not exceed 5 MB."
            };

        }


        if (!fullName) {

            return {
                valid: false,
                message: "Please enter your full name."
            };

        }


        if (
            !/^[A-Za-zÀ-ÿ' -]{2,100}$/.test(
                fullName
            )
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid full name."
            };

        }


        if (
            !/^\+234[789]\d{9}$/.test(phone)
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid Nigerian phone number."
            };

        }


        if (!country) {

            return {
                valid: false,
                message:
                    "Please select your country."
            };

        }


        if (!state) {

            return {
                valid: false,
                message:
                    "Please select your state."
            };

        }


        if (!city) {

            return {
                valid: false,
                message:
                    "Please select your city."
            };

        }


        if (!lga) {

            return {
                valid: false,
                message:
                    "Please select your LGA."
            };

        }

        return {
          valid: true,
          message: ""
        };

    }


    /* =====================================================
       19. UPDATE PROFILE PROGRESS
    ===================================================== */

    function updateProgress() {

        const fields = [

            profilePhotoInput.files.length > 0,

            fullNameInput.value.trim(),

            normalizePhone(
                phoneInput.value
            ),

            countrySelect.value,

            stateSelect.value,

            citySelect.value,

            lgaSelect.value,

        ];


        const completed =
            fields.filter(Boolean).length;


        const percentage =
            Math.round(
                (completed / fields.length) * 100
            );


        const progressFill =
            document.getElementById(
                "progressFill"
            );

        const progressPercentage =
            document.getElementById(
                "progressPercentage"
            );


        if (progressFill) {

            progressFill.style.width =
                `${percentage}%`;

        }


        if (progressPercentage) {

            progressPercentage.textContent =
                `${percentage}%`;

        }

    }


    /* =====================================================
       20. BUTTON LOADING STATE
    ===================================================== */

    function setLoading(isLoading) {

        continueBtn.disabled =
            isLoading;

        continueBtn.classList.toggle(
            "loading",
            isLoading
        );


        if (buttonText) {

            buttonText.textContent =
                isLoading
                    ? "Saving Profile..."
                    : "Continue";

        }

    }


    /* =====================================================
       21. SHOW NOTIFICATION MODAL
    ===================================================== */

    function showModal(
        type,
        title,
        message,
        buttonLabel = "Close",
        onClose = null
    ) {

        notificationCard.className =
            `notification-card ${type}`;


        notificationIcon.textContent =
            type === "success"
                ? "✓"
                : type === "error"
                    ? "!"
                    : "i";


        notificationTitle.textContent =
            title;

        notificationText.textContent =
            message;

        notificationButton.textContent =
            buttonLabel;


        notificationButton.onclick =
            () => {

                closeModal();

                if (onClose) {

                    onClose();

                }

            };


        notificationOverlay.hidden =
            false;

        document.body.classList.add(
            "modal-open"
        );

    }


    /* =====================================================
       22. CLOSE NOTIFICATION MODAL
    ===================================================== */

    function closeModal() {

        notificationOverlay.hidden =
            true;

        document.body.classList.remove(
            "modal-open"
        );

    }

});