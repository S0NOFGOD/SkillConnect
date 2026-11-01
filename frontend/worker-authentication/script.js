"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const loginForm = $("loginForm");
    const signupForm = $("signupForm");
    const forgotForm = $("forgotForm");
    const notificationModal = $("notificationModal");
    const forgotModal = $("forgotModal");

    const loginButton = $("loginButton");
    const signupButton = $("signupButton");
    const forgotButton = $("forgotButton");
    const googleLoginButton = $("googleLoginButton");
    const googleSignupButton = $("googleSignupButton");

    let notificationAction = null;
    let notificationCooldown = null;

    const routes = {
        emailOTP: "../worker-email-otp/index.html",
        profile: "../worker-create-profile/index.html",
        dashboard: "../worker-dashboard/index.html",
        services: "../worker-services/index.html",
        passwordOTP: "../worker-password-reset-otp/index.html"
    };

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function showModal(title, message, action = null, cooldownUntil = null) {
        $("notificationTitle").textContent = title;
        $("notificationMessage").textContent = message;
        $("notificationIcon").textContent = cooldownUntil ? "!" : "✓";
        $("notificationIcon").classList.toggle("cooldown-icon", Boolean(cooldownUntil));

        notificationAction = action;
        notificationCooldown = cooldownUntil;
        notificationModal.classList.add("show");
        notificationModal.setAttribute("aria-hidden", "false");
    }

    function closeNotification() {
        notificationModal.classList.remove("show");
        notificationModal.setAttribute("aria-hidden", "true");

        const action = notificationAction;
        notificationAction = null;

        if (action) action();
    }

    function closeForgotModal() {
        forgotModal.classList.remove("show");
        forgotModal.setAttribute("aria-hidden", "true");
    }

    function openForgotModal() {
        $("resetEmail").value = $("loginEmail").value.trim();
        forgotModal.classList.add("show");
        forgotModal.setAttribute("aria-hidden", "false");
        $("resetEmail").focus();
    }

    function setBusy(button, busyText, busy) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent.trim();
        }

        button.textContent = busy ? busyText : button.dataset.originalText;
        button.disabled = busy;
    }

    function validateEmail(email) {
        return typeof email === "string" && emailPattern.test(email.trim());
    }

    function validatePassword(password) {
        return typeof password === "string" && password.length >= 8;
    }

    function getCooldownMessage(message, cooldownUntil) {
        if (!cooldownUntil) return message;

        const date = new Date(cooldownUntil);

        if (Number.isNaN(date.getTime())) return message;

        return `${message}\n\nYou can try again after: ${date.toLocaleString()}`;
    }

    async function readResponse(response) {
        let data;

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        return {
            ...data,
            message: data.message || (
                response.ok
                    ? "Request completed successfully."
                    : "Something went wrong. Please try again."
            ),
            httpStatus: response.status
        };
    }

    async function post(path, body) {
        const response = await fetch(API_ENDPOINT(path), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        return readResponse(response);
    }

    function saveWorkerEmail(email) {
        sessionStorage.setItem("workerEmail", email);
    }

    function redirectAfterLogin(data) {
        if (data.nextStep === "email-verification") {
            saveWorkerEmail(data.email);
            window.location.href = routes.emailOTP;
        } else if (data.nextStep === "profile") {
            saveWorkerEmail(data.email);
            window.location.href = routes.profile;
        } else if (data.nextStep === "authenticated") {
            window.location.href = routes.dashboard;
        }
    }

    function showRequestError(data, fallback) {
        showModal(
            "Notification",
            getCooldownMessage(
                data.message || fallback,
                data.cooldownUntil
            ),
            null,
            data.cooldownUntil
        );
    }

    // LOGIN / SIGNUP TABS
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(item =>
                item.classList.toggle("active", item === tab)
            );

            loginForm.classList.toggle("active", tab.dataset.tab === "login");
            signupForm.classList.toggle("active", tab.dataset.tab === "signup");
        });
    });

    // SHOW / HIDE PASSWORDS
    [
        ["toggleLoginPassword", "loginPassword"],
        ["toggleSignupPassword", "signupPassword"],
        ["toggleConfirmPassword", "confirmPassword"]
    ].forEach(([buttonId, inputId]) => {
        $(buttonId).addEventListener("click", () => {
            const input = $(inputId);
            const show = input.type === "password";

            input.type = show ? "text" : "password";
            $(buttonId).textContent = show ? "Hide" : "Show";
        });
    });

    // CREATE WORKER ACCOUNT
    signupForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = $("signupEmail").value.trim().toLowerCase();
        const password = $("signupPassword").value;
        const confirmPassword = $("confirmPassword").value;
        const termsAccepted = $("termsCheckbox").checked;

        if (!validateEmail(email)) {
            return showModal("Invalid Email", "Please enter a valid email address.");
        }

        if (!validatePassword(password)) {
            return showModal("Invalid Password", "Password must be at least 8 characters.");
        }

        if (!confirmPassword) {
            return showModal("Confirm Password", "Please confirm your password.");
        }

        if (password !== confirmPassword) {
            return showModal("Password Mismatch", "Passwords do not match.");
        }

        if (!termsAccepted) {
            return showModal("Agreement Required", "Please agree to the Terms and Privacy Policy.");
        }

        setBusy(signupButton, "Creating…", true);

        try {
            const data = await post("/api/worker-authentication/signup", {
                email,
                password,
                confirmPassword,
                termsAccepted
            });

            if (!data.success) {
                return showRequestError(data, "Unable to create your account.");
            }

            saveWorkerEmail(data.email || email);

            showModal(
                "Account Created",
                data.message || "A verification code has been sent to your email.",
                () => window.location.href = routes.emailOTP
            );
        } catch (error) {
            console.error("Worker signup error:", error);
            showModal("Connection Error", "Unable to connect. Please try again.");
        } finally {
            setBusy(signupButton, "Creating…", false);
        }
    });

    // WORKER LOGIN
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = $("loginEmail").value.trim().toLowerCase();
        const password = $("loginPassword").value;

        if (!validateEmail(email)) {
            return showModal("Invalid Email", "Please enter a valid email address.");
        }

        if (!password) {
            return showModal("Password Required", "Please enter your password.");
        }

        setBusy(loginButton, "Logging in…", true);

        try {
            const data = await post("/api/worker-authentication/login", {
                email,
                password
            });

            if (!data.success) {
                return showRequestError(data, "Unable to log in.");
            }

            if (data.nextStep === "email-verification" || data.nextStep === "profile") {
                saveWorkerEmail(data.email || email);
            }

            showModal(
                "Notification",
                getCooldownMessage(data.message || "Login successful.", data.cooldownUntil),
                () => redirectAfterLogin({ ...data, email: data.email || email }),
                data.cooldownUntil
            );
        } catch (error) {
            console.error("Worker login error:", error);
            showModal("Connection Error", "Unable to connect. Please try again.");
        } finally {
            setBusy(loginButton, "Logging in…", false);
        }
    });

    // FORGOT PASSWORD
    $("forgotPassword").addEventListener("click", openForgotModal);

    $("closeModal").addEventListener("click", closeForgotModal);
    $("forgotOverlay").addEventListener("click", closeForgotModal);

    forgotForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = $("resetEmail").value.trim().toLowerCase();

        if (!validateEmail(email)) {
            return showModal("Invalid Email", "Please enter a valid email address.");
        }

        setBusy(forgotButton, "Connecting…", true);

        try {
            const data = await post("/api/worker-authentication/forgot-password", { email });

            if (!data.success) {
                return showRequestError(data, "Unable to process your password reset request.");
            }

            saveWorkerEmail(data.email || email);
            closeForgotModal();

            showModal(
                "Check Your Email",
                data.message || "A verification code has been sent to your email.",
                () => window.location.href = routes.passwordOTP
            );
        } catch (error) {
            console.error("Worker password reset request error:", error);
            showModal("Connection Error", "Unable to connect. Please try again.");
        } finally {
            setBusy(forgotButton, "Connecting…", false);
        }
    });

    // GOOGLE AUTHENTICATION
    async function startGoogleAuthentication(button) {
        setBusy(button, "Connecting…", true);

        try {
            const data = await post("/api/worker-authentication/google", {});

            if (!data.success || !data.authorizationUrl) {
                showRequestError(data, "Unable to start Google authentication.");
                return;
            }

            window.location.href = data.authorizationUrl;
        } catch (error) {
            console.error("Worker Google authentication error:", error);
            showModal("Connection Error", "Unable to connect to Google authentication. Please try again.");
        } finally {
            setBusy(button, "Connecting…", false);
        }
    }

    googleLoginButton.addEventListener("click", () =>
        startGoogleAuthentication(googleLoginButton)
    );

    googleSignupButton.addEventListener("click", () =>
        startGoogleAuthentication(googleSignupButton)
    );

    // NOTIFICATION MODAL CONTROLS
    $("notificationButton").addEventListener("click", closeNotification);
    $("closeNotification").addEventListener("click", closeNotification);
    $("notificationOverlay").addEventListener("click", closeNotification);

    // ESCAPE KEY
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeNotification();
            closeForgotModal();
        }
    });

    // HANDLE GOOGLE CALLBACK ERRORS DIRECTLY ON THIS PAGE.
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("error");

    if (googleError) {
        const messages = {
            "password-account": "An account with this email already uses password authentication. Please log in with your email and password.",
            "google-authentication-failed": "Google authentication failed. Please try again."
        };

        showModal(
            "Google Authentication",
            messages[googleError] || "Unable to complete Google authentication."
        );

        window.history.replaceState({}, document.title, window.location.pathname);
    }
});