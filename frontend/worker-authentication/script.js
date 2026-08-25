/* =========================================================
   2. PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /*
       Start all authentication functionality
       after the HTML has completely loaded.
    */

    initializeTabs();

    initializePasswordToggles();

    initializeForgotPassword();

    initializeNotificationModal();

    initializeLoginForm();

    initializeSignupForm();

});



/* =========================================================
   3. DOM HELPER
========================================================= */

/*
   Small helper function for finding elements.

   Example:

   const button = getElement("loginButton");
*/

function getElement(id) {

    return document.getElementById(id);

}



/* =========================================================
   4. AUTHENTICATION TABS
========================================================= */

function initializeTabs() {

    /*
       Get all authentication tabs.
    */

    const tabs = document.querySelectorAll(".tab");


    /*
       Get all authentication form sections.
    */

    const formSections =
        document.querySelectorAll(".form-section");


    /*
       Add click event to every tab.
    */

    tabs.forEach(tab => {

        tab.addEventListener("click", () => {

            /*
               Get the form section connected
               to this tab.

               Example:

               data-tab="login"

               connects to:

               id="login"
            */

            const targetTab =
                tab.dataset.tab;


            /*
               Remove active state from
               every tab.
            */

            tabs.forEach(item => {

                item.classList.remove("active");

            });


            /*
               Remove active state from
               every form section.
            */

            formSections.forEach(section => {

                section.classList.remove("active");

            });


            /*
               Activate the clicked tab.
            */

            tab.classList.add("active");


            /*
               Activate the matching form.
            */

            const targetSection =
                getElement(targetTab);


            if (targetSection) {

                targetSection.classList.add("active");

            }

        });

    });

}



/* =========================================================
   5. PASSWORD TOGGLES
========================================================= */

/*
   Every password field has its own toggle.

   Login:
   loginPassword

   Signup:
   signupPassword

   Confirm:
   confirmPassword
*/

function initializePasswordToggles() {

    setupPasswordToggle(
        "loginPassword",
        "toggleLoginPassword"
    );


    setupPasswordToggle(
        "signupPassword",
        "toggleSignupPassword"
    );


    setupPasswordToggle(
        "confirmPassword",
        "toggleConfirmPassword"
    );

}



/* =========================================================
   6. PASSWORD TOGGLE HELPER
========================================================= */

function setupPasswordToggle(
    passwordId,
    toggleId
) {

    const passwordInput =
        getElement(passwordId);


    const toggleButton =
        getElement(toggleId);


    /*
       Stop if either element does not exist.
    */

    if (!passwordInput || !toggleButton) {

        return;

    }


    /*
       When the eye button is clicked,
       switch between password and text.
    */

    toggleButton.addEventListener("click", () => {

        const isPassword =
            passwordInput.type === "password";


        /*
           Show password.
        */

        if (isPassword) {

            passwordInput.type = "text";

            toggleButton.textContent = "🙈";

            toggleButton.setAttribute(
                "aria-label",
                "Hide password"
            );

            toggleButton.setAttribute(
                "aria-pressed",
                "true"
            );

        }

        /*
           Hide password.
        */

        else {

            passwordInput.type = "password";

            toggleButton.textContent = "👁";

            toggleButton.setAttribute(
                "aria-label",
                "Show password"
            );

            toggleButton.setAttribute(
                "aria-pressed",
                "false"
            );

        }

    });

}



/* =========================================================
   7. EMAIL VALIDATION
========================================================= */

function isValidEmail(email) {

    /*
       Basic email validation.

       Example of valid email:

       user@example.com
    */

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    return emailPattern.test(email);

}


/* =========================================================
   9. LOADING STATE
========================================================= */

/*
   This function changes a button into a loading state.

   Example:

   Login
       ↓
   Spinner + Processing...
*/

