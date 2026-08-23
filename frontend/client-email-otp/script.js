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
   Client email display.
*/

const clientEmailElement =
    document.getElementById("clientEmail");


/*
   Verify button.
*/

const verifyButton =
    document.getElementById("verifyButton");


/*
   Button text.

   This is changed while verification
   is loading.
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
   Authentication notification modal.
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


/* =========================================================
   3. GET CLIENT EMAIL FROM SESSION STORAGE
========================================================= */

/*
   The previous client authentication page saves:

       sessionStorage.clientEmail

   Example:

       client@gmail.com

   This tells this page which client is
   currently verifying their email.
*/

const clientEmail =
    sessionStorage.getItem("clientEmail");


/* =========================================================
   4. REDIRECT PATHS
========================================================= */

/*
   Client authentication page.

   Used when the verification session is invalid.
*/

const authenticationPage =
    "../client-authentication/index.html";


/* =========================================================
   5. RESEND COUNTDOWN VARIABLES
========================================================= */

/*
   Client must wait 60 seconds before
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
   6. LOADING STATE VARIABLES
========================================================= */

/*
   Prevent multiple verification requests.
*/

let isVerifying =
    false;


/*
   Prevent multiple resend requests.
*/

let isResending =
    false;


/* =========================================================
   7. CREATE MODAL CLOSE BUTTON
========================================================= */

/*
   The notification modal is used for every
   authentication response.

   Error messages must remain visible until
   the client closes them.

   The HTML structure may not contain a close
   button, so JavaScript creates one here.

   This keeps the modal functionality centralized.
*/

let notificationCloseButton =
    document.getElementById(
        "notificationClose"
    );


/*
   Create the close button only if it
   does not already exist in the HTML.
*/

if (
    !notificationCloseButton
) {

    notificationCloseButton =
        document.createElement(
            "button"
        );


    /*
       Give the button an ID so it can
       be referenced later.
    */

    notificationCloseButton.id =
        "notificationClose";


    /*
       Accessibility label.
    */

    notificationCloseButton.setAttribute(
        "aria-label",
        "Close notification"
    );


    /*
       Button text.
    */

    notificationCloseButton.textContent =
        "Close";


    /*
       Basic button type.

       This prevents accidental form submission.
    */

    notificationCloseButton.type =
        "button";


    /*
       Add a class that can be styled
       by the CSS file.
    */

    notificationCloseButton.className =
        "notification-close";


    /*
       Add the button to the notification card.
    */

    const notificationCard =
        notificationModal.querySelector(
            ".notification-card"
        );


    if (
        notificationCard
    ) {

        notificationCard.appendChild(
            notificationCloseButton
        );

    }

}


/* =========================================================
   8. CLOSE NOTIFICATION MODAL
========================================================= */

/*
   This function closes the notification modal.

   IMPORTANT:

   Error notifications do NOT automatically
   close.

   The client must click the Close button.
*/

const closeNotification = () => {

    notificationModal.hidden =
        true;


    /*
       Restore normal page scrolling.
    */

    document.body.style.overflow =
        "";

};


/* =========================================================
   9. CLOSE BUTTON EVENT
========================================================= */

if (
    notificationCloseButton
) {

    notificationCloseButton.addEventListener(
        "click",
        closeNotification
    );

}


/* =========================================================
   10. SHOW NOTIFICATION MODAL
========================================================= */

/*
   ALL authentication success and error
   responses are displayed using this modal.

   type:

       "success"

   OR:

       "error"

   callback:

       Used only when we need to redirect
       after a successful response.

   Redirect callbacks automatically execute
   after 1.5 seconds.
*/

