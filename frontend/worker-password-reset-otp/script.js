"use strict";

/* 1. API ENDPOINTS */

const VERIFY_OTP_URL = API_ENDPOINT("/api/auth/worker/password-reset-otp/verify");
const RESEND_OTP_URL = API_ENDPOINT("/api/auth/worker/password-reset-otp/resend");
const WORKER_AUTH_URL = "../worker-authentication/index.html";
const PASSWORD_CHANGE_URL = "../worker-password-change/index.html";

/* 2. DOM ELEMENTS */

const otpForm = document.getElementById("otpForm");
const otpInputs = document.querySelectorAll(".otp-input");
const verifyButton = document.getElementById("verifyButton");
const verifyButtonText = verifyButton?.querySelector(".btn-text");
const workerEmailDisplay = document.getElementById("workerEmailDisplay");
const resendOTP = document.getElementById("resendOTP");
const countdown = document.getElementById("countdown");

const messageModal = document.getElementById("messageModal");
const messageModalOverlay = document.getElementById("messageModalOverlay");
const closeMessageModal = document.getElementById("closeMessageModal");
const messageModalButton = document.getElementById("messageModalButton");
const modalIcon = document.getElementById("modalIcon");
const messageModalTitle = document.getElementById("messageModalTitle");
const messageModalText = document.getElementById("messageModalText");

const menuToggle = document.getElementById("menuToggle");
const mobileSidebar = document.getElementById("mobileSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarClose = document.getElementById("sidebarClose");

/* 3. STATE */

let workerEmail = "";
let countdownTimer = null;
let requestInProgress = false;

/* 4. INITIALIZATION */

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage() {
    const currentYear = document.getElementById("currentYear");
    if (currentYear) currentYear.textContent = new Date().getFullYear();

    setupSidebar();

    workerEmail = sessionStorage.getItem("workerEmail");

    if (!workerEmail) {
        showModal(
            "error",
            "Session Expired",
            "Your password reset session has expired. Please start the password reset process again.",
            () => window.location.href = WORKER_AUTH_URL
        );
        return;
    }

    if (workerEmailDisplay) workerEmailDisplay.textContent = workerEmail;

    setupOTPInputs();
    startCountdown();
    otpInputs[0]?.focus();
}

/* 5. MOBILE SIDEBAR */

function setupSidebar() {
    if (!menuToggle || !mobileSidebar || !sidebarOverlay) return;

    menuToggle.addEventListener("click", openSidebar);
    sidebarClose?.addEventListener("click", closeSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    mobileSidebar.querySelectorAll(".sidebar-links a").forEach(link =>
        link.addEventListener("click", closeSidebar)
    );

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && mobileSidebar.classList.contains("open"))
            closeSidebar();
    });
}

function openSidebar() {
    if (!mobileSidebar || !sidebarOverlay || !menuToggle) return;

    mobileSidebar.classList.add("open");
    sidebarOverlay.classList.add("show");
    mobileSidebar.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    mobileSidebar.removeAttribute("inert");
    document.body.style.overflow = "hidden";
}

function closeSidebar() {
    if (!mobileSidebar || !sidebarOverlay || !menuToggle) return;

    mobileSidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
    mobileSidebar.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    mobileSidebar.setAttribute("inert", "");
    document.body.style.overflow = "";
    menuToggle.focus();
}

/* 6. OTP INPUTS */

function setupOTPInputs() {
    otpInputs.forEach((input, index) => {
        input.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "").slice(-1);
            if (this.value && index < otpInputs.length - 1)
                otpInputs[index + 1].focus();
        });

        input.addEventListener("keydown", function (event) {
            if (
                (event.key === "Backspace" && !this.value || event.key === "ArrowLeft") &&
                index > 0
            ) otpInputs[index - 1].focus();

            if (event.key === "ArrowRight" && index < otpInputs.length - 1)
                otpInputs[index + 1].focus();
        });

        input.addEventListener("keypress", event => {
            if (!/[0-9]/.test(event.key) && event.key.length === 1)
                event.preventDefault();
        });

        input.addEventListener("paste", event => {
            event.preventDefault();

            const pastedText = (event.clipboardData || window.clipboardData)
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            if (!pastedText) return;

            otpInputs.forEach((item, i) => item.value = pastedText[i] || "");

            const nextEmptyIndex = Array.from(otpInputs).findIndex(item => !item.value);

            otpInputs[nextEmptyIndex !== -1 ? nextEmptyIndex : otpInputs.length - 1].focus();
        });
    });
}