function setLoading(
    button,
    isLoading,
    loadingText
) {

    if (!button) {

        return;

    }


    const buttonText =
        button.querySelector(".btn-text");


    if (isLoading) {

        /*
           Disable the button so the user
           cannot submit the form repeatedly.
        */

        button.disabled = true;


        button.classList.add("btn-loading");


        /*
           Replace button text with spinner.
        */

        if (buttonText) {

            buttonText.innerHTML = `
                <span class="loading-spinner"></span>
                ${loadingText}
            `;

        }

    }

    else {

        /*
           Enable button again.
        */

        button.disabled = false;


        button.classList.remove("btn-loading");

    }

}



/* =========================================================
   10. NOTIFICATION MODAL ELEMENTS
========================================================= */

function getNotificationElements() {

    return {

        modal:
            getElement("notificationModal"),

        card:
            document.querySelector(
                ".notification-card"
            ),

        icon:
            getElement("notificationIcon"),

        title:
            getElement("notificationTitle"),

        message:
            getElement("notificationMessage"),

        closeButton:
            getElement("closeNotification"),

        notificationButton:
            getElement("notificationButton")

    };

}



/* =========================================================
   11. NOTIFICATION MODAL INITIALIZATION
========================================================= */

function initializeNotificationModal() {

    const elements =
        getNotificationElements();


    /*
       Close button.
    */

    if (elements.closeButton) {

        elements.closeButton.addEventListener(
            "click",
            closeNotificationModal
        );

    }


    /*
       Bottom Close button.
    */

    if (elements.notificationButton) {

        elements.notificationButton.addEventListener(
            "click",
            closeNotificationModal
        );

    }

}



/* =========================================================
   12. SHOW ERROR MODAL
========================================================= */

/*
   Error modal behavior:

   The user MUST close it.

   There is NO automatic timeout.
*/

function showErrorModal(
    title,
    message
) {

    const elements =
        getNotificationElements();


    /*
       Remove previous modal classes.
    */

    elements.card.classList.remove(
        "success"
    );

    elements.card.classList.remove(
        "error"
    );


    /*
       Add error styling.
    */

    elements.card.classList.add(
        "error"
    );


    /*
       Error icon.
    */

    elements.icon.textContent = "✕";


    /*
       Set title and message.
    */

    elements.title.textContent =
        title || "Authentication Error";


    elements.message.textContent =
        message || "Something went wrong.";


    /*
       Show modal.
    */

    elements.modal.classList.add("show");

}



/* =========================================================
   13. SHOW SUCCESS MODAL
========================================================= */

/*
   Success modal can have two behaviors:

   1. Normal success:
      User closes it.

   2. Redirect success:
      Automatically redirects after 1.5 seconds.
*/

function showSuccessModal(
    title,
    message,
    redirectUrl = null
) {

    const elements =
        getNotificationElements();


    /*
       Remove previous modal classes.
    */

    elements.card.classList.remove(
        "success"
    );

    elements.card.classList.remove(
        "error"
    );


    /*
       Add success styling.
    */

    elements.card.classList.add(
        "success"
    );


    /*
       Success icon.
    */

    elements.icon.textContent = "✓";


    /*
       Set title and message.
    */

    elements.title.textContent =
        title || "Success";


    elements.message.textContent =
        message || "Operation completed successfully.";


    /*
       Show modal.
    */

    elements.modal.classList.add("show");


    /*
       Redirect after 1.5 seconds
       when a redirect URL exists.
    */

    if (redirectUrl) {

        setTimeout(() => {

            window.location.href =
                redirectUrl;

        }, 1500);

    }

}



/* =========================================================
   14. CLOSE NOTIFICATION MODAL
========================================================= */

function closeNotificationModal() {

    const modal =
        getElement("notificationModal");


    if (modal) {

        modal.classList.remove("show");

    }

}



/* =========================================================
   15. SAVE WORKER EMAIL
========================================================= */

/*
   The worker's email is temporarily stored
   so the following OTP/profile page knows
   which worker is continuing the process.
*/

