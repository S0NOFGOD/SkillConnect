/* =========================================================
   SKILLCONNECT CLIENT PASSWORD RESET OTP JAVASCRIPT

   This file controls:

   1. Reading client email from sessionStorage
   2. Checking whether clientEmail exists
   3. Displaying the client email
   4. Handling the 6-digit OTP inputs
   5. Frontend OTP validation
   6. Verifying the password-reset OTP
   7. Saving resetAuthorization
   8. Redirecting to client password change
   9. Resending the password-reset OTP
   10. 60-second resend countdown
   11. Loading states
   12. Success / Error modals

   CLIENT PASSWORD RESET OTP FLOW:

   client-authentication
          ↓
   Forgot Password
          ↓
   clientEmail saved in sessionStorage
          ↓
   client-password-reset-otp
          ↓
   Enter OTP
          ↓
   Verify OTP
          ↓
   Backend verification
          ↓
   resetAuthorization
          ↓
   client-password-change


   IMPORTANT:

   All authentication errors and success responses
   are displayed using modals.

   Redirect success modals automatically redirect
   after 1.5 seconds.
========================================================= */


/* =========================================================
   1. API CONFIGURATION
========================================================= */

const VERIFY_OTP_URL =
    API_ENDPOINT(
        "/api/client-password-reset-otp/verify"
    );


/*
   RESEND OTP:
*/

const RESEND_OTP_URL =
    API_ENDPOINT(
        "/api/client-password-reset-otp/resend"
    );


