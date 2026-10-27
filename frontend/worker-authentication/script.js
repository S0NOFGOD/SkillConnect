"use strict";

document.addEventListener("DOMContentLoaded", () => {
    initializeTabs();
    initializePasswordToggles();
    initializeLogin();
    initializeSignup();
    initializeForgotPassword();
    initializeGoogleButtons();
    initializeNotificationModal();
    initializeForgotModal();
});

const getElement = id => document.getElementById(id);
let pendingRedirect = null;
let passwordResetCooldownTimer = null;

function validateEmail(email) {
    if (!email) return showModal("Email Required", "Please enter your email address."), false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return showModal("Invalid Email", "Please enter a valid email address."), false;
    return true;
}

function initializeTabs() {
    document.querySelectorAll(".tab").forEach(tab =>
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
            document.querySelectorAll(".auth-form").forEach(form => form.classList.remove("active"));
            tab.classList.add("active");
            getElement(tab.dataset.tab === "login" ? "loginForm" : "signupForm").classList.add("active");
        })
    );
}

function initializePasswordToggles() {
    [
        ["toggleLoginPassword", "loginPassword"],
        ["toggleSignupPassword", "signupPassword"],
        ["toggleConfirmPassword", "confirmPassword"]
    ].forEach(([buttonId, inputId]) => {
        const button = getElement(buttonId);
        const input = getElement(inputId);
        button.addEventListener("click", () => {
            const hidden = input.type === "password";
            input.type = hidden ? "text" : "password";
            button.textContent = hidden ? "Hide" : "Show";
        });
    });
}

function setLoading(button, loading, text) {
    if (loading) {
        if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = text;
        button.classList.add("loading");
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || text;
        button.classList.remove("loading");
        delete button.dataset.originalText;
    }
}

async function postRequest(endpoint, body) {
    const response = await fetch(API_ENDPOINT(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
    });

    const data = await response.json();
    return { response, data };
}

function saveWorkerEmail(email) {
    sessionStorage.setItem("workerEmail", email);
}

function showModal(title, message, type = "error", redirect = null) {
    const icon = getElement("notificationIcon");
    icon.classList.remove("cooldown-icon");
    getElement("notificationTitle").textContent = title;
    getElement("notificationMessage").textContent = message;
    icon.textContent = type === "success" ? "✓" : "!";
    pendingRedirect = redirect;

    const modal = getElement("notificationModal");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}

function closeNotificationModal() {
    const modal = getElement("notificationModal");
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    const redirect = pendingRedirect;
    pendingRedirect = null;
    if (redirect) window.location.href = redirect;
}

function initializeNotificationModal() {
    getElement("closeNotification").addEventListener("click", closeNotificationModal);
    getElement("notificationButton").addEventListener("click", closeNotificationModal);
}

function handleConnectionError(error, button, text) {
    console.error(error);
    setLoading(button, false, text);
    showModal("Connection Error", "Unable to connect to the server. Please try again.");
}

function showCooldown(data) {
    const value = data.cooldownUntil || data.coolDownUntil;
    const date = value ? new Date(value) : null;

    if (!date || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        showModal("Request Failed", data.message || "Unable to process your request.");
        return;
    }

    showModal(
        "Resend Cooldown Active",
        data.message || "You have reached the OTP resend limit. Please try again after the cooldown period."
    );
    getElement("notificationIcon").classList.add("cooldown-icon");
    startPasswordResetCooldownCountdown(date);
}

