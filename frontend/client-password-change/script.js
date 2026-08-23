/* =========================================================
   2. CLIENT PASSWORD FORM ELEMENTS
========================================================= */

const resetForm =
    document.getElementById("resetForm");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const passwordToggle =
    document.getElementById("passwordToggle");

const confirmToggle =
    document.getElementById("confirmToggle");

const changePasswordBtn =
    document.getElementById("changePasswordBtn");

const buttonText =
    document.getElementById("buttonText");

const buttonLoader =
    document.getElementById("buttonLoader");


/* =========================================================
   3. MESSAGE MODAL ELEMENTS
========================================================= */

const authModal =
    document.getElementById("authModal");

const modalCloseBtn =
    document.getElementById("modalCloseBtn");

const modalIcon =
    document.getElementById("modalIcon");

const modalTitle =
    document.getElementById("modalTitle");

const modalMessage =
    document.getElementById("modalMessage");


/* =========================================================
   4. CLIENT AUTHENTICATION PAGE
========================================================= */

/*
   Every authentication failure that requires
   leaving this page goes back here.
*/

const CLIENT_AUTH_URL =
    "../client-authentication/index.html";


/* =========================================================
   5. RESET SESSION VARIABLES
========================================================= */

let clientEmail = null;

let resetAuthorization = null;


/* =========================================================
   6. MODAL STATE
========================================================= */

/*
   Determines whether the current modal should
   redirect after the user closes it.

   This is mainly used for:

   - Missing clientEmail
   - Missing resetAuthorization
*/

let redirectAfterManualClose = false;


/*
   Determines whether the current modal is a
   success modal that automatically redirects.

   Success modals use the required 1.5-second timer.
*/

let automaticRedirectActive = false;


/*
   Stores the success redirect timer.
*/

let redirectTimer = null;


/* =========================================================
   7. SHOW MODAL
========================================================= */

/*
   Displays an authentication message.

   TYPE:

   error
   success
   warning

   REDIRECT AFTER DELAY:

   true
   → automatically redirect after 1.5 seconds

   false
   → user must manually close the modal
*/

function showModal(
    title,
    message,
    type = "error",
    redirectAfterDelay = false
) {

    /* -----------------------------------------------
       Cancel any previous redirect timer.
    ----------------------------------------------- */

    if (redirectTimer) {

        clearTimeout(
            redirectTimer
        );

        redirectTimer = null;

    }


    /* -----------------------------------------------
       Reset modal state.
    ----------------------------------------------- */

    redirectAfterManualClose =
        false;

    automaticRedirectActive =
        false;


    /* -----------------------------------------------
       Set modal title.
    ----------------------------------------------- */

    modalTitle.textContent =
        title;


    /* -----------------------------------------------
       Set modal message.
    ----------------------------------------------- */

    modalMessage.textContent =
        message;


    /* -----------------------------------------------
       Set modal icon.
    ----------------------------------------------- */

    if (type === "success") {

        modalIcon.textContent =
            "✓";

    }

    else {

        modalIcon.textContent =
            "!";

    }


    /* -----------------------------------------------
       Remove previous modal type classes.
    ----------------------------------------------- */

    authModal.classList.remove(
        "success",
        "warning"
    );


    /* -----------------------------------------------
       Add current modal type.
    ----------------------------------------------- */

    if (
        type === "success" ||
        type === "warning"
    ) {

        authModal.classList.add(
            type
        );

    }


    /* -----------------------------------------------
       Show modal.
    ----------------------------------------------- */

    authModal.classList.add(
        "show"
    );

    authModal.setAttribute(
        "aria-hidden",
        "false"
    );


    /* -----------------------------------------------
       Handle automatic redirect.
    ----------------------------------------------- */

    if (redirectAfterDelay) {

        automaticRedirectActive =
            true;


        /*
           Success modal stays visible for exactly
           1.5 seconds before redirecting.
        */

        redirectTimer =
            setTimeout(
                function () {

                    window.location.href =
                        CLIENT_AUTH_URL;

                },
                1500
            );

    }

}


/* =========================================================
   8. SHOW SESSION ERROR
========================================================= */

/*
   Used when the client reaches this page without
   the required password-reset session.

   The user must close the error modal manually.

   Only AFTER the user closes it do we redirect.
*/

