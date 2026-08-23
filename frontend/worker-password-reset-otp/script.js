/* =========================================================
   PASSWORD RESET OTP ENDPOINTS
========================================================= */

const VERIFY_OTP_URL =
    API_ENDPOINT(
        "/api/auth/worker/password-reset-otp/verify"
    );


/*
    RESEND OTP:
*/

const RESEND_OTP_URL =
    API_ENDPOINT(
        "/api/auth/worker/password-reset-otp/resend"
    );


/* =========================================================
   2. PAGE REDIRECTION PATHS
========================================================= */

/*
    Authentication page.

    Used when the worker's session is missing.
*/

const WORKER_AUTH_URL =
    "../worker-authentication/index.html";


/*
    Password change page.

    Used after the reset OTP has been successfully
    verified.
*/

const PASSWORD_CHANGE_URL =
    "../worker-password-change/index.html";


/* =========================================================
   3. DOM ELEMENTS
========================================================= */

/*
    OTP form.
*/

const otpForm =
    document.getElementById("otpForm");


/*
    All six OTP input boxes.
*/

const otpInputs =
    document.querySelectorAll(".otp-input");


/*
    Verify button.
*/

const verifyButton =
    document.getElementById("verifyButton");


/*
    Text inside the verify button.
*/

const verifyButtonText =
    verifyButton
        ? verifyButton.querySelector(".btn-text")
        : null;


/*
    Worker email display.
*/

const workerEmailDisplay =
    document.getElementById("workerEmailDisplay");


/*
    Resend OTP link.
*/

const resendOTP =
    document.getElementById("resendOTP");


/*
    Countdown display.
*/

const countdown =
    document.getElementById("countdown");


/* =========================================================
   MODAL ELEMENTS
========================================================= */

/*
    Main notification modal.
*/

const messageModal =
    document.getElementById("messageModal");


/*
    Modal overlay.
*/

const messageModalOverlay =
    document.getElementById("messageModalOverlay");


/*
    Modal close button.
*/

const closeMessageModal =
    document.getElementById("closeMessageModal");


/*
    Modal icon.
*/

const modalIcon =
    document.getElementById("modalIcon");


/*
    Modal title.
*/

const messageModalTitle =
    document.getElementById("messageModalTitle");


/*
    Modal message.
*/

const messageModalText =
    document.getElementById("messageModalText");


/* =========================================================
   4. PAGE STATE
========================================================= */

/*
    Stores the worker email.

    It comes from:

    sessionStorage.workerEmail
*/

let workerEmail =
    "";


/*
    Stores the countdown timer.

    This prevents multiple countdowns
    from running at the same time.
*/

let countdownTimer =
    null;


/*
    Determines whether a request is currently
    being processed.

    This prevents accidental double submissions.
*/

let requestInProgress =
    false;


/* =========================================================
   5. INITIALIZE PAGE
========================================================= */

/*
    Start the page when the DOM has loaded.
*/

document.addEventListener(

    "DOMContentLoaded",

    initializePage

);


/* =========================================================
   INITIALIZE PAGE FUNCTION
========================================================= */

function initializePage() {

    /*
        Get the worker email from sessionStorage.
    */

    workerEmail =
        sessionStorage.getItem(
            "workerEmail"
        );


    /* ================================================
       Check whether worker email exists
    ================================================= */

    if (!workerEmail) {

        /*
            The worker cannot continue because
            the password-reset flow does not know
            which account is being verified.
        */

        showModal(

            "error",

            "Session Expired",

            "Your password reset session has expired. Please start the password reset process again.",

            function () {

                /*
                    Return the worker to authentication.
                */

                window.location.href =
                    WORKER_AUTH_URL;

            }

        );

        return;

    }


    /* ================================================
       Display worker email
    ================================================= */

    if (workerEmailDisplay) {

        workerEmailDisplay.textContent =
            workerEmail;

    }


    /* ================================================
       Setup OTP inputs
    ================================================= */

    setupOTPInputs();


    /* ================================================
       Start resend countdown
    ================================================= */

    startCountdown();

}