function startPasswordResetCooldownCountdown(date) {
    clearInterval(passwordResetCooldownTimer);

    const message = getElement("notificationMessage");
    const countdown = document.createElement("span");
    countdown.style.cssText = "display:block;margin-top:12px;font-weight:600";
    message.appendChild(countdown);

    function update() {
        const seconds = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
        if (!seconds) {
            clearInterval(passwordResetCooldownTimer);
            passwordResetCooldownTimer = null;
            countdown.textContent = "Cooldown ended. You can request another code.";
            return;
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        countdown.textContent = `Time remaining: ${hours}h ${minutes}m ${seconds % 60}s`;
    }

    update();
    if (date.getTime() > Date.now())
        passwordResetCooldownTimer = setInterval(update, 1000);
}

/* LOGIN */

function initializeLogin() {
    getElement("loginForm").addEventListener("submit", async event => {
        event.preventDefault();

        const button = getElement("loginButton");
        const email = getElement("loginEmail").value.trim().toLowerCase();
        const password = getElement("loginPassword").value;

        if (!validateEmail(email)) return;
        if (!password) return showModal("Password Required", "Please enter your password.");

        setLoading(button, true, "Logging in...");

        try {
            const { response, data } = await postRequest(
                "/api/worker-authentication/login", { email, password }
            );

            setLoading(button, false, "Login");

            if (!response.ok) {
                if (data.cooldownUntil || data.coolDownUntil) showCooldown(data);
                else showModal("Login Failed", data.message || "Unable to authenticate your account.");
                return;
            }

            if (data.nextStep === "email-verification") {
                saveWorkerEmail(data.email || email);
                showModal("Verify Your Email", data.message, "success", "../worker-email-otp/index.html");
            } else if (data.nextStep === "profile") {
                saveWorkerEmail(data.email || email);
                showModal("Complete Your Profile", data.message, "success", "../worker-create-profile/index.html");
            } else if (data.nextStep === "authenticated") {
                showModal("Login Successful", data.message || `Welcome back, ${data.fullName}.`,
                    "success", "../worker-services/index.html");
            } else {
                showModal("Authentication Error", data.message || "Unable to determine your account status.");
            }
        } catch (error) {
            handleConnectionError(error, button, "Login");
        }
    });
}

/* SIGNUP */

function initializeSignup() {
    getElement("signupForm").addEventListener("submit", async event => {
        event.preventDefault();

        const button = getElement("signupButton");
        const email = getElement("signupEmail").value.trim().toLowerCase();
        const password = getElement("signupPassword").value;
        const confirmPassword = getElement("confirmPassword").value;
        const termsAccepted = getElement("termsCheckbox").checked;

        if (!validateEmail(email)) return;
        if (!password) return showModal("Password Required", "Please enter your password.");
        if (password.length < 8) return showModal("Password Too Short", "Password must be at least 8 characters.");
        if (!confirmPassword) return showModal("Confirm Password Required", "Please confirm your password.");
        if (password !== confirmPassword) return showModal("Passwords Do Not Match", "Please make sure both passwords match.");
        if (!termsAccepted) return showModal("Agreement Required", "You must agree to the Terms and Privacy Policy.");

        setLoading(button, true, "Creating...");

        try {
            const { response, data } = await postRequest(
                "/api/worker-authentication/signup",
                { email, password, confirmPassword, termsAccepted }
            );

            setLoading(button, false, "Create Account");

            if (!response.ok) {
                showModal("Account Creation Failed", data.message || "Unable to create your account.");
                return;
            }

            saveWorkerEmail(data.email || email);
            showModal("Account Created", data.message || "Your verification code has been sent to your email.",
                "success", "../worker-email-otp/index.html");
        } catch (error) {
            handleConnectionError(error, button, "Create Account");
        }
    });
}

/* FORGOT PASSWORD */

function initializeForgotPassword() {
    getElement("forgotForm").addEventListener("submit", async event => {
        event.preventDefault();

        const button = getElement("forgotButton");
        const email = getElement("resetEmail").value.trim().toLowerCase();

        if (!validateEmail(email)) return;

        setLoading(button, true, "Verifying...");

        try {
            const { response, data } = await postRequest(
                "/api/worker-authentication/forgot-password", { email }
            );

            setLoading(button, false, "Verify Email");

            if (!response.ok) {
                closeForgotModal();
                if (data.cooldownUntil || data.coolDownUntil) showCooldown(data);
                else showModal("Request Failed", data.message || "Unable to process your request.");
                return;
            }

            saveWorkerEmail(data.email || email);
            closeForgotModal();
            showModal("Verification Code Sent", data.message || "A password reset code has been sent to your email.",
                "success", "../worker-password-reset-otp/index.html");
        } catch (error) {
            setLoading(button, false, "Verify Email");
            handleConnectionError(error, button, "Verify Email");
        }
    });
}

function initializeForgotModal() {
    const modal = getElement("forgotModal");

    getElement("forgotPassword").addEventListener("click", () => {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    });

    getElement("closeModal").addEventListener("click", closeForgotModal);
    getElement("forgotOverlay").addEventListener("click", closeForgotModal);
}

function closeForgotModal() {
    const modal = getElement("forgotModal");
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

/* GOOGLE */

function initializeGoogleButtons() {
    [
        getElement("googleLoginButton"),
        getElement("googleSignupButton")
    ].forEach(button => {
        button.addEventListener("click", () => {
            button.disabled = true;
            button.textContent = "Connecting...";
            button.classList.add("loading");
            window.location.href = API_ENDPOINT("/api/worker-authentication/google");
        });
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && getElement("forgotModal").classList.contains("show"))
        closeForgotModal();
});