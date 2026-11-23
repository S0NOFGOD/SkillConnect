const otpForm = document.getElementById("otpForm");
const otpInputs = document.querySelectorAll(".otp-input");
const workerEmailElement = document.getElementById("workerEmail");
const verifyButton = document.getElementById("verifyButton");
const buttonText = verifyButton.querySelector(".btn-text");
const resendOTP = document.getElementById("resendOTP");
const countdownElement = document.getElementById("countdown");

const notificationModal = document.getElementById("notificationModal");
const notificationIcon = document.getElementById("notificationIcon");
const notificationTitle = document.getElementById("notificationTitle");
const notificationMessage = document.getElementById("notificationMessage");
const notificationCloseButton = document.getElementById("notificationCloseButton");

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("otpMobileSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarClose = document.getElementElementById
    ? document.getElementElementById("sidebarClose")
    : document.getElementById("sidebarClose");

const workerEmail = sessionStorage.getItem("workerEmail");
const authenticationPage = "../worker-authentication/index.html";

let countdownSeconds = 60;
let countdownTimer = null;
let isVerifying = false;
let isResending = false;
let notificationCallback = null;
let cooldownTimer = null;
let cooldownActive = false;


/* =========================================================
   CURRENT YEAR
========================================================= */

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

const openSidebar = () => {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("show");

    sidebar.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    sidebar.removeAttribute("inert");

    document.body.style.overflow = "hidden";

    const firstLink = sidebar.querySelector("a");

    if (firstLink) {
        firstLink.focus();
    }
};

const closeSidebar = () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");

    sidebar.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    sidebar.setAttribute("inert", "");

    document.body.style.overflow = "";

    menuToggle.focus();
};

menuToggle.addEventListener("click", openSidebar);

sidebarClose.addEventListener("click", closeSidebar);

sidebarOverlay.addEventListener("click", closeSidebar);

sidebar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeSidebar);
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) {
        closeSidebar();
    }
});


/* =========================================================
   NOTIFICATION
========================================================= */

const showNotification = (type, title, message, callback = null) => {
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    notificationCallback = callback;

    notificationIcon.classList.remove("success", "error");
    notificationIcon.classList.add(type);

    notificationIcon.textContent = type === "success" ? "✓" : "!";

    notificationCloseButton.textContent = "Continue";

    notificationModal.hidden = false;
};

const closeNotification = () => {
    const callback = notificationCallback;

    notificationCallback = null;
    notificationModal.hidden = true;

    if (callback) {
        callback();
    }
};

notificationCloseButton.addEventListener("click", closeNotification);


/* =========================================================
   OTP SESSION
========================================================= */

if (!workerEmail) {

    showNotification(
        "error",
        "Session Expired",
        "Your verification session has expired. Please return to the authentication page.",
        () => {
            window.location.href = authenticationPage;
        }
    );

} else {

    workerEmailElement.textContent = workerEmail;

}


/* =========================================================
   OTP INPUTS
========================================================= */

otpInputs.forEach((input, index) => {

    input.addEventListener("input", () => {

        input.value = input.value.replace(/\D/g, "").slice(-1);

        input.classList.remove("invalid");

        if (input.value && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }

    });


    input.addEventListener("keydown", event => {

        if (
            event.key === "Backspace" &&
            !input.value &&
            index > 0
        ) {
            otpInputs[index - 1].focus();
        }

        if (
            event.key === "ArrowLeft" &&
            index > 0
        ) {
            otpInputs[index - 1].focus();
        }

        if (
            event.key === "ArrowRight" &&
            index < otpInputs.length - 1
        ) {
            otpInputs[index + 1].focus();
        }

    });


    input.addEventListener("paste", event => {

        event.preventDefault();

        const pasted = (
            event.clipboardData ||
            window.clipboardData
        )
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);

        if (!pasted) return;

        otpInputs.forEach((field, i) => {
            field.value = pasted[i] || "";
            field.classList.remove("invalid");
        });

        const last = Math.min(pasted.length, otpInputs.length) - 1;

        if (last >= 0) {
            otpInputs[last].focus();
        }

    });

});


/* =========================================================
   OTP HELPERS
========================================================= */

const getOTP = () => {
    return Array.from(otpInputs)
        .map(input => input.value.trim())
        .join("");
};

const validateOTP = otp => /^\d{6}$/.test(otp);

const markOTPInvalid = () => {
    otpInputs.forEach(input => {
        input.classList.add("invalid");
    });
};

const clearOTPInputs = () => {

    otpInputs.forEach(input => {
        input.value = "";
        input.classList.remove("invalid");
    });

    if (otpInputs[0]) {
        otpInputs[0].focus();
    }

};


/* =========================================================
   VERIFY BUTTON LOADING
========================================================= */

const setVerifyLoading = loading => {

    verifyButton.disabled = loading;

    buttonText.textContent = loading
        ? "Verifying..."
        : "Verify OTP";

};


/* =========================================================
   RESEND BUTTON LOADING
========================================================= */

const setResendLoading = loading => {

    resendOTP.disabled =
        loading ||
        !!countdownTimer ||
        cooldownActive;

    resendOTP.classList.toggle(
        "disabled",
        loading ||
        !!countdownTimer ||
        cooldownActive
    );

    resendOTP.textContent = loading
        ? "Resending..."
        : "Resend OTP";

};


/* =========================================================
   COOLDOWN
========================================================= */