function showSessionError(
    title,
    message
) {

    redirectAfterManualClose =
        true;


    showModal(
        title,
        message,
        "error",
        false
    );

}


/* =========================================================
   9. CLOSE MODAL
========================================================= */

/*
   There is intentionally ONLY ONE close handler.

   RULES:

   1. Success modal:
      Do nothing.
      The 1.5-second redirect must continue.

   2. Normal error:
      Close the modal.

   3. Missing-session error:
      Close the modal.
      Then redirect to authentication.
*/

function closeModal() {

    /* -----------------------------------------------
       Do not manually close success redirect modal.
    ----------------------------------------------- */

    if (
        automaticRedirectActive
    ) {

        return;

    }


    /* -----------------------------------------------
       Hide modal.
    ----------------------------------------------- */

    authModal.classList.remove(
        "show"
    );

    authModal.setAttribute(
        "aria-hidden",
        "true"
    );


    /* -----------------------------------------------
       Redirect after missing-session error.
    ----------------------------------------------- */

    if (
        redirectAfterManualClose
    ) {

        redirectAfterManualClose =
            false;


        window.location.href =
            CLIENT_AUTH_URL;

    }

}


/* =========================================================
   10. MODAL CLOSE BUTTON
========================================================= */

/*
   The close button uses the single closeModal()
   function above.

   No second listener is created.
*/

modalCloseBtn.addEventListener(
    "click",
    closeModal
);


/* =========================================================
   11. PASSWORD VISIBILITY TOGGLE
========================================================= */

/*
   Shows or hides the new password.
*/

passwordToggle.addEventListener(
    "click",
    function () {

        if (
            passwordInput.type ===
            "password"
        ) {

            passwordInput.type =
                "text";

            passwordToggle.textContent =
                "🙈";

            passwordToggle.setAttribute(
                "aria-label",
                "Hide password"
            );

        }

        else {

            passwordInput.type =
                "password";

            passwordToggle.textContent =
                "👁";

            passwordToggle.setAttribute(
                "aria-label",
                "Show password"
            );

        }

    }
);


/* =========================================================
   12. CONFIRM PASSWORD VISIBILITY TOGGLE
========================================================= */

/*
   Shows or hides the confirmation password.
*/

confirmToggle.addEventListener(
    "click",
    function () {

        if (
            confirmPasswordInput.type ===
            "password"
        ) {

            confirmPasswordInput.type =
                "text";

            confirmToggle.textContent =
                "🙈";

            confirmToggle.setAttribute(
                "aria-label",
                "Hide confirm password"
            );

        }

        else {

            confirmPasswordInput.type =
                "password";

            confirmToggle.textContent =
                "👁";

            confirmToggle.setAttribute(
                "aria-label",
                "Show confirm password"
            );

        }

    }
);


/* =========================================================
   13. PASSWORD REQUIREMENT VALIDATION
========================================================= */

function isValidPassword(
    password
) {

    return password.length >= 8;

}

/* =========================================================
   14. PASSWORD REQUIREMENT MESSAGE
========================================================= */

function getPasswordRequirementMessage() {

    return (
        "Password must be at least 8 characters. "
    );

}


/* =========================================================
   15. CLEAR INPUT VALIDATION STATES
========================================================= */

function clearInputStates() {

    passwordInput.classList.remove(
        "input-error",
        "input-success"
    );

    confirmPasswordInput.classList.remove(
        "input-error",
        "input-success"
    );

}


/* =========================================================
   16. VALIDATE NEW PASSWORD
========================================================= */

function validatePasswordField() {

    const password =
        passwordInput.value.trim();


    /* -----------------------------------------------
       Password cannot be empty.
    ----------------------------------------------- */

    if (!password) {

        passwordInput.classList.add(
            "input-error"
        );


        return {

            valid: false,

            message:
                "Please enter your new password."

        };

    }


    /* -----------------------------------------------
       Password must meet requirements.
    ----------------------------------------------- */

    if (
        !isValidPassword(
            password
        )
    ) {

        passwordInput.classList.add(
            "input-error"
        );


        return {

            valid: false,

            message:
                getPasswordRequirementMessage()

        };

    }


    /* -----------------------------------------------
       Password passed validation.
    ----------------------------------------------- */

    passwordInput.classList.add(
        "input-success"
    );


    return {

        valid: true

    };

}