/* =========================================================
   6. OTP INPUT SETUP
========================================================= */

/*
    Controls:

    - Numbers only
    - Automatic movement to next input
    - Backspace movement
    - Paste support
*/

function setupOTPInputs() {


    otpInputs.forEach(

        function (input, index) {


            /* ============================================
               Allow only numeric input
            ============================================ */

            input.addEventListener(

                "input",

                function () {

                    /*
                        Remove anything that is
                        not a number.
                    */

                    this.value =
                        this.value.replace(
                            /\D/g,
                            ""
                        );


                    /*
                        Move automatically to the
                        next OTP input.
                    */

                    if (
                        this.value &&
                        index <
                        otpInputs.length - 1
                    ) {

                        otpInputs[
                            index + 1
                        ].focus();

                    }

                }

            );


            /* ============================================
               Handle keyboard navigation
            ============================================ */

            input.addEventListener(

                "keydown",

                function (event) {

                    /*
                        If Backspace is pressed on
                        an empty field, move backwards.
                    */

                    if (

                        event.key ===
                        "Backspace" &&

                        !this.value &&

                        index > 0

                    ) {

                        otpInputs[
                            index - 1
                        ].focus();

                    }

                }

            );


            /* ============================================
               Prevent invalid characters
            ============================================ */

            input.addEventListener(

                "keypress",

                function (event) {

                    /*
                        Allow only numbers.
                    */

                    if (
                        !/[0-9]/.test(
                            event.key
                        )
                    ) {

                        event.preventDefault();

                    }

                }

            );


            /* ============================================
               Handle OTP paste
            ============================================ */

            input.addEventListener(

                "paste",

                function (event) {

                    /*
                        Prevent normal browser paste.
                    */

                    event.preventDefault();


                    /*
                        Get pasted text.
                    */

                    const pastedText =
                        (
                            event.clipboardData ||
                            window.clipboardData
                        )
                            .getData("text")
                            .replace(
                                /\D/g,
                                ""
                            )
                            .slice(0, 6);


                    /*
                        Stop if nothing useful
                        was pasted.
                    */

                    if (!pastedText) {

                        return;

                    }


                    /*
                        Fill the OTP boxes.
                    */

                    pastedText
                        .split("")
                        .forEach(

                            function (
                                digit,
                                digitIndex
                            ) {

                                if (
                                    otpInputs[
                                        digitIndex
                                    ]
                                ) {

                                    otpInputs[
                                        digitIndex
                                    ].value =
                                        digit;

                                }

                            }

                        );


                    /*
                        Focus the next empty
                        input or the final input.
                    */

                    const nextEmptyIndex =
                        Array.from(
                            otpInputs
                        ).findIndex(

                            function (item) {

                                return !item.value;

                            }

                        );


                    if (
                        nextEmptyIndex !== -1
                    ) {

                        otpInputs[
                            nextEmptyIndex
                        ].focus();

                    } else {

                        otpInputs[
                            otpInputs.length - 1
                        ].focus();

                    }

                }

            );

        }

    );

}


/* =========================================================
   7. GET OTP VALUE
========================================================= */

/*
    Combines the six OTP input boxes
    into one six-digit string.

    Example:

    4 + 8 + 2 + 9 + 1 + 3

    becomes:

    "482913"
*/

function getOTPValue() {

    return Array
        .from(otpInputs)
        .map(
            function (input) {

                return input.value;

            }
        )
        .join("");

}


/* =========================================================
   8. OTP FORM SUBMISSION
========================================================= */

if (otpForm) {

    otpForm.addEventListener(

        "submit",

        handleOTPVerification

    );

}


/* =========================================================
   VERIFY PASSWORD RESET OTP
========================================================= */