/* =========================================================
   2. DOM ELEMENTS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
           Get the client email display element.
        */

        const clientEmailDisplay =
            document.getElementById(
                "clientEmailDisplay"
            );


        /*
           Get the OTP form.
        */

        const otpForm =
            document.getElementById(
                "otpForm"
            );


        /*
           Get all six OTP input boxes.
        */

        const otpInputs =
            document.querySelectorAll(
                ".otp-input"
            );


        /*
           Get the verify button.
        */

        const verifyButton =
            document.getElementById(
                "verifyButton"
            );


        /*
           Get the resend OTP link.
        */

        const resendOTP =
            document.getElementById(
                "resendOTP"
            );


        /*
           Get the countdown element.
        */

        const countdown =
            document.getElementById(
                "countdown"
            );


        /*
           Get modal elements.
        */

        const messageModal =
            document.getElementById(
                "messageModal"
            );


        const messageModalTitle =
            document.getElementById(
                "messageModalTitle"
            );


        const messageModalText =
            document.getElementById(
                "messageModalText"
            );


        const modalIcon =
            document.getElementById(
                "modalIcon"
            );


        const closeMessageModal =
            document.getElementById(
                "closeMessageModal"
            );


        const messageModalOverlay =
            document.getElementById(
                "messageModalOverlay"
            );



        /* =================================================
           3. GET CLIENT EMAIL
        ================================================= */

        /*
           The client email must already have been stored
           by the Client Authentication page.

           Example:

               sessionStorage.setItem(
                   "clientEmail",
                   email
               );
        */

        const clientEmail =
            sessionStorage.getItem(
                "clientEmail"
            );


        /*
           If the client email does not exist,
           the user cannot continue with OTP verification.
        */

        if (!clientEmail) {

            showModal(
                "error",
                "Email Required",
                "Your client email could not be found. Please return to the Client Authentication page.",
                true
            );

            return;

        }


        /* =================================================
           4. DISPLAY CLIENT EMAIL
        ================================================= */

        /*
           Display the email that is being used
           for password reset.
        */

        clientEmailDisplay.textContent =
            clientEmail;



        /* =================================================
           5. OTP INPUT HANDLING
        ================================================= */

        /*
           Each OTP box accepts only one digit.

           Example:

               4 | 8 | 2 | 1 | 6 | 9

           The user automatically moves to the
           next input after entering a digit.
        */

        otpInputs.forEach(
            (
                input,
                index
            ) => {


                /* ==========================================
                   ALLOW ONLY NUMBERS
                ========================================== */

                input.addEventListener(
                    "input",
                    () => {

                        /*
                           Remove every character
                           that is not a number.
                        */

                        input.value =
                            input.value.replace(
                                /\D/g,
                                ""
                            );


                        /*
                           Keep only one digit.
                        */

                        input.value =
                            input.value.slice(
                                0,
                                1
                            );


                        /*
                           Move to the next OTP box
                           after entering a digit.
                        */

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



                /* ==========================================
                   HANDLE BACKSPACE
                ========================================== */

                input.addEventListener(
                    "keydown",
                    (
                        event
                    ) => {

                        /*
                           If Backspace is pressed while
                           the current input is empty,
                           move to the previous input.
                        */

                        if (
                            event.key ===
                            "Backspace" &&
                            !input.value &&
                            index > 0
                        ) {

                            otpInputs[
                                index - 1
                            ].focus();

                        }

                    }
                );



                /* ==========================================
                   HANDLE PASTE
                ========================================== */

                input.addEventListener(
                    "paste",
                    (
                        event
                    ) => {

                        /*
                           Prevent the browser's
                           default paste behavior.
                        */

                        event.preventDefault();


                        /*
                           Get the copied text.
                        */

                        const pastedText =
                            (
                                event.clipboardData ||
                                window.clipboardData
                            )
                            .getData("text")
                            .replace(/\D/g, "")
                            .slice(0, 6);


                        /*
                           If the pasted value is empty,
                           do nothing.
                        */

                        if (!pastedText) {

                            return;

                        }


                        /*
                           Place each digit into
                           its own OTP box.
                        */

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


                        /*
                           Focus the final filled input.
                        */

                        const finalIndex =
                            Math.min(
                                pastedText.length,
                                otpInputs.length
                            ) - 1;


                        if (
                            finalIndex >= 0
                        ) {

                            otpInputs[
                                finalIndex
                            ].focus();

                        }

                    }
                );

            }
        );



        /* =================================================
           6. GET COMPLETE OTP
        ================================================= */

        /*
           Combines the six individual OTP inputs.

           Example:

               ["4", "8", "2", "1", "6", "9"]

           becomes:

               "482169"
        */

        function getOTP() {

            return Array
                .from(otpInputs)
                .map(
                    input =>
                        input.value.trim()
                )
                .join("");

        }



        /* =================================================
           7. FRONTEND OTP VALIDATION
        ================================================= */

        function validateOTP(
            otp
        ) {

            /*
               OTP must contain exactly
               six numeric digits.
            */

            return /^\d{6}$/.test(
                otp
            );

        }



        /* =================================================
           8. SHOW MODAL
        ================================================= */

        /*
           This function displays ALL:

           - Error messages
           - Success messages
           - Validation messages
           - Backend responses
        */

        function showModal(
            type,
            title,
            message,
            shouldRedirect = false
        ) {

            /*
               Remove previous modal classes.
            */

            messageModal.classList.remove(
                "success",
                "error"
            );


            /*
               Add the current modal type.
            */

            messageModal.classList.add(
                type
            );


            /*
               Set modal title.
            */

            messageModalTitle.textContent =
                title;


            /*
               Set modal message.
            */

            messageModalText.textContent =
                message;


            /*
               Display appropriate icon.
            */

            if (
                type ===
                "success"
            ) {

                modalIcon.textContent =
                    "✓";

            } else {

                modalIcon.textContent =
                    "!";

            }


            /*
               Make modal visible.
            */

            messageModal.classList.add(
                "show"
            );


            /*
               Accessibility state.
            */

            messageModal.setAttribute(
                "aria-hidden",
                "false"
            );


            /*
               Redirect only when requested.

               The redirect modal remains visible
               for 1.5 seconds.
            */

            if (
                shouldRedirect
            ) {

                setTimeout(
                    () => {

                        window.location.href =
                            "../client-authentication/index.html";

                    },
                    1500
                );

            }

        }



        /* =================================================
           9. CLOSE MODAL
        ================================================= */

        function closeModal() {

            messageModal.classList.remove(
                "show"
            );


            messageModal.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        /*
           Allow the user to manually close
           error and informational modals.
        */

        closeMessageModal.addEventListener(
            "click",
            closeModal
        );


        messageModalOverlay.addEventListener(
            "click",
            closeModal
        );



        /* =================================================
           10. VERIFY BUTTON LOADING STATE
        ================================================= */

        function setVerifyLoading(
            loading
        ) {

            /*
               Prevent duplicate requests.
            */

            verifyButton.disabled =
                loading;


            if (
                loading
            ) {

                verifyButton.innerHTML = `

                    <span
                        class="loading-spinner">
                    </span>

                    <span>
                        Verifying...
                    </span>

                `;

            } else {

                verifyButton.innerHTML = `

                    <span
                        class="btn-text">

                        Verify OTP

                    </span>

                `;

            }

        }



        /* =================================================
           11. RESEND BUTTON LOADING STATE
        ================================================= */

        function setResendLoading(
            loading
        ) {

            /*
               Disable the resend link
               while the request is processing.
            */

            if (
                loading
            ) {

                resendOTP.classList.add(
                    "disabled"
                );

                resendOTP.textContent =
                    "Sending...";

            } else {

                resendOTP.textContent =
                    "Resend OTP";

            }

        }



        /* =================================================
           12. VERIFY PASSWORD RESET OTP
        ================================================= */

        otpForm.addEventListener(
            "submit",
            async (
                event
            ) => {

                /*
                   Prevent normal form submission.
                */

                event.preventDefault();


                /* ==========================================
                   GET OTP
                ========================================== */

                const otp =
                    getOTP();



                /* ==========================================
                   FRONTEND VALIDATION
                ========================================== */

                /*
                   Check whether all six digits
                   have been entered.
                */

                if (
                    !validateOTP(
                        otp
                    )
                ) {

                    showModal(
                        "error",
                        "Invalid OTP",
                        "Please enter the complete 6-digit password reset code."
                    );

                    return;

                }



                /* ==========================================
                   START LOADING
                ========================================== */

                setVerifyLoading(
                    true
                );


                try {


                    /* ======================================
                       SEND OTP TO BACKEND
                    ====================================== */

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

                                        clientEmail:
                                            clientEmail,

                                        otp:
                                            otp

                                    })

                            }
                        );


                    /* ======================================
                       READ BACKEND RESPONSE
                    ====================================== */

                    const data =
                        await response.json();



                    /* ======================================
                       HANDLE BACKEND ERROR
                    ====================================== */

                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        showModal(
                            "error",
                            "Verification Failed",
                            data.message ||
                            "The password reset code could not be verified."
                        );

                        return;

                    }



                    /* ======================================
                       CHECK RESET AUTHORIZATION
                    ====================================== */

                    if (
                        !data.resetAuthorization
                    ) {

                        showModal(
                            "error",
                            "Verification Failed",
                            "Password reset authorization was not returned by the server."
                        );

                        return;

                    }



                    /* ======================================
                       SAVE RESET AUTHORIZATION
                    ====================================== */

                    /*
                       Save the authorization in sessionStorage.

                       It will be used by:

                           client-password-change
                    */

                    sessionStorage.setItem(
                        "resetAuthorization",
                        data.resetAuthorization
                    );



                    /*
                       Keep the client email available
                       for the next page.
                    */

                    sessionStorage.setItem(
                        "clientEmail",
                        clientEmail
                    );



                    /* ======================================
                       SUCCESS MODAL
                    ====================================== */

                    showModal(
                        "success",
                        "OTP Verified",
                        data.message ||
                        "Your password reset code has been verified successfully."
                    );



                    /* ======================================
                       REDIRECT AFTER SUCCESS
                    ====================================== */

                    setTimeout(
                        () => {

                            window.location.href =
                                "../client-password-change/index.html";

                        },
                        1500
                    );


                }

                catch (
                    error
                ) {

                    /*
                       Handles network errors,
                       server connection errors,
                       and unexpected errors.
                    */

                    console.error(
                        "Client password reset OTP verification error:",
                        error
                    );


                    showModal(
                        "error",
                        "Connection Error",
                        "Unable to connect to the SkillConnect server. Please try again."
                    );

                }

                finally {

                    /*
                       Stop the loading state.
                    */

                    setVerifyLoading(
                        false
                    );

                }

            }
        );



        /* =================================================
           13. RESEND COUNTDOWN VARIABLES
        ================================================= */

        let countdownTimer =
            null;


        let countdownSeconds =
            0;



        /* =================================================
           14. START RESEND COUNTDOWN
        ================================================= */

        function startCountdown() {

            /*
               Clear an existing countdown.
            */

            if (
                countdownTimer
            ) {

                clearInterval(
                    countdownTimer
                );

            }


            /*
               Start at 60 seconds.
            */

            countdownSeconds =
                60;


            /*
               Disable resend.
            */

            resendOTP.classList.add(
                "disabled"
            );


            /*
               Display initial countdown.
            */

            countdown.textContent =
                `Resend available in ${countdownSeconds}s`;



            /*
               Start one-second interval.
            */

            countdownTimer =
                setInterval(
                    () => {

                        countdownSeconds--;


                        /*
                           Continue displaying
                           the remaining time.
                        */

                        if (
                            countdownSeconds > 0
                        ) {

                            countdown.textContent =
                                `Resend available in ${countdownSeconds}s`;

                            return;

                        }


                        /*
                           Countdown finished.
                        */

                        clearInterval(
                            countdownTimer
                        );


                        countdownTimer =
                            null;


                        /*
                           Enable resend again.
                        */

                        resendOTP.classList.remove(
                            "disabled"
                        );


                        /*
                           Update countdown message.
                        */

                        countdown.textContent =
                            "You can resend the OTP now.";

                    },
                    1000
                );

        }



        /* =================================================
           15. RESEND PASSWORD RESET OTP
        ================================================= */

        resendOTP.addEventListener(
            "click",
            async (
                event
            ) => {

                /*
                   Prevent the "#" link
                   from changing the page.
                */

                event.preventDefault();


                /*
                   Check whether the resend link
                   is currently disabled.
                */

                if (
                    resendOTP.classList.contains(
                        "disabled"
                    )
                ) {

                    return;

                }



                /* ==========================================
                   CHECK CLIENT EMAIL
                ========================================== */

                /*
                   Read the latest value from sessionStorage.

                   This makes sure the resend flow does not
                   rely only on the value captured when the
                   page first loaded.
                */

                const storedClientEmail =
                    sessionStorage.getItem(
                        "clientEmail"
                    );


                /*
                   If email is missing,
                   show an error modal and redirect.
                */

                if (
                    !storedClientEmail
                ) {

                    showModal(
                        "error",
                        "Email Required",
                        "Your client email could not be found. Please return to the Client Authentication page.",
                        true
                    );

                    return;

                }



                /* ==========================================
                   START RESEND LOADING
                ========================================== */

                setResendLoading(
                    true
                );


                try {


                    /* ======================================
                       SEND EMAIL TO BACKEND
                    ====================================== */

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

                                        clientEmail:
                                            storedClientEmail

                                    })

                            }
                        );


                    /* ======================================
                       READ RESPONSE
                    ====================================== */

                    const data =
                        await response.json();



                    /* ======================================
                       HANDLE RESPONSE
                    ====================================== */

                    /*
                       IMPORTANT:

                       The backend may return a generic
                       success response even when the client
                       does not exist.

                       This prevents account enumeration.

                       Therefore, a successful response here
                       means:

                           "The resend request was processed."

                       The frontend does not reveal whether
                       the email exists.
                    */

                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        showModal(
                            "error",
                            "Resend Failed",
                            data.message ||
                            "The password reset code could not be resent."
                        );

                        return;

                    }



                    /* ======================================
                       SUCCESS MODAL
                    ====================================== */

                    showModal(
                        "success",
                        "OTP Sent",
                        data.message ||
                        "A new password reset code has been sent to your email address."
                    );



                    /* ======================================
                       CLEAR OLD OTP
                    ====================================== */

                    /*
                       Remove the old OTP from the input boxes
                       so the client enters the newly received OTP.
                    */

                    otpInputs.forEach(
                        input => {

                            input.value =
                                "";

                        }
                    );


                    /*
                       Focus the first OTP box.
                    */

                    otpInputs[
                        0
                    ].focus();



                    /* ======================================
                       START 60-SECOND COUNTDOWN
                    ====================================== */

                    startCountdown();


                }

                catch (
                    error
                ) {

                    /*
                       Handle network/server errors.
                    */

                    console.error(
                        "Client password reset OTP resend error:",
                        error
                    );


                    showModal(
                        "error",
                        "Connection Error",
                        "Unable to connect to the SkillConnect server. Please try again."
                    );

                }

                finally {

                    /*
                       Restore resend button text.

                       If countdown is active, the CSS class
                       will keep the link disabled.
                    */

                    if (
                        !resendOTP.classList.contains(
                            "disabled"
                        )
                    ) {

                        setResendLoading(
                            false
                        );

                    } else {

                        resendOTP.textContent =
                            "Resend OTP";

                    }

                }

            }
        );



        /* =================================================
           16. INITIAL COUNTDOWN
        ================================================= */

        /*
           Start the 60-second countdown when the page
           opens.

           This prevents the client from immediately
           requesting multiple OTP emails after arriving
           on the page.
        */

        startCountdown();



        /* =================================================
           17. FOCUS FIRST OTP INPUT
        ================================================= */

        /*
           Automatically place the cursor in the
           first OTP box.
        */

        if (
            otpInputs.length > 0
        ) {

            otpInputs[
                0
            ].focus();

        }

    }
);