function saveWorkerEmail(email) {

    sessionStorage.setItem(
        "workerEmail",
        email
    );

}



/* =========================================================
   16. SAVE ACCESS TOKEN
========================================================= */

/*
   IMPORTANT:

   Access token:
   - Stored in sessionStorage.

   Refresh token:
   - NOT stored here.
   - Backend sends it as an httpOnly cookie.

   JavaScript cannot access the refresh token,
   which is intentional for security.
*/

function saveAccessToken(accessToken) {

    if (!accessToken) {

        return;

    }


    sessionStorage.setItem(
        "accessToken",
        accessToken
    );

}



/* =========================================================
   17. LOGIN FORM
========================================================= */

function initializeLoginForm() {

    const loginForm =
        getElement("loginForm");


    if (!loginForm) {

        return;

    }


    loginForm.addEventListener(
        "submit",
        handleLogin
    );

}



/* =========================================================
   18. LOGIN HANDLER
========================================================= */

async function handleLogin(event) {

    /*
       Prevent normal browser form submission.
    */

    event.preventDefault();


    /*
       Get form values.
    */

    const email =
        getElement("loginEmail")
            .value
            .trim()
            .toLowerCase();


    const password =
        getElement("loginPassword")
            .value;


    const loginButton =
        getElement("loginButton");


    /* ==========================================
       FRONTEND VALIDATION
    ========================================== */


    /*
       Check email.
    */

    if (!email) {

        showErrorModal(
            "Email Required",
            "Please enter your email address."
        );

        return;

    }


    /*
       Check email format.
    */

    if (!isValidEmail(email)) {

        showErrorModal(
            "Invalid Email",
            "Please enter a valid email address."
        );

        return;

    }


    /*
       Check password.
    */

    if (!password) {

        showErrorModal(
            "Password Required",
            "Please enter your password."
        );

        return;

    }


    /* ==========================================
       START LOADING
    ========================================== */

    setLoading(
        loginButton,
        true,
        "Logging in..."
    );


    try {

        /* ======================================
           SEND LOGIN REQUEST
        ======================================= */

        const response =
            await fetch(
                API_ENDPOINT("/api/worker-authentication/login"),
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    /*
                       Required so the browser
                       accepts the httpOnly
                       refresh-token cookie.
                    */

                    credentials: "include",

                    body: JSON.stringify({

                        email: email,

                        password: password

                    })

                }
            );


        /* ======================================
           READ BACKEND RESPONSE
        ======================================= */

        const data =
            await response.json();


        /* ======================================
           BACKEND ERROR
        ======================================= */

        if (!response.ok) {

            showErrorModal(
                "Login Failed",
                data.message ||
                "Unable to login. Please try again."
            );

            return;

        }


        /* ======================================
           SAVE EMAIL
        ======================================= */

        saveWorkerEmail(email);


        /* ======================================
           DETERMINE NEXT STEP
        ======================================= */

        /*
           The backend tells the frontend
           where the worker should continue.

           Possible values:

           "email-verification"
           "profile"
           "authenticated"
        */

        switch (data.nextStep) {


            /* ==================================
               EMAIL NOT VERIFIED
            ================================== */

            case "email-verification":

                showSuccessModal(
                    "Verification Required",
                    "Your email is not verified. We have sent you a new OTP.",
                    "../worker-email-otp/index.html"
                );

                return;



            /* ==================================
               PROFILE NOT COMPLETED
            ================================== */

            case "profile":

                showSuccessModal(
                    "Continue Your Profile",
                    "Your email is verified. Continue by completing your worker profile.",
                    "../worker-create-profile/index.html"
                );

                return;



            /* ==================================
               FULLY AUTHENTICATED
            ================================== */

            case "authenticated":


                /*
                   Backend returns the access token.
                */

                if (data.accessToken) {

                    saveAccessToken(
                        data.accessToken
                    );

                }


                /*
                   Refresh token is intentionally
                   NOT handled by JavaScript.

                   It is stored by the browser
                   as an httpOnly cookie.
                */

                showSuccessModal(
                    "Login Successful",
                    "Welcome back. Redirecting you to your client chats.",
                    "../worker-dashboard/index.html"
                );

                return;



            /* ==================================
               UNKNOWN NEXT STEP
            ================================== */

            default:

                showErrorModal(
                    "Authentication Error",
                    "The server returned an unexpected authentication state."
                );

                return;

        }

    }

    catch (error) {

        /*
           Handles network/server connection errors.
        */

        console.error(
            "Worker login error:",
            error
        );


        showErrorModal(
            "Connection Error",
            "Unable to connect to the server. Please check your connection and try again."
        );

    }

    finally {

        /*
           Stop loading after the request
           has finished.
        */

        setLoading(
            loginButton,
            false
        );


        /*
           Restore the original button text.
        */

        const buttonText =
            loginButton.querySelector(
                ".btn-text"
            );


        if (buttonText) {

            buttonText.textContent =
                "Login";

        }

    }

}