async function handleOTPVerification(event) {

    /*
        Prevent normal form submission.
    */

    event.preventDefault();


    /*
        Prevent duplicate requests.
    */

    if (requestInProgress) {

        return;

    }


    /* ================================================
       Make sure the worker email still exists
    ================================================= */

    workerEmail =
        sessionStorage.getItem(
            "workerEmail"
        );


    if (!workerEmail) {

        showModal(

            "error",

            "Session Expired",

            "Your password reset session has expired. Please start again.",

            function () {

                window.location.href =
                    WORKER_AUTH_URL;

            }

        );

        return;

    }


    /* ================================================
       Get OTP
    ================================================= */

    const otp =
        getOTPValue();


    /* ================================================
       Frontend validation
    ================================================= */

    if (!otp) {

        showModal(

            "error",

            "OTP Required",

            "Please enter the 6-digit password reset code."

        );

        return;

    }


    /*
        OTP must contain exactly six numbers.
    */

    if (
        !/^\d{6}$/.test(otp)
    ) {

        showModal(

            "error",

            "Invalid OTP",

            "Please enter the complete 6-digit password reset code."

        );

        return;

    }


    /* ================================================
       Start loading state
    ================================================= */

    setVerifyLoading(true);


    try {

        /* ============================================
           Send email + OTP to backend
        ============================================ */

        const response =
            await fetch(

                VERIFY_OTP_URL,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            email:
                                workerEmail,

                            otp:
                                otp

                        })

                }

            );


        /* ============================================
           Read backend response
        ============================================ */

        const data =
            await response.json();


        /* ============================================
           Handle backend error
        ============================================ */

        if (!response.ok || !data.success) {

            showModal(

                "error",

                data.title ||
                    "Verification Failed",

                data.message ||
                    "The password reset code could not be verified."

            );

            return;

        }


        /* ============================================
           Save reset authorization
        ============================================ */

        /*
            The backend returns a temporary
            password-reset authorization.

            This authorization allows the next page:

            worker-password-change/index.html

            to prove that the OTP was successfully
            verified.

            IMPORTANT:

            We do NOT store the actual OTP.
        */

        if (
            data.resetAuthorization
        ) {

            sessionStorage.setItem(

                "resetAuthorization",

                data.resetAuthorization

            );

        }


        /* ============================================
           Clear OTP input boxes
        ============================================ */

        clearOTPInputs();


        /* ============================================
           Success modal
        ============================================ */

        showModal("success", "OTP Verified", data.message || "Your password reset code has been verified successfully.");
        
        /* ================================================
        AUTOMATIC SUCCESS REDIRECT
        ================================================ */

        setTimeout(function () {
            window.location.href = PASSWORD_CHANGE_URL;
        },1500);

    }

    catch (error) {

        /*
            Handle network/server errors.

            These are also shown using
            the required authentication modal.
        */

        console.error(
            "Password reset OTP verification error:",
            error
        );


        showModal(

            "error",

            "Connection Error",

            "Unable to connect to the server. Please check your internet connection and try again."

        );

    }

    finally {

        /*
            Restore the verify button.
        */

        setVerifyLoading(false);

    }

}


/* =========================================================
   9. RESEND OTP
========================================================= */

/*
    Worker clicks:

    Resend OTP

    Then:

    Frontend
        ↓
    Backend
        ↓
    Find worker
        ↓
    Generate new OTP
        ↓
    Save OTP + expiry
        ↓
    Send email
        ↓
    Success response
        ↓
    Success modal
*/

if (resendOTP) {

    resendOTP.addEventListener(

        "click",

        handleResendOTP

    );

}


/* =========================================================
   RESEND OTP FUNCTION
========================================================= */

