"use strict";

const VERIFY_OTP_URL = API_ENDPOINT("/api/auth/worker/password-reset-otp/verify");
const RESEND_OTP_URL = API_ENDPOINT("/api/auth/worker/password-reset-otp/resend");

const WORKER_AUTH_URL = "../worker-authentication/index.html";
const PASSWORD_CHANGE_URL = "../worker-password-change/index.html";

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

let workerEmail = "";
let countdownTimer = null;
let requestInProgress = false;

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage() {
    workerEmail = sessionStorage.getItem("workerEmail");

    if (!workerEmail) {
        showModal(
            "error",
            "Session Expired",
            "Your password reset session has expired. Please start the password reset process again.",
            () => {
                window.location.href = WORKER_AUTH_URL;
            }
        );
        return;
    }

    if (workerEmailDisplay) {
        workerEmailDisplay.textContent = workerEmail;
    }

    setupOTPInputs();
    startCountdown();
}

function setupOTPInputs() {
    otpInputs.forEach((input, index) => {
        input.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "").slice(0, 1);

            if (this.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Backspace" && !this.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        input.addEventListener("keypress", function (event) {
            if (!/[0-9]/.test(event.key) && event.key.length === 1) {
                event.preventDefault();
            }
        });

        input.addEventListener("paste", function (event) {
            event.preventDefault();

            const pastedText = (event.clipboardData || window.clipboardData)
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            if (!pastedText) return;

            otpInputs.forEach((item, i) => {
                item.value = pastedText[i] || "";
            });

            const nextEmptyIndex = Array.from(otpInputs)
                .findIndex(item => !item.value);

            if (nextEmptyIndex !== -1) {
                otpInputs[nextEmptyIndex].focus();
            } else {
                otpInputs[otpInputs.length - 1].focus();
            }
        });
    });
}

function getOTPValue() {
    return Array.from(otpInputs)
        .map(input => input.value)
        .join("");
}

if (otpForm) {
    otpForm.addEventListener("submit", handleOTPVerification);
}

if (resendOTP) {
    resendOTP.addEventListener("click", handleResendOTP);
}

async function handleOTPVerification(event) {
    event.preventDefault();

    if (requestInProgress) return;

    const otp = getOTPValue();

    if (!otp || !/^\d{6}$/.test(otp)) {
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
            () => {
                window.location.href = WORKER_AUTH_URL;
            }
        );
        return;
    }

    setVerifyLoading(true);

    try {
        const response = await fetch(VERIFY_OTP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: workerEmail,
                otp
            })
        });

        const data = await readResponse(response);

        if (!response.ok || !data.success) {
            showModal(
                "error",
                data.title || "Verification Failed",
                data.message ||
                    "The password reset code could not be verified."
            );
            return;
        }

        clearOTPInputs();

        showModal(
            "success",
            "OTP Verified",
            data.message ||
                "Your password reset code has been verified successfully.",
            () => {
                window.location.href = PASSWORD_CHANGE_URL;
            }
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

async function handleResendOTP(event) {
    event.preventDefault();

    if (
        requestInProgress ||
        resendOTP.classList.contains("disabled")
    ) {
        return;
    }

    workerEmail = sessionStorage.getItem("workerEmail");

    if (!workerEmail) {
        showModal(
            "error",
            "Session Expired",
            "Your password reset session has expired. Please start again.",
            () => {
                window.location.href = WORKER_AUTH_URL;
            }
        );
        return;
    }

    setResendLoading(true);

    try {
        const response = await fetch(RESEND_OTP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: workerEmail
            })
        });

        const data = await readResponse(response);

        if (!response.ok || !data.success) {
            if (data.cooldownUntil) {
                const cooldownDate = new Date(data.cooldownUntil);

                if (
                    !Number.isNaN(cooldownDate.getTime()) &&
                    cooldownDate.getTime() > Date.now()
                ) {
                    showModal("error","Resend Cooldown Active",
                        
                    "You have reached the password reset OTP resend limit. You must wait until the cooldown expires.",
                    () => {
                        window.location.href = WORKER_AUTH_URL;
                    });

startCooldownCountdown(cooldownDate, true);
return;
                }
            }

            showModal(
                "error",
                data.title || "Unable To Resend OTP",
                data.message ||
                    "We could not send a new password reset code."
            );
            return;
        }

        clearOTPInputs();

        showModal(
            "success",
            "OTP Sent",
            data.message ||
                "A new password reset code has been sent to your email.",
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

function getCooldownMessage(cooldownUntil, fallbackMessage) {
    const cooldownDate = new Date(cooldownUntil);

    if (Number.isNaN(cooldownDate.getTime())) {
        return fallbackMessage ||
            "You have reached the password reset code resend limit. Please try again later.";
    }

    const formattedDate = cooldownDate.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });

    return `You have reached the password reset code resend limit. You can request another code after ${formattedDate}.`;
}

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