/* =========================================================
   19. SIGNUP FORM
========================================================= */

function initializeSignupForm() {

    const signupForm =
        getElement("signupForm");


    if (!signupForm) {

        return;

    }


    signupForm.addEventListener(
        "submit",
        handleSignup
    );

}



/* =========================================================
   20. SIGNUP HANDLER
========================================================= */

async function handleSignup(event) {

    /*
       Prevent normal browser form submission.
    */

    event.preventDefault();


    /*
       Get form values.
    */

    const email =
        getElement("signupEmail")
            .value
            .trim()
            .toLowerCase();


    const password =
        getElement("signupPassword")
            .value;


    const confirmPassword =
        getElement("confirmPassword")
            .value;


    const termsAccepted =
        getElement("termsCheckbox")
            .checked;


    const signupButton =
        getElement("signupButton");


    /* ==========================================
       FRONTEND VALIDATION
    ========================================== */


    /*
       Check email.
    */

    if (!email) {

        showErrorModal(
            "Email Required",
            "Please enter your email address."
        );

        return;

    }


    /*
       Validate email format.
    */

    if (!isValidEmail(email)) {

        showErrorModal(
            "Invalid Email",
            "Please enter a valid email address."
        );

        return;

    }


    /*
       Check password.
    */

    if (!password) {

        showErrorModal(
            "Password Required",
            "Please create a password."
        );

        return;

    }


    /* ==========================================
   Validate password length
========================================== */

if (password.length < 8) {

    showErrorModal(
        "Invalid Password",
        "Password must contain at least 8 characters."
    );

    return;

}

    /*
       Check confirm password.
    */

    if (!confirmPassword) {

        showErrorModal(
            "Confirm Password",
            "Please confirm your password."
        );

        return;

    }


    /*
       Compare passwords.
    */

    if (password !== confirmPassword) {

        showErrorModal(
            "Passwords Do Not Match",
            "Your password and confirm password must match."
        );

        return;

    }


    /*
       Check Terms & Privacy.
    */

    if (!termsAccepted) {

        showErrorModal(
            "Terms Required",
            "Please agree to the Terms & Privacy Policy before creating your account."
        );

        return;

    }


    /* ==========================================
       START LOADING
    ========================================== */

    setLoading(
        signupButton,
        true,
        "Creating account..."
    );


    try {

        /* ======================================
           SEND SIGNUP REQUEST
        ======================================= */

        const response =
            await fetch(
                API_ENDPOINT("/api/worker-authentication/signup"),
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    /*
                       Signup does not need the
                       refresh-token cookie yet,
                       but credentials is kept
                       consistent for authentication.
                    */

                    credentials: "include",

                    body: JSON.stringify({

                        email: email,

                        password: password,

                        confirmPassword:
                            confirmPassword,

                        termsAccepted:
                            termsAccepted

                    })

                }
            );


        /* ======================================
           READ BACKEND RESPONSE
        ======================================= */

        const data =
            await response.json();


        /* ======================================
           BACKEND ERROR
        ======================================= */

        if (!response.ok) {

            showErrorModal(
                "Account Creation Failed",
                data.message ||
                "Unable to create your account. Please try again."
            );

            return;

        }


        /* ======================================
           SAVE WORKER EMAIL
        ======================================= */

        saveWorkerEmail(
            data.email || email
        );


        /* ======================================
           SUCCESS
        ======================================= */

        showSuccessModal(
            "Account Created",
            "Your account has been created. We have sent an email verification OTP to your email address.",
            "../worker-email-otp/index.html"
        );

    }

    catch (error) {

        /*
           Handles network/server errors.
        */

        console.error(
            "Worker signup error:",
            error
        );


        showErrorModal(
            "Connection Error",
            "Unable to connect to the server. Please check your connection and try again."
        );

    }

    finally {

        /*
           Stop loading.
        */

        setLoading(
            signupButton,
            false
        );


        /*
           Restore button text.
        */

        const buttonText =
            signupButton.querySelector(
                ".btn-text"
            );


        if (buttonText) {

            buttonText.textContent =
                "Create Account";

        }

    }

}