async function handleResendOTP(event) {

    /*
        Prevent the "#" link from
        changing the page URL.
    */

    event.preventDefault();


    /*
        Prevent duplicate requests.
    */

    if (requestInProgress) {

        return;

    }


    /*
        Prevent resend while countdown
        is active.
    */

    if (
        resendOTP.classList.contains(
            "disabled"
        )
    ) {

        return;

    }


    /* ================================================
       Get worker email
    ================================================= */

    workerEmail =
        sessionStorage.getItem(
            "workerEmail"
        );


    /* ================================================
       Validate worker email
    ================================================= */

    if (!workerEmail) {

        showModal(

            "error",

            "Session Expired",

            "Your password reset session has expired. Please start again.",

            function () {

                window.location.href =
                    WORKER_AUTH_URL;

            }

        );

        return;

    }


    /* ================================================
       Start loading state
    ================================================= */

    setResendLoading(true);


    try {

        /* ============================================
           Send worker email to backend
        ============================================ */

        const response =
            await fetch(

                RESEND_OTP_URL,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            email:
                                workerEmail

                        })

                }

            );


        /* ============================================
           Read backend response
        ============================================ */

        const data =
            await response.json();


        /* ============================================
           Backend error
        ============================================ */

        if (!response.ok || !data.success) {

            showModal(

                "error",

                data.title ||
                    "Unable To Resend OTP",

                data.message ||
                    "We could not send a new password reset code."

            );

            return;

        }


        /* ============================================
           Clear old OTP
        ============================================ */

        clearOTPInputs();


        /* ============================================
           Start a new countdown
        ============================================ */

        startCountdown();


        /* ============================================
           Success modal
        ============================================ */

        showModal(

            "success",

            "OTP Sent",

            data.message ||
                "A new password reset code has been sent to your email."

        );

    }

    catch (error) {

        /*
            Handle network errors.
        */

        console.error(
            "Password reset OTP resend error:",
            error
        );


        showModal(

            "error",

            "Connection Error",

            "Unable to connect to the server. Please try again."

        );

    }

    finally {

        /*
            Restore resend state.
        */

        setResendLoading(false);

    }

}


/* =========================================================
   10. VERIFY BUTTON LOADING STATE
========================================================= */

function setVerifyLoading(isLoading) {

    if (!verifyButton) {

        return;

    }


    if (isLoading) {

        /*
            Prevent another submission.
        */

        requestInProgress =
            true;


        verifyButton.disabled =
            true;


        /*
            Show loading spinner.
        */

        if (verifyButtonText) {

            verifyButtonText.innerHTML =

                `
                    <span class="loading-spinner"></span>
                    Verifying...
                `;

        }

    }

    else {

        /*
            Allow another request.
        */

        requestInProgress =
            false;


        verifyButton.disabled =
            false;


        /*
            Restore normal button text.
        */

        if (verifyButtonText) {

            verifyButtonText.textContent =
                "Verify OTP";

        }

    }

}


/* =========================================================
   11. RESEND LOADING STATE
========================================================= */

function setResendLoading(isLoading) {

    if (!resendOTP) {

        return;

    }


    if (isLoading) {

        /*
            Prevent other authentication
            requests while resend is processing.
        */

        requestInProgress =
            true;


        resendOTP.classList.add(
            "disabled"
        );


        /*
            Temporarily change the link text.
        */

        resendOTP.textContent =
            "Sending...";

    }

    else {

        /*
            Restore normal text.

            The countdown may immediately
            disable the link again.
        */

        requestInProgress =
            false;


        resendOTP.textContent =
            "Resend OTP";

    }

}


/* =========================================================
   12. CLEAR OTP INPUTS
========================================================= */

function clearOTPInputs() {

    otpInputs.forEach(

        function (input) {

            input.value =
                "";

        }

    );


    /*
        Return focus to the first OTP box.
    */

    if (otpInputs[0]) {

        otpInputs[0].focus();

    }

}


/* =========================================================
   13. RESEND COUNTDOWN
========================================================= */