const showNotification = (
    type,
    title,
    message,
    callback = null
) => {

    /* =====================================================
       SET MODAL TITLE
    ===================================================== */

    notificationTitle.textContent =
        title;


    /* =====================================================
       SET MODAL MESSAGE
    ===================================================== */

    notificationMessage.textContent =
        message;


    /* =====================================================
       RESET MODAL ICON STATE
    ===================================================== */

    notificationIcon.classList.remove(
        "success",
        "error"
    );


    /* =====================================================
       APPLY NEW MODAL STATE
    ===================================================== */

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
       SHOW / HIDE CLOSE BUTTON
    ===================================================== */

    if (
        notificationCloseButton
    ) {

        /*
           The client must manually close
           authentication errors.

           Successful redirect messages are
           automatically redirected after 1.5s,
           so a close button is unnecessary.
        */

        if (
            type === "error"
        ) {

            notificationCloseButton.style.display =
                "inline-flex";

        } else {

            notificationCloseButton.style.display =
                "none";

        }

    }


    /* =====================================================
       OPEN MODAL
    ===================================================== */

    notificationModal.hidden =
        false;


    /*
       Prevent the page behind the modal
       from scrolling.
    */

    document.body.style.overflow =
        "hidden";


    /* =====================================================
       REDIRECT AFTER 1.5 SECONDS
    ===================================================== */

    if (
        callback
    ) {

        setTimeout(
            () => {

                callback();

            },
            1500
        );

    }

};


/* =========================================================
   11. INITIAL SESSION CHECK
========================================================= */

/*
   The client must arrive here with:

       sessionStorage.clientEmail

   If it does not exist, the verification
   session is invalid.
*/

if (
    !clientEmail
) {

    /* =====================================================
       SHOW SESSION ERROR
    ===================================================== */

    showNotification(

        "error",

        "Session Expired",

        "Your verification session has expired. Please return to the client authentication page.",

        () => {

            window.location.href =
                authenticationPage;

        }

    );

} else {

    /* =====================================================
       DISPLAY CLIENT EMAIL
    ===================================================== */

    clientEmailElement.textContent =
        clientEmail;


    /* =====================================================
       START RESEND COUNTDOWN
    ===================================================== */

    startCountdown();

}


/* =========================================================
   12. OTP INPUT HANDLING
========================================================= */

/*
   Allows the client to enter:

       1 → box 1
       2 → box 2
       3 → box 3
       4 → box 4
       5 → box 5
       6 → box 6

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
                   If Backspace is pressed while
                   the current field is empty,
                   move to the previous field.
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
                   Prevent the browser from placing
                   the complete OTP into one field.
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
                   FILL OTP INPUTS
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
   13. GET COMPLETE OTP
========================================================= */

/*
   Combines all six OTP inputs.

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
   14. VALIDATE OTP
========================================================= */

/*
   The OTP must contain exactly six numbers.
*/

const validateOTP = (
    otp
) => {

    return /^\d{6}$/.test(
        otp
    );

};


/* =========================================================
   15. MARK OTP INPUTS INVALID
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
   16. CLEAR OTP INPUTS
========================================================= */

const clearOTPInputs = () => {

    otpInputs.forEach(
        input => {

            input.value =
                "";

            input.classList.remove(
                "invalid"
            );

        }
    );


    /*
       Return focus to the first OTP box.
    */

    if (
        otpInputs[0]
    ) {

        otpInputs[0].focus();

    }

};


/* =========================================================
   17. VERIFY BUTTON LOADING STATE
========================================================= */

/*
   Shows a spinner while the backend
   verifies the OTP.
*/

const setVerifyLoading = (
    loading
) => {

    if (
        loading
    ) {

        /* ================================================
           DISABLE VERIFY BUTTON
        ================================================ */

        verifyButton.disabled =
            true;


        /* ================================================
           SHOW SPINNER
        ================================================ */

        buttonText.innerHTML = `

            <span class="loading-spinner"></span>

            Verifying...

        `;

    } else {

        /* ================================================
           ENABLE VERIFY BUTTON
        ================================================ */

        verifyButton.disabled =
            false;


        /* ================================================
           RESTORE BUTTON TEXT
        ================================================ */

        buttonText.textContent =
            "Verify Email";

    }

};


/* =========================================================
   18. RESEND LOADING STATE
========================================================= */

/*
   Shows a loading state while a new OTP
   is being requested.
*/

const setResendLoading = (
    loading
) => {

    if (
        loading
    ) {

        resendOTP.classList.add(
            "disabled"
        );


        resendOTP.textContent =
            "Sending...";

    } else {

        /*
           The countdown controls whether
           the link can actually be clicked.
        */

        resendOTP.textContent =
            "Resend OTP";

    }

};


/* =========================================================
   19. VERIFY EMAIL OTP
========================================================= */

/*
   Backend endpoint:

       POST /api/auth/client/email-otp/verify

   Request body:

       {
           email: clientEmail,
           otp: otp
       }
*/

