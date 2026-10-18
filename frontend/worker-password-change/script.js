document.addEventListener("DOMContentLoaded", () => {

    const resetForm = document.getElementById("resetForm");

    const passwordInput = document.getElementById("password");

    const confirmPasswordInput = document.getElementById("confirmPassword");

    const passwordToggle = document.getElementById("passwordToggle");

    const confirmToggle = document.getElementById("confirmToggle");

    const changePasswordBtn = document.getElementById("changePasswordBtn");

    const buttonText = document.getElementById("buttonText");

    const notificationModal = document.getElementById("notificationModal");

    const notificationOverlay = document.getElementById("notificationOverlay");

    const notificationIcon = document.getElementById("notificationIcon");

    const notificationTitle = document.getElementById("notificationTitle");

    const notificationMessage = document.getElementById("notificationMessage");

    const notificationButton = document.getElementById("notificationButton");

    const closeNotification = document.getElementById("closeNotification");


    // Worker email saved during the password-reset process.
    const workerEmail = sessionStorage.getItem("workerEmail");


    // Redirect to worker authentication.
    function redirectToWorkerAuthentication() {

        window.location.href = "../worker-authentication/index.html";

    }


    // Close the notification modal.
    function closeModal() {

        notificationModal.classList.remove("show");

        notificationModal.setAttribute("aria-hidden", "true");

    }


    // Display a notification.
    function showModal(
        type,
        title,
        message,
        onContinue = null
    ) {

        notificationModal.classList.remove("success", "error");

        notificationModal.classList.add(type);

        notificationIcon.textContent =
            type === "success" ? "✓" : "!";

        notificationTitle.textContent = title;

        notificationMessage.textContent = message;

        notificationButton._onContinue = onContinue;

        notificationModal.classList.add("show");

        notificationModal.setAttribute("aria-hidden", "false");

        notificationButton.focus();

    }


    // Close the modal and execute its Continue action, if any.
    function continueModal() {

        const callback = notificationButton._onContinue;

        notificationButton._onContinue = null;

        closeModal();

        if (callback) {

            callback();

        }

    }


    // Notification buttons.
    notificationButton.addEventListener("click", continueModal);

    closeNotification.addEventListener("click", continueModal);


    // Clicking the overlay closes the modal.
    notificationOverlay.addEventListener("click", () => {

        closeModal();

    });


    // Escape closes the modal.
    document.addEventListener("keydown", (event) => {

        if (
            event.key === "Escape" &&
            notificationModal.classList.contains("show")
        ) {

            closeModal();

        }

    });


    // Check whether the worker email exists in sessionStorage.
    if (!workerEmail) {

        showModal(
            "error",
            "Reset Session Required",
            "Your password reset session is missing or expired. Please restart the password reset process.",
            redirectToWorkerAuthentication
        );

        return;

    }


    // Show or hide the new password.
    passwordToggle.addEventListener("click", () => {

        if (passwordInput.type === "password") {

            passwordInput.type = "text";

            passwordToggle.textContent = "🙈";

            passwordToggle.setAttribute(
                "aria-label",
                "Hide password"
            );

        } else {

            passwordInput.type = "password";

            passwordToggle.textContent = "👁";

            passwordToggle.setAttribute(
                "aria-label",
                "Show password"
            );

        }

    });


    // Show or hide the confirmation password.
    confirmToggle.addEventListener("click", () => {

        if (confirmPasswordInput.type === "password") {

            confirmPasswordInput.type = "text";

            confirmToggle.textContent = "🙈";

            confirmToggle.setAttribute(
                "aria-label",
                "Hide confirm password"
            );

        } else {

            confirmPasswordInput.type = "password";

            confirmToggle.textContent = "👁";

            confirmToggle.setAttribute(
                "aria-label",
                "Show confirm password"
            );

        }

    });


    // Update the button and input states.
    function setLoadingState(isLoading) {

        if (isLoading) {

            buttonText.textContent = "Changing…";

            changePasswordBtn.disabled = true;

            passwordInput.disabled = true;

            confirmPasswordInput.disabled = true;

            passwordToggle.disabled = true;

            confirmToggle.disabled = true;

        } else {

            buttonText.textContent = "Change Password";

            changePasswordBtn.disabled = false;

            passwordInput.disabled = false;

            confirmPasswordInput.disabled = false;

            passwordToggle.disabled = false;

            confirmToggle.disabled = false;

        }

    }


    // Handle password submission.
    resetForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        // Read the password fields.
        const password = passwordInput.value;

        const confirmPassword = confirmPasswordInput.value;


        // FRONTEND VALIDATION: Password required.
        if (!password.trim()) {

            showModal(
                "error",
                "Password Required",
                "Please enter a new password."
            );

            return;

        }


        // FRONTEND VALIDATION: Minimum eight characters.
        if (password.length < 8) {

            showModal(
                "error",
                "Password Too Short",
                "Your password must contain at least 8 characters."
            );

            return;

        }


        // FRONTEND VALIDATION: Confirmation required.
        if (!confirmPassword.trim()) {

            showModal(
                "error",
                "Confirmation Required",
                "Please confirm your new password."
            );

            return;

        }


        // FRONTEND VALIDATION: Passwords must match.
        if (password !== confirmPassword) {

            showModal(
                "error",
                "Passwords Do Not Match",
                "The new password and confirmation password must be the same."
            );

            return;

        }


        // FRONTEND VALIDATION PASSED.
        // Change the button to Changing…
        setLoadingState(true);


        try {

            // Send the request to the backend.
            const response = await fetch(
                API_ENDPOINT("/api/worker-password-change"),
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        email: workerEmail,

                        password: password,

                        confirmPassword: confirmPassword

                    })
                }
            );


            // Read the backend response.
            let data;

            try {

                data = await response.json();

            } catch (error) {

                data = {};

            }


            // BACKEND VALIDATION OR REQUEST ERROR.
            if (!response.ok) {

                // Restore the button before displaying the error.
                setLoadingState(false);


                // Reset authorization is invalid or expired.
                if (
                    response.status === 401 &&
                    data.message &&
                    data.message.toLowerCase().includes("authorization")
                ) {

                    showModal(
                        "error",
                        "Password Reset Expired",
                        data.message,
                        redirectToWorkerAuthentication
                    );

                    return;

                }


                // Other backend errors, including an unknown email.
                showModal(
                    "error",
                    "Password Change Failed",
                    data.message ||
                    "Unable to change your password. Please try again."
                );

                return;

            }


            // PASSWORD CHANGE SUCCEEDED.
            // Clear the worker email from sessionStorage.
            sessionStorage.removeItem("workerEmail");


            // Restore the button and inputs.
            setLoadingState(false);


            // Display the success message.
            // Redirect only when Continue is clicked.
            showModal(
                "success",
                "Password Changed",
                data.message ||
                "Your password has been changed successfully. You can now log in with your new password.",
                redirectToWorkerAuthentication
            );


        } catch (error) {

            console.error(
                "Worker password change error:",
                error
            );


            // Restore the button after a connection error.
            setLoadingState(false);


            // Display the connection error.
            showModal(
                "error",
                "Connection Error",
                "Unable to connect to the server. Please check your internet connection and try again."
            );

        }

    });

});