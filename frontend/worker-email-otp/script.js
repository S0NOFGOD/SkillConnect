/* =========================================================
   2. GET HTML ELEMENTS
========================================================= */

/*
    OTP form.
*/

const otpForm =
    document.getElementById("otpForm");


/*
    Six OTP input boxes.
*/

const otpInputs =
    document.querySelectorAll(".otp-input");


/*
    Worker email display.
*/

const workerEmailElement =
    document.getElementById("workerEmail");


/*
    Verify button.
*/

const verifyButton =
    document.getElementById("verifyButton");


/*
    Button text.

    We change this during loading.
*/

const buttonText =
    verifyButton.querySelector(".btn-text");


/*
    Resend OTP link.
*/

const resendOTP =
    document.getElementById("resendOTP");


/*
    Countdown element.
*/

const countdownElement =
    document.getElementById("countdown");


/*
    Notification modal.
*/

const notificationModal =
    document.getElementById("notificationModal");


/*
    Notification icon.
*/

const notificationIcon =
    document.getElementById("notificationIcon");


/*
    Notification title.
*/

const notificationTitle =
    document.getElementById("notificationTitle");


/*
    Notification message.
*/

const notificationMessage =
    document.getElementById("notificationMessage");


    /*
    Notification close / continue button.

    This button allows the worker to manually
    close the notification modal.
*/

const notificationCloseButton =
    document.getElementById("notificationCloseButton");


/* =========================================================
   3. SESSION EMAIL
========================================================= */

/*
    The previous authentication pages save:

        sessionStorage.workerEmail

    Example:

        john@gmail.com

    This email tells the OTP page which worker
    is currently verifying their account.
*/

const workerEmail =
    sessionStorage.getItem("workerEmail");


/* =========================================================
   4. REDIRECT PATHS
========================================================= */

/*
    These are the pages used after successful
    email verification.
*/

const authenticationPage =
    "../worker-authentication/index.html";


/* =========================================================
   5. RESEND COUNTDOWN VARIABLES
========================================================= */

/*
    The worker must wait 60 seconds before
    requesting another OTP.
*/

let countdownSeconds =
    60;


/*
    Stores the countdown interval.
*/

let countdownTimer =
    null;


/* =========================================================
   6. LOADING STATE
========================================================= */

/*
    Prevents the worker from submitting the
    verification form multiple times.
*/

let isVerifying =
    false;


/*
    Prevents multiple resend requests.
*/

let isResending =
    false;


/* =========================================================
   7. NOTIFICATION MODAL CALLBACK
========================================================= */

/*
    Stores an optional action that should happen
    after the user closes the modal.

    Example:

        Successful email verification
        ↓
        User clicks Continue
        ↓
        Modal closes
        ↓
        User is redirected
*/

let notificationCallback =
    null;


/* =========================================================
   8. SHOW NOTIFICATION MODAL
========================================================= */

/*
    ALL authentication success and error responses
    are displayed using this modal.

    type can be:

        "success"

    or:

        "error"

    callback is optional.

    If a callback exists, the modal will display
    a "Continue" button.

    The user must close the modal first.

    After closing, the callback runs.
*/

const showNotification = (
    type,
    title,
    message,
    callback = null
) => {

    /* =====================================================
       SET MODAL CONTENT
    ===================================================== */

    notificationTitle.textContent =
        title;


    notificationMessage.textContent =
        message;


    /* =====================================================
       STORE CALLBACK
    ===================================================== */

    /*
        Save the callback so it can be executed
        when the worker clicks Continue/Close.
    */

    notificationCallback =
        callback;


    /* =====================================================
       SET MODAL TYPE
    ===================================================== */

    notificationIcon.classList.remove(
        "success",
        "error"
    );


    notificationIcon.classList.add(
        type
    );


    /* =====================================================
       SET ICON
    ===================================================== */

    if (
        type === "success"
    ) {

        notificationIcon.textContent =
            "✓";

    } else {

        notificationIcon.textContent =
            "!";

    }


    /* =====================================================
       SET MODAL BUTTON
    ===================================================== */

    /*
        If there is a callback, the button becomes
        "Continue".

        Otherwise it becomes "Close".
    */

    if (
        notificationCallback
    ) {

        notificationCloseButton.textContent =
            "Continue";

    } else {

        notificationCloseButton.textContent =
            "Close";

    }


    /* =====================================================
       OPEN MODAL
    ===================================================== */

    notificationModal.hidden =
        false;

};


/* =========================================================
   9. CLOSE NOTIFICATION MODAL
========================================================= */

/*
    Closes the notification modal.

    IMPORTANT:

    The modal is closed FIRST.

    Then, if a callback exists, the callback
    is executed.

    This means:

        User clicks Continue
        ↓
        Modal closes
        ↓
        Redirect happens
*/