otpForm.addEventListener(
    "submit",
    async (
        event
    ) => {

        /* =================================================
           PREVENT NORMAL FORM SUBMISSION
        ================================================= */

        event.preventDefault();


        /* =================================================
           PREVENT DUPLICATE REQUESTS
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
           FRONTEND OTP VALIDATION
        ================================================= */

        if (
            !validateOTP(otp)
        ) {

            /* =============================================
               MARK INPUTS INVALID
            ============================================= */

            markOTPInvalid();


            /* =============================================
               SHOW ERROR MODAL
            ============================================= */

            showNotification(

                "error",

                "Invalid OTP",

                "Please enter the complete 6-digit verification code."

            );


            return;

        }


        /* =================================================
           START VERIFICATION LOADING
        ================================================= */

        isVerifying =
            true;


        setVerifyLoading(
            true
        );


        try {

            /* =================================================
               SEND OTP TO BACKEND
            ================================================= */

            const response =
                await fetch(

                    API_ENDPOINT("/api/auth/client/email-otp/verify"), {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                email:
                                    clientEmail,

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
               CHECK BACKEND RESPONSE
            ================================================= */

            if (
                !response.ok ||
                !data.success
            ) {

                /* =========================================
                   SHOW BACKEND ERROR
                ========================================= */

                showNotification(

                    "error",

                    "Verification Failed",

                    data.message ||
                    "The verification code could not be verified."

                );


                /* =========================================
                   CLEAR INVALID OTP
                ========================================= */

                clearOTPInputs();


                return;

            }


            /* =================================================
               EMAIL VERIFICATION SUCCESS
            ================================================= */

            /*
               At this point the backend should have:

               isEmailVerified = true

               emailOTP = null

               emailOTPExpires = null
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
                       USE BACKEND NEXT PAGE
                    ===================================== */

                    if (
                        data.nextPage
                    ) {

                        window.location.href =
                            data.nextPage;

                    } else {

                        /*
                           Safety fallback.

                           If the backend does not provide
                           a destination, return the client
                           to authentication instead of
                           guessing a page.
                        */

                        window.location.href =
                            authenticationPage;

                    }

                }

            );


        } catch (error) {

            /* =================================================
               NETWORK ERROR
            ================================================= */

            console.error(
                "Client email OTP verification error:",
                error
            );


            /* =================================================
               SHOW CONNECTION ERROR
            ================================================= */

            showNotification(

                "error",

                "Connection Error",

                "Unable to connect to the server. Please check your internet connection and try again."

            );


        } finally {

            /* =================================================
               STOP VERIFICATION LOADING
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
   20. RESEND OTP
========================================================= */

/*
   Backend endpoint:

       POST /api/auth/client/email-otp/resend

   Request body:

       {
           email: clientEmail
       }
*/

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
           PREVENT DUPLICATE REQUESTS
        ================================================= */

        if (
            isResending
        ) {

            return;

        }


        /* =================================================
           CHECK CLIENT EMAIL
        ================================================= */

        if (
            !clientEmail
        ) {

            showNotification(

                "error",

                "Session Expired",

                "Your verification session has expired. Please return to the client authentication page."

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

                    API_ENDPOINT("/api/auth/client/email-otp/resend"),

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
                                    clientEmail

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
               CLEAR PREVIOUS OTP
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
                "Client resend OTP error:",
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
   21. START RESEND COUNTDOWN
========================================================= */

/*
   Client must wait 60 seconds before
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
                   CHECK IF COUNTDOWN FINISHED
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
                       ENABLE RESEND LINK
                    ===================================== */

                    /*
                       Only enable the link if a resend
                       request is not currently running.
                    */

                    if (
                        !isResending
                    ) {

                        resendOTP.classList.remove(
                            "disabled"
                        );

                    }


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
   22. INITIAL OTP FOCUS
========================================================= */

/*
   If the client email exists, automatically
   focus the first OTP input.
*/

if (
    clientEmail &&
    otpInputs[0]
) {

    otpInputs[0].focus();

}


/* =========================================================
   23. MODAL SCROLL CONTROL
========================================================= */

/*
   Prevent the page behind the modal
   from scrolling while the modal is open.
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
   24. CONSOLE CONFIRMATION
========================================================= */

/*
   Helpful during development.

   Confirms that the Client Email OTP
   JavaScript file loaded successfully.
*/

console.log(
    "SkillConnect Client Email OTP JavaScript loaded successfully."
);