/* 7. GET OTP VALUE */

function getOTPValue() {
    return Array.from(otpInputs).map(input => input.value).join("");
}

/* 8. OTP VERIFICATION */

otpForm?.addEventListener("submit", handleOTPVerification);

async function handleOTPVerification(event) {
    event.preventDefault();
    if (requestInProgress) return;

    const otp = getOTPValue();

    if (!/^\d{6}$/.test(otp)) {
        showModal(
            "error",
            otp ? "Invalid OTP" : "OTP Required",
            otp
                ? "Please enter the complete 6-digit password reset code."
                : "Please enter the 6-digit password reset code."
        );
        return;
    }

    workerEmail = sessionStorage.getItem("workerEmail");

    if (!workerEmail) {
        showModal(
            "error",
            "Session Expired",
            "Your password reset session has expired. Please start again.",
            () => window.location.href = WORKER_AUTH_URL
        );
        return;
    }

    setVerifyLoading(true);

    try {
        const response = await fetch(VERIFY_OTP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: workerEmail, otp })
        });

        const data = await readResponse(response);

        if (!response.ok || !data.success) {
            showModal(
                "error",
                data.title || "Verification Failed",
                data.message || "The password reset code could not be verified."
            );
            return;
        }

        clearOTPInputs();

        showModal(
            "success",
            "OTP Verified",
            data.message || "Your password reset code has been verified successfully.",
            () => window.location.href = PASSWORD_CHANGE_URL
        );
    } catch (error) {
        console.error("Password reset OTP verification error:", error);
        showModal(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please check your internet connection and try again."
        );
    } finally {
        setVerifyLoading(false);
    }
}

/* 9. RESEND OTP */

resendOTP?.addEventListener("click", handleResendOTP);

async function handleResendOTP(event) {
    event.preventDefault();

    if (requestInProgress || resendOTP.classList.contains("disabled")) return;

    workerEmail = sessionStorage.getItem("workerEmail");

    if (!workerEmail) {
        showModal(
            "error",
            "Session Expired",
            "Your password reset session has expired. Please start again.",
            () => window.location.href = WORKER_AUTH_URL
        );
        return;
    }

    setResendLoading(true);

    try {
        const response = await fetch(RESEND_OTP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: workerEmail })
        });

        const data = await readResponse(response);

        if (!response.ok || !data.success) {
            if (data.cooldownUntil) {
                const cooldownDate = new Date(data.cooldownUntil);

                if (!Number.isNaN(cooldownDate.getTime()) && cooldownDate.getTime() > Date.now()) {
                    showModal(
                        "error",
                        "Resend Cooldown Active",
                        "You have reached the password reset OTP resend limit. You must wait until the cooldown expires.",
                        () => {}
                    );
                    startCooldownCountdown(cooldownDate, true);
                    return;
                }
            }

            showModal(
                "error",
                data.title || "Unable To Resend OTP",
                data.message || "We could not send a new password reset code."
            );
            return;
        }

        clearOTPInputs();

        showModal(
            "success",
            "OTP Sent",
            data.message || "A new password reset code has been sent to your email.",
            startCountdown
        );
    } catch (error) {
        console.error("Password reset OTP resend error:", error);
        showModal(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please try again."
        );
    } finally {
        setResendLoading(false);
    }
}

/* 10. COOLDOWN MESSAGE */

function getCooldownMessage(cooldownUntil, fallbackMessage) {
    const cooldownDate = new Date(cooldownUntil);

    if (Number.isNaN(cooldownDate.getTime()))
        return fallbackMessage || "You have reached the password reset code resend limit. Please try again later.";

    const formattedDate = cooldownDate.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });

    return `You have reached the password reset code resend limit. You can request another code after ${formattedDate}.`;
}

/* 11. READ API RESPONSE */

async function readResponse(response) {
    try {
        return await response.json();
    } catch {
        return {
            success: false,
            message: response.ok
                ? "The server returned an invalid response."
                : "The server could not process your request."
        };
    }
}

/* 12. VERIFY LOADING STATE */

function setVerifyLoading(isLoading) {
    if (!verifyButton) return;

    requestInProgress = isLoading;
    verifyButton.disabled = isLoading;

    if (verifyButtonText)
        verifyButtonText.innerHTML = isLoading
            ? '<span class="loading-spinner"></span> Verifying...'
            : "Verify OTP";
}

/* 13. RESEND LOADING STATE */