const closeNotification = () => {

    /* =====================================================
       SAVE CALLBACK
    ===================================================== */

    const callback =
        notificationCallback;


    /* =====================================================
       CLEAR STORED CALLBACK
    ===================================================== */

    notificationCallback =
        null;


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    notificationModal.hidden =
        true;


    /* =====================================================
       EXECUTE CALLBACK
    ===================================================== */

    if (
        callback
    ) {

        callback();

    }

};


/* =========================================================
   10. MODAL BUTTON EVENT
========================================================= */

/*
    When the worker clicks:

        Close

    or:

        Continue

    the notification modal closes.

    If the modal contains a redirect callback,
    the redirect will happen after closing.
*/

notificationCloseButton.addEventListener(
    "click",
    () => {

        closeNotification();

    }
);


/* =========================================================
   9. INITIAL PAGE CHECK
========================================================= */

/*
    The worker must arrive here with:

        sessionStorage.workerEmail

    If it does not exist, the session is invalid.
*/

if (!workerEmail) {

    /* =====================================================
       SHOW ERROR
    ===================================================== */

    showNotification(

        "error",

        "Session Expired",

        "Your verification session has expired. Please return to the login or signup page.",

        () => {

            window.location.href =
                authenticationPage;

        }

    );

} else {

    /* =====================================================
       DISPLAY WORKER EMAIL
    ===================================================== */

    workerEmailElement.textContent =
        workerEmail;


    /* =====================================================
       START RESEND COUNTDOWN
    ===================================================== */

    startCountdown();

}


/* =========================================================
   10. OTP INPUT HANDLING
========================================================= */

/*
    This allows the worker to enter:

        1 → first box
        2 → second box
        3 → third box
        4 → fourth box
        5 → fifth box
        6 → sixth box

    The cursor automatically moves forward.
*/