function setVerifyLoading(isLoading) {
    if (!verifyButton) return;

    requestInProgress = isLoading;
    verifyButton.disabled = isLoading;

    if (verifyButtonText) {
        if (isLoading) {
            verifyButtonText.innerHTML =
                '<span class="loading-spinner"></span> Verifying...';
        } else {
            verifyButtonText.textContent = "Verify OTP";
        }
    }
}

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

function clearOTPInputs() {
    otpInputs.forEach(input => {
        input.value = "";
    });

    if (otpInputs[0]) {
        otpInputs[0].focus();
    }
}

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

            if (countdown) {
                countdown.textContent = "You can resend the OTP now.";
            }
        }
    }, 1000);
}

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

        modalCountdown.style.display = "block";
        modalCountdown.style.marginTop = "12px";
        modalCountdown.style.fontWeight = "600";
        modalCountdown.style.lineHeight = "1.6";

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

            const expiredMessage =
                "The cooldown has ended. You can request another OTP.";

            if (countdown) {
                countdown.textContent = expiredMessage;
            }

            if (modalCountdown) {
                modalCountdown.textContent = expiredMessage;
            }

            return;
        }

        const totalSeconds = Math.ceil(remainingMilliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const remainingTime =
            `${hours}h ${minutes}m ${seconds}s`;

        if (countdown) {
            countdown.textContent =
                `Resend unavailable for ${remainingTime}`;
        }

        if (modalCountdown) {
            modalCountdown.textContent =
                `Time remaining: ${remainingTime}`;
        }
    }

    updateCooldown();

    if (cooldownDate.getTime() > Date.now()) {
        countdownTimer = setInterval(updateCooldown, 1000);
    }
}

function updateCountdown(seconds) {
    if (countdown && seconds > 0) {
        countdown.textContent = `Resend available in ${seconds}s`;
    }
}

function showModal(type, title, message, onContinue = null) {
    if (!messageModal) return;

    messageModal.classList.remove("success", "error");
    messageModal.classList.add(type);

    if (modalIcon) {
        modalIcon.textContent = type === "success" ? "✓" : "!";
    }

    if (messageModalTitle) {
        messageModalTitle.textContent = title;
    }

    if (messageModalText) {
        messageModalText.textContent = message;
    }

    if (messageModalButton) {
        messageModalButton.textContent = "Continue";
    }

    messageModal.classList.add("show");
    messageModal.setAttribute("aria-hidden", "false");
    messageModal._onContinue = onContinue;
}

function closeModal() {
    if (!messageModal) return;

    messageModal.classList.remove("show");
    messageModal.setAttribute("aria-hidden", "true");

    const onContinue = messageModal._onContinue;
    messageModal._onContinue = null;

    if (typeof onContinue === "function") {
        onContinue();
    }
}

if (closeMessageModal) {
    closeMessageModal.addEventListener("click", closeModal);
}

if (messageModalButton) {
    messageModalButton.addEventListener("click", closeModal);
}

if (messageModalOverlay) {
    messageModalOverlay.addEventListener("click", closeModal);
}

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        messageModal?.classList.contains("show")
    ) {
        closeModal();
    }
});