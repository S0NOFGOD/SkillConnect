/* =========================================================
   2. WAIT FOR HTML DOCUMENT TO LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       3. GET FORM ELEMENTS
    ===================================================== */

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

    const strengthText =
        document.getElementById("strengthText");

    const requirementLength =
        document.getElementById("requirementLength");

    const changePasswordBtn =
        document.getElementById("changePasswordBtn");

    const buttonText =
        document.getElementById("buttonText");

    const buttonLoader =
        document.getElementById("buttonLoader");


    /* =====================================================
       4. GET MODAL ELEMENTS
    ===================================================== */

    const authModal =
        document.getElementById("authModal");

    const modal =
        authModal.querySelector(".message-modal-content");

    const modalIcon =
        document.getElementById("modalIcon");

    const modalTitle =
        document.getElementById("modalTitle");

    const modalMessage =
        document.getElementById("modalMessage");

    const modalCloseBtn =
        document.getElementById("modalCloseBtn");


    /* =====================================================
       5. GET PASSWORD RESET SESSION INFORMATION
    ===================================================== */

    /*
       workerEmail identifies the worker.

       resetAuthorization proves that the worker
       successfully completed the password-reset OTP
       verification process.
    */

    const workerEmail =
        sessionStorage.getItem("workerEmail");

    const resetAuthorization =
        sessionStorage.getItem("resetAuthorization");


    /* =====================================================
       6. REDIRECT TO WORKER AUTHENTICATION
    ===================================================== */

    function redirectToWorkerAuthentication() {

        window.location.href =
            "../worker-authentication/index.html";

    }


    /* =====================================================
       7. CLOSE MODAL
    ===================================================== */

    function closeModal() {

        authModal.classList.remove("show");

        authModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    /* =====================================================
       8. SHOW MODAL
    ===================================================== */

    /*
       All authentication messages use this function.

       type:
       - success
       - error

       onClose:
       Optional function that runs after the worker
       closes the modal.
    */

    function showModal(
        type,
        title,
        message,
        onClose = null
    ) {

        /* -----------------------------------------------
           Set modal type
        ------------------------------------------------ */

        modal.classList.remove(
            "success",
            "error"
        );

        modal.classList.add(type);


        /* -----------------------------------------------
           Set modal content
        ------------------------------------------------ */

        modalTitle.textContent =
            title;

        modalMessage.textContent =
            message;


        /* -----------------------------------------------
           Set modal icon
        ------------------------------------------------ */

        if (type === "success") {

            modalIcon.textContent =
                "✓";

        } else {

            modalIcon.textContent =
                "!";

        }


        /* -----------------------------------------------
           Show modal
        ------------------------------------------------ */

        authModal.classList.add("show");

        authModal.setAttribute(
            "aria-hidden",
            "false"
        );


        /* -----------------------------------------------
           Focus modal button
        ------------------------------------------------ */

        modalCloseBtn.focus();


        /* -----------------------------------------------
           Store close callback
        ------------------------------------------------ */

        modalCloseBtn.dataset.hasCallback =
            onClose ? "true" : "false";


        modalCloseBtn._onClose =
            onClose;

    }


    /* =====================================================
       9. MODAL CLOSE BUTTON
    ===================================================== */

    modalCloseBtn.addEventListener(
        "click",
        () => {

            const callback =
                modalCloseBtn._onClose;

            closeModal();


            /*
               Run the callback only after the worker
               closes the modal.
            */

            if (callback) {

                modalCloseBtn._onClose =
                    null;

                callback();

            }

        }
    );


    /* =====================================================
       10. CLOSE MODAL WHEN CLICKING OUTSIDE
    ===================================================== */

    authModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                authModal
            ) {

                closeModal();

            }

        }
    );


    /* =====================================================
       11. ESCAPE KEY CLOSES MODAL
    ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                authModal.classList.contains("show")
            ) {

                closeModal();

            }

        }
    );


    /* =====================================================
       12. CHECK RESET SESSION
    ===================================================== */

    /*
       The password-change page requires BOTH:

       workerEmail
       AND
       resetAuthorization

       Without both values, the page cannot continue.
    */

    if (
        !workerEmail ||
        !resetAuthorization
    ) {

        showModal(
            "error",
            "Reset Session Required",
            "Your password reset session is missing or expired. Please restart the password reset process.",
            redirectToWorkerAuthentication
        );

        return;

    }


    /* =====================================================
       13. PASSWORD VISIBILITY TOGGLE
    ===================================================== */

    passwordToggle.addEventListener(
        "click",
        () => {

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

            } else {

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


    /* =====================================================
       14. CONFIRM PASSWORD VISIBILITY TOGGLE
    ===================================================== */

    confirmToggle.addEventListener(
        "click",
        () => {

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

            } else {

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


    /* =====================================================
       15. CHECK PASSWORD LENGTH
    ===================================================== */

    function checkPasswordLength(password) {

        return password.length >= 8;

    }


    /* =====================================================
       16. UPDATE PASSWORD REQUIREMENT
    ===================================================== */

    function updatePasswordRequirement(password) {

        if (
            checkPasswordLength(password)
        ) {

            requirementLength.classList.add(
                "valid"
            );

        } else {

            requirementLength.classList.remove(
                "valid"
            );

        }

    }


    /* =====================================================
       17. WATCH PASSWORD WHILE TYPING
    ===================================================== */

    passwordInput.addEventListener(
        "input",
        () => {

            const password =
                passwordInput.value;

            updatePasswordRequirement(
                password
            );

        }
    );


    /* =====================================================
       18. LOADING STATE
    ===================================================== */

    function setLoadingState(isLoading) {

        if (isLoading) {

            buttonText.hidden =
                true;

            buttonLoader.hidden =
                false;

            changePasswordBtn.disabled =
                true;

            passwordInput.disabled =
                true;

            confirmPasswordInput.disabled =
                true;

        } else {

            buttonText.hidden =
                false;

            buttonLoader.hidden =
                true;

            changePasswordBtn.disabled =
                false;

            passwordInput.disabled =
                false;

            confirmPasswordInput.disabled =
                false;

        }

    }


    /* =====================================================
       19. PASSWORD CHANGE FORM SUBMISSION
    ===================================================== */

    resetForm.addEventListener(
        "submit",
        async (event) => {

            /* ---------------------------------------------
               Prevent page refresh
            --------------------------------------------- */

            event.preventDefault();


            /* =============================================
               20. GET PASSWORD VALUES
            ============================================= */

            /*
               IMPORTANT:

               Do NOT use .trim() on passwords.

               Spaces can legitimately be part of a password.
            */

            const newPassword =
                passwordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            /* =============================================
               21. CHECK NEW PASSWORD IS NOT EMPTY
            ============================================= */

            if (!newPassword) {

                showModal(
                    "error",
                    "Password Required",
                    "Please enter a new password."
                );

                return;

            }


            /* =============================================
               22. CHECK PASSWORD REQUIREMENT
            ============================================= */

            /*
               Password requirement:

               Minimum 8 characters.

               There is NO:
               - 150-word limit
               - 1500-character limit
               - uppercase requirement
               - lowercase requirement
               - number requirement
               - special-character requirement
            */

            if (
                !checkPasswordLength(
                    newPassword
                )
            ) {

                showModal(
                    "error",
                    "Password Too Short",
                    "Your password must contain at least 8 characters."
                );

                return;

            }


            /* =============================================
               23. CHECK CONFIRM PASSWORD
            ============================================= */

            if (!confirmPassword) {

                showModal(
                    "error",
                    "Confirmation Required",
                    "Please confirm your new password."
                );

                return;

            }


            /* =============================================
               24. CHECK PASSWORD MATCH
            ============================================= */

            if (
                newPassword !==
                confirmPassword
            ) {

                showModal(
                    "error",
                    "Passwords Do Not Match",
                    "The new password and confirmation password must be the same."
                );

                return;

            }


            /* =============================================
               25. START LOADING
            ============================================= */

            setLoadingState(true);


            try {


                /* =========================================
                   26. SEND PASSWORD CHANGE REQUEST
                ========================================= */

                const response =
                    await fetch(
                        API_ENDPOINT("/api/worker-password-change"),
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                email:
                                    workerEmail,

                                resetAuthorization:
                                    resetAuthorization,

                                newPassword:
                                    newPassword

                            })

                        }
                    );


                /* =========================================
                   27. READ BACKEND RESPONSE
                ========================================= */

                const data =
                    await response.json();


                /* =========================================
                   28. HANDLE BACKEND ERROR
                ========================================= */

                if (!response.ok) {

                    showModal(
                        "error",
                        "Password Change Failed",
                        data.message ||
                        "Unable to change your password. Please try again."
                    );

                    return;

                }


                /* =========================================
                   29. PASSWORD CHANGE SUCCESS
                ========================================= */

                showModal(
                    "success",
                    "Password Changed",
                    data.message ||
                    "Your password has been changed successfully. You can now log in with your new password."
                );


                /* =========================================
                   30. REDIRECT AFTER SUCCESS
                ========================================= */

                setTimeout(
                    () => {

                        /*
                           Clear the temporary password-reset
                           session information.
                        */

                        sessionStorage.removeItem(
                            "workerEmail"
                        );

                        sessionStorage.removeItem(
                            "resetAuthorization"
                        );


                        /*
                           Return to worker login.
                        */

                        redirectToWorkerAuthentication();

                    },
                    2000
                );


            } catch (error) {


                /* =========================================
                   31. NETWORK ERROR
                ========================================= */

                console.error(
                    "Worker password change error:",
                    error
                );


                showModal(
                    "error",
                    "Connection Error",
                    "Unable to connect to the server. Please check your internet connection and try again."
                );


            } finally {


                /* =========================================
                   32. STOP LOADING
                ========================================= */

                setLoadingState(false);

            }

        }
    );


});