function startCountdown() {

    /*
        Clear an existing countdown first.

        This prevents multiple timers from
        running simultaneously.
    */

    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );

        countdownTimer =
            null;

    }


    /*
        60-second resend delay.
    */

    let secondsRemaining =
        60;


    /* ================================================
       Disable resend link
    ================================================= */

    if (resendOTP) {

        resendOTP.classList.add(
            "disabled"
        );

        resendOTP.textContent =
            "Resend OTP";

    }


    /* ================================================
       Display initial countdown
    ================================================= */

    updateCountdown(
        secondsRemaining
    );


    /* ================================================
       Start timer
    ================================================= */

    countdownTimer =
        setInterval(

            function () {

                secondsRemaining--;


                updateCountdown(
                    secondsRemaining
                );


                /*
                    Countdown finished.
                */

                if (
                    secondsRemaining <= 0
                ) {

                    clearInterval(
                        countdownTimer
                    );


                    countdownTimer =
                        null;


                    /*
                        Enable resend.
                    */

                    if (resendOTP) {

                        resendOTP.classList.remove(
                            "disabled"
                        );

                        resendOTP.textContent =
                            "Resend OTP";

                    }


                    if (countdown) {

                        countdown.textContent =
                            "You can resend the OTP now.";

                    }

                }

            },

            1000

        );

}


/* =========================================================
   14. UPDATE COUNTDOWN TEXT
========================================================= */

function updateCountdown(seconds) {

    if (!countdown) {

        return;

    }


    if (seconds > 0) {

        countdown.textContent =
            `Resend available in ${seconds}s`;

    }

}


/* =========================================================
   15. MESSAGE MODAL
========================================================= */

/*
    Displays every authentication-related
    success and error response through
    the required modal.

    type:

        "success"

        "error"

    onClose:

        Optional function executed after
        the modal is closed.
*/

function showModal(
    type,
    title,
    message,
    onClose = null
) {


    /*
        Make sure the modal exists.
    */

    if (!messageModal) {

        return;

    }


    /* ================================================
       Remove previous state
    ================================================= */

    messageModal.classList.remove(
        "success",
        "error"
    );


    /*
        Apply current modal type.
    */

    messageModal.classList.add(
        type
    );


    /* ================================================
       Modal icon
    ================================================= */

    if (modalIcon) {

        modalIcon.textContent =
            type === "success"
                ? "✓"
                : "!";

    }


    /* ================================================
       Modal title
    ================================================= */

    if (messageModalTitle) {

        messageModalTitle.textContent =
            title;

    }


    /* ================================================
       Modal message
    ================================================= */

    if (messageModalText) {

        messageModalText.textContent =
            message;

    }


    /* ================================================
       Display modal
    ================================================= */

    messageModal.classList.add(
        "show"
    );


    messageModal.setAttribute(
        "aria-hidden",
        "false"
    );


    /*
        Store callback temporarily.

        The callback is executed when the
        user closes the modal.
    */

    messageModal._onClose =
        onClose;

}


/* =========================================================
   16. CLOSE MESSAGE MODAL
========================================================= */

function closeModal() {

    if (!messageModal) {

        return;

    }


    /*
        Hide modal.
    */

    messageModal.classList.remove(
        "show"
    );


    messageModal.setAttribute(
        "aria-hidden",
        "true"
    );


    /*
        Get callback saved by showModal().
    */

    const onClose =
        messageModal._onClose;


    /*
        Remove the callback so it cannot
        accidentally execute twice.
    */

    messageModal._onClose =
        null;


    /*
        Execute callback if one exists.
    */

    if (
        typeof onClose ===
        "function"
    ) {

        onClose();

    }

}


/* =========================================================
   17. MODAL CLOSE EVENTS
========================================================= */

/*
    Close button.
*/

if (closeMessageModal) {

    closeMessageModal.addEventListener(

        "click",

        closeModal

    );

}


/*
    Clicking the dark overlay closes
    the modal.
*/

if (messageModalOverlay) {

    messageModalOverlay.addEventListener(

        "click",

        closeModal

    );

}


/* =========================================================
   18. ESCAPE KEY
========================================================= */

/*
    Allow the worker to close an ordinary
    modal using the Escape key.
*/

document.addEventListener(

    "keydown",

    function (event) {

        if (
            event.key ===
            "Escape" &&

            messageModal &&

            messageModal.classList.contains(
                "show"
            )
        ) {

            closeModal();

        }

    }

);