function showCooldownNotification(until) {

    if (cooldownTimer) {
        clearInterval(cooldownTimer);
    }

    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    cooldownActive = true;

    resendOTP.disabled = true;
    resendOTP.classList.add("disabled");

    const cooldownUntil = new Date(until).getTime();

    if (!Number.isFinite(cooldownUntil)) {

        cooldownActive = false;

        showNotification(
            "error",
            "Resend Limit Reached",
            "You have reached the maximum resend attempts. Please try again later."
        );

        return;

    }


    const updateCountdown = () => {

        const remaining = Math.max(
            0,
            Math.ceil((cooldownUntil - Date.now()) / 1000)
        );

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        countdownElement.textContent = remaining > 0
            ? `You have reached the maximum resend attempts. Please try again in ${hours}h ${minutes}m ${seconds}s.`
            : "Your cooldown has ended. You can request a new OTP.";

        notificationMessage.textContent = remaining > 0
            ? `You have reached the maximum resend attempts. Please try again in ${hours}h ${minutes}m ${seconds}s.`
            : "Your cooldown has ended. You can request a new OTP.";

        if (remaining <= 0) {

            clearInterval(cooldownTimer);
            cooldownTimer = null;

            cooldownActive = false;

            resendOTP.disabled = false;
            resendOTP.classList.remove("disabled");

            countdownElement.textContent =
                "You can request a new OTP.";

        }

    };


    showNotification(
        "error",
        "Resend Limit Reached",
        ""
    );

    updateCountdown();

    cooldownTimer = setInterval(updateCountdown, 1000);

}


/* =========================================================
   VERIFY OTP
========================================================= */

otpForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (isVerifying) return;

    const otp = getOTP();


    if (!validateOTP(otp)) {

        markOTPInvalid();

        showNotification(
            "error",
            "Invalid OTP",
            "Please enter the complete 6-digit verification code."
        );

        return;

    }


    if (!workerEmail) {

        showNotification(
            "error",
            "Session Expired",
            "Your verification session has expired.",
            () => {
                window.location.href = authenticationPage;
            }
        );

        return;

    }


    isVerifying = true;

    setVerifyLoading(true);


    try {

        const response = await fetch(
            API_ENDPOINT("/api/auth/worker/verify"),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: workerEmail,
                    otp
                })
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            clearOTPInputs();

            showNotification(
                "error",
                "Verification Failed",
                data.message ||
                "The verification code could not be verified."
            );

            return;

        }


        showNotification(
            "success",
            "Email Verified",
            data.message ||
            "Your email has been successfully verified.",
            () => {
                window.location.href =
                    "../worker-create-profile/index.html";
            }
        );


    } catch (error) {

        console.error("Email OTP verification error:", error);

        showNotification(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please check your internet connection and try again."
        );


    } finally {

        isVerifying = false;

        setVerifyLoading(false);

    }

});


/* =========================================================
   RESEND OTP
========================================================= */

resendOTP.addEventListener("click", async event => {

    event.preventDefault();

    if (
        isResending ||
        countdownTimer ||
        cooldownActive
    ) {
        return;
    }


    if (!workerEmail) {

        showNotification(
            "error",
            "Session Expired",
            "Your verification session has expired.",
            () => {
                window.location.href = authenticationPage;
            }
        );

        return;

    }


    isResending = true;

    setResendLoading(true);


    try {

        const response = await fetch(
            API_ENDPOINT("/api/auth/worker/resend"),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: workerEmail
                })
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            if (
                response.status === 429 &&
                data.coolDownUntil
            ) {

                showCooldownNotification(data.coolDownUntil);

                return;

            }


            const callback = response.status === 404
                ? () => {
                    window.location.href = authenticationPage;
                }
                : null;


            showNotification(
                "error",
                "Unable to Resend OTP",
                data.message ||
                "We could not send a new verification code.",
                callback
            );

            return;

        }


        clearOTPInputs();


        showNotification(
            "success",
            "OTP Sent",
            data.message ||
            "A new verification code has been sent to your email.",
            startCountdown
        );


    } catch (error) {

        console.error("Resend OTP error:", error);

        showNotification(
            "error",
            "Connection Error",
            "Unable to connect to the server. Please try again."
        );


    } finally {

        isResending = false;

        setResendLoading(false);

    }

});


/* =========================================================
   RESEND COUNTDOWN
========================================================= */

function startCountdown() {

    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    countdownSeconds = 60;

    resendOTP.disabled = true;
    resendOTP.classList.add("disabled");
    resendOTP.textContent = "Resend OTP";

    countdownElement.textContent =
        `Resend available in ${countdownSeconds}s`;


    countdownTimer = setInterval(() => {

        countdownSeconds--;


        if (countdownSeconds <= 0) {

            clearInterval(countdownTimer);

            countdownTimer = null;

            resendOTP.disabled = false;
            resendOTP.classList.remove("disabled");
            resendOTP.textContent = "Resend OTP";

            countdownElement.textContent =
                "You can request a new OTP.";

            return;

        }


        countdownElement.textContent =
            `Resend available in ${countdownSeconds}s`;

    }, 1000);

}


/* =========================================================
   INITIALIZE OTP PAGE
========================================================= */

if (workerEmail && otpInputs[0]) {

    otpInputs[0].focus();

    startCountdown();

}


/* =========================================================
   MODAL BODY SCROLL CONTROL
========================================================= */

new MutationObserver(() => {

    document.body.style.overflow =
        notificationModal.hidden
            ? ""
            : "hidden";

}).observe(notificationModal, {
    attributes: true,
    attributeFilter: ["hidden"]
});


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener("beforeunload", () => {

    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    if (cooldownTimer) {
        clearInterval(cooldownTimer);
    }

});


console.log(
    "SkillConnect Worker Email OTP JavaScript loaded successfully."
);