function setResendLoading(isLoading) {
    if (!resendOTP) return;

    requestInProgress = isLoading;

    if (isLoading) {
        resendOTP.classList.add("disabled");
        resendOTP.textContent = "Resending...";
        return;
    }

    resendOTP.textContent = "Resend OTP";

    if (
        countdownTimer ||
        countdown?.textContent.includes("Resend available in") ||
        countdown?.textContent.includes("Resend unavailable for")
    ) {
        resendOTP.classList.add("disabled");
    } else {
        resendOTP.classList.remove("disabled");
    }
}

/* 14. CLEAR OTP INPUTS */

function clearOTPInputs() {
    otpInputs.forEach(input => input.value = "");
    otpInputs[0]?.focus();
}

/* 15. RESEND COUNTDOWN */

function startCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    let secondsRemaining = 60;

    if (resendOTP) {
        resendOTP.classList.add("disabled");
        resendOTP.textContent = "Resend OTP";
    }

    updateCountdown(secondsRemaining);

    countdownTimer = setInterval(() => {
        secondsRemaining--;
        updateCountdown(secondsRemaining);

        if (secondsRemaining <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;

            if (resendOTP) {
                resendOTP.classList.remove("disabled");
                resendOTP.textContent = "Resend OTP";
            }

            if (countdown) countdown.textContent = "You can resend the OTP now.";
        }
    }, 1000);
}

/* 16. COOLDOWN COUNTDOWN */

function startCooldownCountdown(cooldownDate, displayInModal = false) {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    if (resendOTP) {
        resendOTP.classList.add("disabled");
        resendOTP.textContent = "Resend OTP";
    }

    let modalCountdown = null;

    if (displayInModal && messageModalText) {
        modalCountdown = document.createElement("span");
        modalCountdown.className = "modal-cooldown-countdown";
        Object.assign(modalCountdown.style, {
            display: "block",
            marginTop: "12px",
            fontWeight: "600",
            lineHeight: "1.6"
        });
        modalCountdown.setAttribute("role", "timer");
        modalCountdown.setAttribute("aria-live", "off");
        messageModalText.appendChild(modalCountdown);
    }

    function updateCooldown() {
        const remainingMilliseconds = cooldownDate.getTime() - Date.now();

        if (remainingMilliseconds <= 0) {
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }

            if (resendOTP) {
                resendOTP.classList.remove("disabled");
                resendOTP.textContent = "Resend OTP";
            }

            const expiredMessage = "The cooldown has ended. You can request another OTP.";

            if (countdown) countdown.textContent = expiredMessage;
            if (modalCountdown) modalCountdown.textContent = expiredMessage;
            return;
        }

        const totalSeconds = Math.ceil(remainingMilliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const remainingTime = `${hours}h ${minutes}m ${seconds}s`;

        if (countdown) countdown.textContent = `Resend unavailable for ${remainingTime}`;
        if (modalCountdown) modalCountdown.textContent = `Time remaining: ${remainingTime}`;
    }

    updateCooldown();

    if (cooldownDate.getTime() > Date.now())
        countdownTimer = setInterval(updateCooldown, 1000);
}

/* 17. UPDATE COUNTDOWN */

function updateCountdown(seconds) {
    if (countdown && seconds > 0)
        countdown.textContent = `Resend available in ${seconds}s`;
}

/* 18. SHOW MODAL */

function showModal(type, title, message, onContinue = null) {
    if (!messageModal) return;

    messageModal.classList.remove("success", "error");
    messageModal.classList.add(type);

    if (modalIcon) modalIcon.textContent = type === "success" ? "✓" : "!";
    if (messageModalTitle) messageModalTitle.textContent = title;
    if (messageModalText) messageModalText.textContent = message;
    if (messageModalButton) messageModalButton.textContent = "Continue";

    messageModal.classList.add("show");
    messageModal.setAttribute("aria-hidden", "false");
    messageModal._onContinue = onContinue;
}

/* 19. CLOSE MODAL */

function closeModal() {
    if (!messageModal) return;

    messageModal.classList.remove("show");
    messageModal.setAttribute("aria-hidden", "true");

    const onContinue = messageModal._onContinue;
    messageModal._onContinue = null;

    if (typeof onContinue === "function") onContinue();
}

/* 20. MODAL EVENTS */

closeMessageModal?.addEventListener("click", closeModal);
messageModalButton?.addEventListener("click", closeModal);
messageModalOverlay?.addEventListener("click", closeModal);

/* 21. ESCAPE KEY */

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && messageModal?.classList.contains("show"))
        closeModal();
});