otpInputs.forEach(
    (
        input,
        index
    ) => {


        /* =================================================
           INPUT EVENT
        ================================================= */

        input.addEventListener(
            "input",
            () => {

                /* =========================================
                   ONLY ALLOW NUMBERS
                ========================================= */

                input.value =
                    input.value.replace(
                        /\D/g,
                        ""
                    );


                /* =========================================
                   REMOVE INVALID STATE
                ========================================= */

                input.classList.remove(
                    "invalid"
                );


                /* =========================================
                   MOVE TO NEXT INPUT
                ========================================= */

                if (
                    input.value &&
                    index <
                    otpInputs.length - 1
                ) {

                    otpInputs[
                        index + 1
                    ].focus();

                }

            }
        );


        /* =================================================
           KEYBOARD NAVIGATION
        ================================================= */

        input.addEventListener(
            "keydown",
            (
                event
            ) => {

                /*
                    When Backspace is pressed on
                    an empty field, move backwards.
                */

                if (
                    event.key === "Backspace" &&
                    !input.value &&
                    index > 0
                ) {

                    otpInputs[
                        index - 1
                    ].focus();

                }

            }
        );


        /* =================================================
           PASTE OTP
        ================================================= */

        input.addEventListener(
            "paste",
            (
                event
            ) => {

                /*
                    Prevent the browser from putting
                    the entire OTP into one input.
                */

                event.preventDefault();


                /* =========================================
                   GET PASTED TEXT
                ========================================= */

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
                    .slice(
                        0,
                        6
                    );


                /* =========================================
                   FILL OTP BOXES
                ========================================= */

                pastedText
                    .split("")
                    .forEach(
                        (
                            digit,
                            digitIndex
                        ) => {

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


                /* =========================================
                   FOCUS LAST FILLED INPUT
                ========================================= */

                const lastIndex =
                    Math.min(
                        pastedText.length,
                        otpInputs.length
                    ) - 1;


                if (
                    lastIndex >= 0
                ) {

                    otpInputs[
                        lastIndex
                    ].focus();

                }

            }
        );

    }
);


/* =========================================================
   11. GET COMPLETE OTP
========================================================= */

/*
    Combines the six input boxes into one OTP.

    Example:

        4
        8
        2
        9
        1
        3

    becomes:

        "482913"
*/

const getOTP = () => {

    return Array
        .from(otpInputs)
        .map(
            input =>
                input.value.trim()
        )
        .join("");

};


/* =========================================================
   12. VALIDATE OTP
========================================================= */

/*
    The OTP must contain exactly six digits.
*/

const validateOTP = (
    otp
) => {

    return /^\d{6}$/.test(
        otp
    );

};


/* =========================================================
   13. MARK OTP INPUTS INVALID
========================================================= */

const markOTPInvalid = () => {

    otpInputs.forEach(
        input => {

            input.classList.add(
                "invalid"
            );

        }
    );

};


/* =========================================================
   14. CLEAR OTP INPUTS
========================================================= */

const clearOTPInputs = () => {

    otpInputs.forEach(
        input => {

            input.value = "";

            input.classList.remove(
                "invalid"
            );

        }
    );


    /*
        Put the cursor back into the
        first OTP input.
    */

    if (
        otpInputs[0]
    ) {

        otpInputs[0].focus();

    }

};


/* =========================================================
   15. SET VERIFY LOADING STATE
========================================================= */

/*
    Displays a spinner while the backend
    verifies the OTP.
*/

const setVerifyLoading = (
    loading
) => {

    if (loading) {

        verifyButton.disabled =
            true;

        buttonText.innerHTML = `

            <span class="loading-spinner"></span>

            Verifying...

        `;

    } else {

        verifyButton.disabled =
            false;

        buttonText.textContent =
            "Verify Email";

    }

};


/* =========================================================
   16. SET RESEND LOADING STATE
========================================================= */

const setResendLoading = (
    loading
) => {

    if (loading) {

        resendOTP.classList.add(
            "disabled"
        );

        resendOTP.textContent =
            "Sending...";

    } else {

        resendOTP.textContent =
            "Resend OTP";

    }

};


/* =========================================================
   17. VERIFY EMAIL OTP
========================================================= */

otpForm.addEventListener(
    "submit",
    async (
        event
    ) => {

        /* =================================================
           STOP NORMAL FORM SUBMISSION
        ================================================= */

        event.preventDefault();


        /* =================================================
           PREVENT DUPLICATE REQUEST
        ================================================= */

        if (
            isVerifying
        ) {

            return;

        }


        /* =================================================
           GET OTP
        ================================================= */

        const otp =
            getOTP();


        /* =================================================
           FRONTEND VALIDATION
        ================================================= */

        if (
            !validateOTP(otp)
        ) {

            /* =============================================
               MARK INPUTS INVALID
            ============================================= */

            markOTPInvalid();


            /* =============================================
               ERROR MODAL
            ============================================= */

            showNotification(

                "error",

                "Invalid OTP",

                "Please enter the complete 6-digit verification code."

            );


            return;

        }


        /* =================================================
           START LOADING
        ================================================= */

        isVerifying =
            true;


        setVerifyLoading(
            true
        );


        try {

            /* =================================================
               SEND REQUEST TO BACKEND
            ================================================= */

            const response =
                await fetch(

                    API_ENDPOINT("/api/auth/worker/verify"),

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


            /* =================================================
               READ BACKEND RESPONSE
            ================================================= */

            const data =
                await response.json();


            /* =================================================
               CHECK BACKEND SUCCESS
            ================================================= */

            if (
                !response.ok ||
                !data.success
            ) {

                /*
                    Backend errors are shown through
                    the authentication modal.
                */

                showNotification(

                    "error",

                    "Verification Failed",

                    data.message ||
                    "The verification code could not be verified."

                );


                /*
                    Clear the OTP so the worker can
                    enter the correct one.
                */

                clearOTPInputs();


                return;

            }


            /* =================================================
               EMAIL VERIFICATION SUCCESS
            ================================================= */

            /*
                At this point the backend has:

                isEmailVerified = true

                emailOTP = null

                emailOTPExpires = null

                and saved the worker.
            */


            /* =================================================
               SHOW SUCCESS MODAL
            ================================================= */

            showNotification(

                "success",

                "Email Verified",

                data.message ||
                "Your email has been successfully verified.",

                () => {

                    /* =====================================
                       CHECK PROFILE COMPLETION
                    ================ */

                    if (data.nextPage) {
                        window.location.href = data.nextPage;
                    } 
                    else {
                    
                        /* Safety fallback.

                         If the backend somehow does not
                          provide a nextPage, return the worker
                         to authentication instead of guessing
                         the destination.
                        */

                       window.location.href = authenticationPage;
                    }

                }

            );


        } catch (error) {

            /* =================================================
               NETWORK ERROR
            ================================================= */

            console.error(
                "Email OTP verification error:",
                error
            );


            showNotification(

                "error",

                "Connection Error",

                "Unable to connect to the server. Please check your internet connection and try again."

            );


        } finally {

            /* =================================================
               STOP LOADING
            ================================================= */

            isVerifying =
                false;


            setVerifyLoading(
                false
            );

        }

    }
);


/* =========================================================
   18. RESEND OTP
========================================================= */


resendOTP.addEventListener(
    "click",
    async (
        event
    ) => {

        /* =================================================
           PREVENT DEFAULT LINK BEHAVIOUR
        ================================================= */

        event.preventDefault();


        /* =================================================
           PREVENT DUPLICATE REQUEST
        ================================================= */

        if (
            isResending
        ) {

            return;

        }


        /* =================================================
           CHECK EMAIL
        ================================================= */

        if (
            !workerEmail
        ) {

            showNotification(

                "error",

                "Session Expired",

                "Your verification session has expired. Please return to the authentication page."

            );


            return;

        }


        /* =================================================
           START RESEND LOADING
        ================================================= */

        isResending =
            true;


        setResendLoading(
            true
        );


        try {

            /* =================================================
               SEND RESEND REQUEST
            ================================================= */

            const response =
                await fetch(

                    API_ENDPOINT("/api/auth/worker/resend"),

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


            /* =================================================
               READ BACKEND RESPONSE
            ================================================= */

            const data =
                await response.json();


            /* =================================================
               CHECK BACKEND RESPONSE
            ================================================= */

            if (
                !response.ok ||
                !data.success
            ) {

                showNotification(

                    "error",

                    "Unable to Resend OTP",

                    data.message ||
                    "We could not send a new verification code."

                );


                return;

            }


            /* =================================================
               RESEND SUCCESS
            ================================================= */

            showNotification(

                "success",

                "OTP Sent",

                data.message ||
                "A new verification code has been sent to your email."

            );


            /* =================================================
               CLEAR OLD OTP
            ================================================= */

            clearOTPInputs();


            /* =================================================
               START NEW COUNTDOWN
            ================================================= */

            startCountdown();


        } catch (error) {

            /* =================================================
               NETWORK ERROR
            ================================================= */

            console.error(
                "Resend OTP error:",
                error
            );


            showNotification(

                "error",

                "Connection Error",

                "Unable to connect to the server. Please try again."

            );


        } finally {

            /* =================================================
               STOP RESEND LOADING
            ================================================= */

            isResending =
                false;


            setResendLoading(
                false
            );

        }

    }
);


/* =========================================================
   19. START RESEND COUNTDOWN
========================================================= */

/*
    The worker must wait 60 seconds before
    requesting another OTP.

    This prevents repeated OTP requests.
*/

function startCountdown() {

    /* =====================================================
       CLEAR EXISTING TIMER
    ===================================================== */

    if (
        countdownTimer
    ) {

        clearInterval(
            countdownTimer
        );

    }


    /* =====================================================
       RESET COUNTDOWN
    ===================================================== */

    countdownSeconds =
        60;


    /* =====================================================
       DISABLE RESEND LINK
    ===================================================== */

    resendOTP.classList.add(
        "disabled"
    );


    /* =====================================================
       DISPLAY INITIAL COUNTDOWN
    ===================================================== */

    countdownElement.textContent =
        `Resend available in ${countdownSeconds}s`;


    /* =====================================================
       START TIMER
    ===================================================== */

    countdownTimer =
        setInterval(
            () => {

                countdownSeconds--;


                /* =========================================
                   CHECK WHETHER TIMER FINISHED
                ========================================= */

                if (
                    countdownSeconds <= 0
                ) {

                    /* =====================================
                       STOP TIMER
                    ===================================== */

                    clearInterval(
                        countdownTimer
                    );


                    countdownTimer =
                        null;


                    /* =====================================
                       ENABLE RESEND
                    ===================================== */

                    resendOTP.classList.remove(
                        "disabled"
                    );


                    resendOTP.textContent =
                        "Resend OTP";


                    countdownElement.textContent =
                        "You can request a new OTP.";

                    return;

                }


                /* =========================================
                   UPDATE COUNTDOWN
                ========================================= */

                countdownElement.textContent =
                    `Resend available in ${countdownSeconds}s`;

            },

            1000

        );

}


/* =========================================================
   20. INITIAL OTP FOCUS
========================================================= */

/*
    If the worker's session exists, automatically
    focus the first OTP field.
*/

if (
    workerEmail &&
    otpInputs[0]
) {

    otpInputs[0].focus();

}


/* =========================================================
   21. PREVENT MODAL PAGE SCROLL
========================================================= */

/*
    When the modal is visible, prevent the page
    behind it from scrolling.
*/

const observeModal =
    new MutationObserver(
        () => {

            if (
                notificationModal.hidden
            ) {

                document.body.style.overflow =
                    "";

            } else {

                document.body.style.overflow =
                    "hidden";

            }

        }
    );


observeModal.observe(
    notificationModal,
    {
        attributes: true,
        attributeFilter: [
            "hidden"
        ]
    }
);


/* =========================================================
   22. CONSOLE CONFIRMATION
========================================================= */

/*
    Helpful during development.

    This confirms that the Worker Email OTP
    JavaScript file has loaded correctly.
*/

console.log(
    "SkillConnect Worker Email OTP JavaScript loaded successfully."
);

                           