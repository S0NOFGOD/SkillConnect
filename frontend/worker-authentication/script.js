// ===============================
// Elements
// ===============================

const otpInputs = document.querySelectorAll(".otp-input");

const otpForm = document.getElementById("otpForm");

const resendOTP = document.getElementById("resendOTP");

const countdown = document.getElementById("countdown");

// ===============================
// Auto Move Between OTP Boxes
// ===============================

otpInputs.forEach((input, index) => {

    input.addEventListener("input", (e) => {

        e.target.value = e.target.value.replace(/[^0-9]/g, "");

        if (
            e.target.value &&
            index < otpInputs.length - 1
        ) {

            otpInputs[index + 1].focus();

        }

    });

    input.addEventListener("keydown", (e) => {

        if (
            e.key === "Backspace" &&
            !input.value &&
            index > 0
        ) {

            otpInputs[index - 1].focus();

        }

    });

});

// Auto Focus

otpInputs[0].focus();

// ===============================
// Countdown Timer
// ===============================

let timeLeft = 60;

resendOTP.style.pointerEvents = "none";
resendOTP.style.opacity = ".5";

const timer = setInterval(() => {

    timeLeft--;

    countdown.textContent =
        `Resend available in ${timeLeft}s`;

    if (timeLeft <= 0) {

        clearInterval(timer);

        countdown.textContent =
            "You can now resend the OTP.";

        resendOTP.style.pointerEvents = "auto";
        resendOTP.style.opacity = "1";

    }

}, 1000);

// ===============================
// Resend OTP
// ===============================

resendOTP.addEventListener("click", (e) => {

    e.preventDefault();

    // Backend:
    // POST /api/client/resend-phone-otp

    alert("A new OTP has been sent.");

    location.reload();

});

// ===============================
// Verify OTP
// ===============================

otpForm.addEventListener("submit", (e) => {

    e.preventDefault();

    const otp = [...otpInputs]
        .map(input => input.value)
        .join("");

    if (otp.length !== 6) {

        alert("Please enter the complete 6-digit OTP.");

        return;

    }

    // Backend:
    // POST /api/client/verify-phone-otp

    window.location.href =
        "../client-dashboard/index.html";

});