/* =========================================================
   17. VALIDATE CONFIRM PASSWORD
========================================================= */

function validateConfirmPassword() {

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;


    /* -----------------------------------------------
       Confirmation cannot be empty.
    ----------------------------------------------- */

    if (!confirmPassword) {

        confirmPasswordInput.classList.add(
            "input-error"
        );


        return {

            valid: false,

            message:
                "Please confirm your new password."

        };

    }


    /* -----------------------------------------------
       Passwords must match.
    ----------------------------------------------- */

    if (
        password !==
        confirmPassword
    ) {

        confirmPasswordInput.classList.add(
            "input-error"
        );


        return {

            valid: false,

            message:
                "Your passwords do not match."

        };

    }


    /* -----------------------------------------------
       Confirmation passed validation.
    ----------------------------------------------- */

    confirmPasswordInput.classList.add(
        "input-success"
    );


    return {

        valid: true

    };

}


/* =========================================================
   18. LOADING STATE
========================================================= */

/*
   Prevents the client from submitting the form
   more than once while the backend is processing.
*/

function setLoadingState(
    isLoading
) {

    if (isLoading) {

        /* Disable button */

        changePasswordBtn.disabled =
            true;


        /* Hide normal button text */

        buttonText.hidden =
            true;


        /* Show loading animation */

        buttonLoader.hidden =
            false;

    }

    else {

        /* Enable button */

        changePasswordBtn.disabled =
            false;


        /* Show normal button text */

        buttonText.hidden =
            false;


        /* Hide loading animation */

        buttonLoader.hidden =
            true;

    }

}


/* =========================================================
   19. SUBMIT PASSWORD CHANGE
========================================================= */

resetForm.addEventListener(
    "submit",
    async function (event) {

        /* -----------------------------------------------
           Stop normal HTML form submission.
        ----------------------------------------------- */

        event.preventDefault();


        /* -----------------------------------------------
           Prevent duplicate requests.
        ----------------------------------------------- */

        if (
            changePasswordBtn.disabled
        ) {

            return;

        }


        /* -----------------------------------------------
           Clear previous validation styles.
        ----------------------------------------------- */

        clearInputStates();


        /* ===============================================
           FRONTEND VALIDATION
        =============================================== */

        const passwordResult =
            validatePasswordField();


        /* -----------------------------------------------
           Password validation failed.
        ----------------------------------------------- */

        if (
            !passwordResult.valid
        ) {

            showModal(
                "Invalid Password",
                passwordResult.message,
                "error"
            );

            return;

        }


        /* -----------------------------------------------
           Confirm-password validation.
        ----------------------------------------------- */

        const confirmResult =
            validateConfirmPassword();


        /* -----------------------------------------------
           Confirmation failed.
        ----------------------------------------------- */

        if (
            !confirmResult.valid
        ) {

            showModal(
                "Password Mismatch",
                confirmResult.message,
                "error"
            );

            return;

        }


        /* ===============================================
           READ RESET SESSION
        =============================================== */

        clientEmail =
            sessionStorage.getItem(
                "clientEmail"
            );

        resetAuthorization =
            sessionStorage.getItem(
                "resetAuthorization"
            );


        /* -----------------------------------------------
           Make sure session still exists.
        ----------------------------------------------- */

        if (
            !clientEmail ||
            !resetAuthorization
        ) {

            showSessionError(
                "Reset Session Expired",
                "Your password reset session is no longer available. Please start the password reset process again."
            );

            return;

        }


        /* ===============================================
           GET NEW PASSWORD
        =============================================== */

        const password =
            passwordInput.value;


        /* ===============================================
           START LOADING
        =============================================== */

        setLoadingState(
            true
        );


        try {

            /* =========================================
               SEND REQUEST TO EXPRESS BACKEND
            ========================================= */

            const response =
                await fetch(
                    API_ENDPOINT("/api/client-password-change"), {

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

                                resetAuthorization:
                                    resetAuthorization,

                                password:
                                    password

                            })

                    }
                );


            /* =========================================
               PARSE BACKEND RESPONSE
            ========================================= */

            let data;


            try {

                data =
                    await response.json();

            }

            catch (jsonError) {

                data = {

                    success: false,

                    message:
                        "The server returned an invalid response."

                };

            }


            /* =========================================
               BACKEND HTTP ERROR
            ========================================= */

            if (
                !response.ok
            ) {

                showModal(
                    "Password Change Failed",
                    data.message ||
                        "Unable to change your password. Please try again.",
                    "error"
                );

                return;

            }


            /* =========================================
               BACKEND APPLICATION ERROR
            ========================================= */

            if (
                data.success === false
            ) {

                showModal(
                    "Password Change Failed",
                    data.message ||
                        "Unable to change your password. Please try again.",
                    "error"
                );

                return;

            }


            /* =========================================
               SUCCESS
            ========================================= */

            /*
               The backend has successfully changed
               the password.

               Clear the frontend reset session.
            */

            sessionStorage.removeItem(
                "clientEmail"
            );

            sessionStorage.removeItem(
                "resetAuthorization"
            );


            /* -----------------------------------------------
               Clear form.
            ----------------------------------------------- */

            resetForm.reset();


            clearInputStates();


            /* =========================================
               SUCCESS MODAL
            ========================================= */

            showModal(
                "Password Changed",
                data.message ||
                    "Your password has been changed successfully. You can now log in with your new password.",
                "success",
                true
            );

        }

        catch (error) {

            /* =========================================
               NETWORK ERROR
            ========================================= */

            console.error(
                "Client password change error:",
                error
            );


            showModal(
                "Connection Error",
                "Unable to connect to the server. Please check your connection and try again.",
                "error"
            );

        }

        finally {

            /* =========================================
               STOP LOADING
            ========================================= */

            setLoadingState(
                false
            );

        }

    }
);