/* =========================================================
   21. FORGOT PASSWORD
========================================================= */

function initializeForgotPassword() {

    const forgotPassword =
        getElement("forgotPassword");


    const forgotModal =
        getElement("forgotModal");


    const closeModal =
        getElement("closeModal");


    const forgotForm =
        getElement("forgotForm");


    /*
       Open Forgot Password modal.
    */

    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            event => {

                event.preventDefault();


                /*
                   Clear previous email.
                */

                const resetEmail =
                    getElement("resetEmail");


                if (resetEmail) {

                    resetEmail.value = "";

                }


                /*
                   Open modal.
                */

                forgotModal.classList.add(
                    "show"
                );

            }
        );

    }


    /*
       Close Forgot Password modal.
    */

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            () => {

                forgotModal.classList.remove(
                    "show"
                );

            }
        );

    }


    /*
       Submit Forgot Password form.
    */

    if (forgotForm) {

        forgotForm.addEventListener(
            "submit",
            handleForgotPassword
        );

    }

}



/* =========================================================
   22. FORGOT PASSWORD HANDLER
========================================================= */

async function handleForgotPassword(event) {

    /*
       Prevent normal browser form submission.
    */

    event.preventDefault();


    const resetEmail =
        getElement("resetEmail");


    const forgotButton =
        getElement("forgotButton");


    const email =
        resetEmail
            .value
            .trim()
            .toLowerCase();


    /* ==========================================
       FRONTEND VALIDATION
    ========================================== */

    if (!email) {

        showErrorModal(
            "Email Required",
            "Please enter your email address."
        );

        return;

    }


    if (!isValidEmail(email)) {

        showErrorModal(
            "Invalid Email",
            "Please enter a valid email address."
        );

        return;

    }


    /* ==========================================
       CLOSE FORGOT MODAL
    ========================================== */

    const forgotModal =
        getElement("forgotModal");


    forgotModal.classList.remove(
        "show"
    );


    /* ==========================================
       START LOADING
    ========================================== */

    setLoading(
        forgotButton,
        true,
        "Sending OTP..."
    );


    try {

        /* ======================================
           SEND RESET REQUEST
        ======================================= */

        const response =
            await fetch(
                API_ENDPOINT("/api/worker-authentication/forgot-password"),
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    credentials: "include",

                    body: JSON.stringify({

                        email: email

                    })

                }
            );


        /* ======================================
           READ BACKEND RESPONSE
        ======================================= */

        const data =
            await response.json();


        /* ======================================
           SERVER ERROR
        ======================================= */

        if (!response.ok) {

            showErrorModal(
                "Request Failed",
                data.message ||
                "Unable to process your request. Please try again."
            );

            return;

        }


        /*
           IMPORTANT:

           The backend can return:

           otpSent: true
               -> email exists and OTP was sent

           otpSent: false
               -> email does not exist

           This lets the backend give a generic
           response without exposing account data.
        */

        if (data.otpSent === true) {

            /*
               Save email for the
               password reset OTP page.
            */

            saveWorkerEmail(
                data.email || email
            );


            /*
               Redirect after success modal.
            */

            showSuccessModal(
                "OTP Sent",
                "If the account exists, a password reset OTP has been sent to your email.",
                "../worker-password-reset-otp/index.html"
            );

        }

        else {

            /*
               Generic response for an
               email that does not exist.

               No OTP page redirect occurs.
            */

            showSuccessModal(
                "Request Received",
                "If an account exists for this email address, you will receive a password reset OTP."
            );

        }

    }

    catch (error) {

        /*
           Handles network/server errors.
        */

        console.error(
            "Forgot password error:",
            error
        );


        showErrorModal(
            "Connection Error",
            "Unable to connect to the server. Please check your connection and try again."
        );

    }

    finally {

        /*
           Stop loading.
        */

        setLoading(
            forgotButton,
            false
        );


        /*
           Restore button text.
        */

        const buttonText =
            forgotButton.querySelector(
                ".btn-text"
            );


        if (buttonText) {

            buttonText.textContent =
                "Send OTP";

        }

    }

}