/* =========================================================
   20. LIVE PASSWORD VALIDATION
========================================================= */

passwordInput.addEventListener(
    "input",
    function () {

        /* Remove old error state */

        passwordInput.classList.remove(
            "input-error"
        );


        /* Check current password */

        if (
            isValidPassword(
                passwordInput.value
            )
        ) {

            passwordInput.classList.add(
                "input-success"
            );

        }

        else {

            passwordInput.classList.remove(
                "input-success"
            );

        }

    }
);


/* =========================================================
   21. LIVE CONFIRM-PASSWORD VALIDATION
========================================================= */

confirmPasswordInput.addEventListener(
    "input",
    function () {

        /* Remove old error state */

        confirmPasswordInput.classList.remove(
            "input-error"
        );


        /* Check whether passwords match */

        if (
            confirmPasswordInput.value &&
            confirmPasswordInput.value ===
                passwordInput.value
        ) {

            confirmPasswordInput.classList.add(
                "input-success"
            );

        }

        else {

            confirmPasswordInput.classList.remove(
                "input-success"
            );

        }

    }
);


/* =========================================================
   22. PAGE INITIALIZATION
========================================================= */

/*
   The page checks sessionStorage as soon as the
   JavaScript file loads.

   Required values:

       clientEmail
       resetAuthorization

   Missing either one means the password-change
   page cannot be used.
*/

function initializePage() {

    /* -----------------------------------------------
       Read client email.
    ----------------------------------------------- */

    clientEmail =
        sessionStorage.getItem(
            "clientEmail"
        );


    /* -----------------------------------------------
       Read reset authorization.
    ----------------------------------------------- */

    resetAuthorization =
        sessionStorage.getItem(
            "resetAuthorization"
        );


    /* -----------------------------------------------
       Missing client email.
    ----------------------------------------------- */

    if (!clientEmail) {

        showSessionError(
            "Reset Session Missing",
            "Your password reset session is missing. Please start the password reset process again."
        );

        return;

    }


    /* -----------------------------------------------
       Missing reset authorization.
    ----------------------------------------------- */

    if (!resetAuthorization) {

        showSessionError(
            "Reset Authorization Missing",
            "Your password reset authorization is missing. Please start the password reset process again."
        );

        return;

    }


    /* -----------------------------------------------
       Reset session exists.
    ----------------------------------------------- */

    console.log(
        "Client password-change session loaded successfully."
    );

}


/* =========================================================
   23. INITIALIZE APPLICATION
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePage
    );

}

else {

    initializePage();

}


/* =========================================================
   END OF CLIENT PASSWORD CHANGE JAVASCRIPT
========================================================= */