/* =========================================================
   23. CLOSE MODALS WHEN CLICKING OUTSIDE
========================================================= */

/*
   We intentionally DO NOT automatically close
   authentication error modals when the user clicks
   outside them.

   The user must explicitly close an error modal
   using:

   - X button
   - Close button
*/


/*
   Forgot-password modal may be closed by clicking
   outside the card because it is only an input modal.
*/

const forgotModal =
    getElement("forgotModal");


if (forgotModal) {

    forgotModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                forgotModal
            ) {

                forgotModal.classList.remove(
                    "show"
                );

            }

        }
    );

}



/* =========================================================
   24. PREVENT BACKGROUND SCROLL WHEN MODAL IS OPEN
========================================================= */

function updateBodyScroll() {

    const notificationModal =
        getElement("notificationModal");


    const passwordModal =
        getElement("forgotModal");


    const notificationOpen =
        notificationModal &&
        notificationModal.classList.contains(
            "show"
        );


    const passwordOpen =
        passwordModal &&
        passwordModal.classList.contains(
            "show"
        );


    /*
       Prevent background scrolling when
       either modal is open.
    */

    document.body.style.overflow =
        notificationOpen || passwordOpen
            ? "hidden"
            : "";

}



/* =========================================================
   25. MODAL OBSERVER
========================================================= */

const modalObserver =
    new MutationObserver(() => {

        updateBodyScroll();

    });


const notificationModalElement =
    getElement("notificationModal");


const forgotModalElement =
    getElement("forgotModal");


if (notificationModalElement) {

    modalObserver.observe(
        notificationModalElement,
        {
            attributes: true,
            attributeFilter: [
                "class"
            ]
        }
    );

}


if (forgotModalElement) {

    modalObserver.observe(
        forgotModalElement,
        {
            attributes: true,
            attributeFilter: [
                "class"
            ]
        }
    );

}



/* =========================================================
   26. KEYBOARD ESCAPE
========================================================= */

/*
   ESC is allowed to close the Forgot Password
   input modal.

   It does NOT close authentication
   notification/error modals automatically.

   This preserves the requirement that the
   user must close authentication messages.
*/

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {

            return;

        }


        const forgotModal =
            getElement("forgotModal");


        if (
            forgotModal &&
            forgotModal.classList.contains(
                "show"
            )
        ) {

            forgotModal.classList.remove(
                "show"
            );

        }

    }
);