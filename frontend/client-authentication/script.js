/* =========================================================
   2. DOM ELEMENT REFERENCES
========================================================= */

/*
    Authentication tabs.
*/

const tabs =
    document.querySelectorAll(".tab");


/*
    Authentication form sections.
*/

const loginSection =
    document.getElementById("login");

const signupSection =
    document.getElementById("signup");


/*
    Authentication forms.
*/

const loginForm =
    document.getElementById("loginForm");

const signupForm =
    document.getElementById("signupForm");

const forgotForm =
    document.getElementById("forgotForm");


/*
    Login fields.
*/

const loginEmail =
    document.getElementById("loginEmail");

const loginPassword =
    document.getElementById("loginPassword");


/*
    Signup fields.
*/

const signupEmail =
    document.getElementById("signupEmail");

const signupPassword =
    document.getElementById("signupPassword");

const confirmPassword =
    document.getElementById("confirmPassword");

const termsCheckbox =
    document.getElementById("termsCheckbox");


/*
    Forgot-password email field.
*/

const resetEmail =
    document.getElementById("resetEmail");


/*
    Authentication buttons.
*/

const loginButton =
    document.getElementById("loginButton");

const signupButton =
    document.getElementById("signupButton");

const forgotButton =
    document.getElementById("forgotButton");


/*
    Forgot-password link.
*/

const forgotPassword =
    document.getElementById("forgotPassword");


/* =========================================================
   3. NOTIFICATION MODAL ELEMENTS
========================================================= */

/*
    General authentication notification modal.

    This modal is used for:

    - Errors
    - Success messages
    - Redirect messages
*/

const notificationModal =
    document.getElementById("notificationModal");


const notificationCard =
    notificationModal
        ? notificationModal.querySelector(
            ".notification-card"
        )
        : null;


const notificationIcon =
    document.getElementById("notificationIcon");


const notificationTitle =
    document.getElementById("notificationTitle");


const notificationMessage =
    document.getElementById("notificationMessage");


const closeNotification =
    document.getElementById("closeNotification");


const notificationButton =
    document.getElementById("notificationButton");


/* =========================================================
   4. FORGOT PASSWORD MODAL ELEMENTS
========================================================= */

const forgotModal =
    document.getElementById("forgotModal");


const closeModal =
    document.getElementById("closeModal");


/* =========================================================
   5. APPLICATION STATE
========================================================= */

/*
    Prevents multiple authentication requests
    from being submitted at the same time.
*/

let authenticationLoading = false;


/*
    Stores the currently active redirect timer.

    This allows us to clear an existing timer
    before creating another one.
*/

let redirectTimer = null;


/* =========================================================
   6. PASSWORD VISIBILITY TOGGLE
========================================================= */

/*
    Toggles the visibility of a password input.

    The HTML password fields will use a button
    with the class:

        .password-toggle

    The button should contain:

        data-target="inputId"

    Example:

        <button
            type="button"
            class="password-toggle"
            data-target="signupPassword"
        >
            👁
        </button>
*/

function setupPasswordToggles() {

    const passwordToggles =
        document.querySelectorAll(
            ".password-toggle"
        );


    passwordToggles.forEach((toggle) => {

        toggle.addEventListener(
            "click",
            () => {

                /*
                    Find the input controlled by
                    this toggle button.
                */

                const targetId =
                    toggle.dataset.target;


                const passwordInput =
                    document.getElementById(
                        targetId
                    );


                /*
                    Stop if the target input
                    does not exist.
                */

                if (!passwordInput) {

                    return;

                }


                /*
                    Change between password and
                    normal text input.
                */

                if (
                    passwordInput.type ===
                    "password"
                ) {

                    passwordInput.type =
                        "text";


                    /*
                        Change the visual icon.

                        The exact icon can be changed
                        later without changing the logic.
                    */

                    toggle.textContent = "🙈";


                    toggle.setAttribute(
                        "aria-label",
                        "Hide password"
                    );


                } else {

                    passwordInput.type =
                        "password";


                    toggle.textContent = "👁";


                    toggle.setAttribute(
                        "aria-label",
                        "Show password"
                    );

                }

            }
        );

    });

}


/* =========================================================
   7. TAB SWITCHING
========================================================= */

/*
    Switches between:

        Login

    and:

        Create Account
*/

function switchAuthTab(tabName) {

    /*
        Remove active state from every tab.
    */

    tabs.forEach((tab) => {

        tab.classList.remove("active");

    });


    /*
        Hide every form section.
    */

    document
        .querySelectorAll(".form-section")
        .forEach((section) => {

            section.classList.remove(
                "active"
            );

        });


    /*
        Find the selected tab.
    */

    const selectedTab =
        document.querySelector(
            `.tab[data-tab="${tabName}"]`
        );


    /*
        Activate the selected tab.
    */

    if (selectedTab) {

        selectedTab.classList.add(
            "active"
        );

    }


    /*
        Display the selected form.
    */

    const selectedSection =
        document.getElementById(tabName);


    if (selectedSection) {

        selectedSection.classList.add(
            "active"
        );

    }

}


/* =========================================================
   8. EMAIL VALIDATION
========================================================= */

/*
    Checks whether an email address has
    a valid basic structure.
*/

function isValidEmail(email) {

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    return emailPattern.test(email);

}


/* =========================================================
   9. PASSWORD VALIDATION
========================================================= */

/*
    Basic frontend password validation.

    The backend remains responsible for
    enforcing the final password requirements.
*/

function isValidPassword(password) {

    /*
        Require at least 8 characters.

        The backend will perform the authoritative
        validation as well.
    */

    return password.length >= 8;

}


/* =========================================================
   10. SHOW NOTIFICATION MODAL
========================================================= */

/*
    Displays an authentication notification.

    type:

        "success"

    or:

        "error"

    autoRedirect:

        false
            User must close the modal.

        true
            Modal automatically redirects after
            exactly 1.5 seconds.
*/

function showNotification({
    type = "error",
    title = "",
    message = "",
    autoRedirect = false,
    redirectUrl = null
}) {

    /*
        Clear any previous redirect timer.
    */

    if (redirectTimer) {

        clearTimeout(
            redirectTimer
        );

        redirectTimer = null;

    }


    /*
        Make sure the modal exists.
    */

    if (!notificationModal) {

        return;

    }


    /*
        Remove previous modal type.
    */

    if (notificationCard) {

        notificationCard.classList.remove(
            "success",
            "error"
        );


        notificationCard.classList.add(
            type
        );

    }


    /*
        Set notification icon.
    */

    if (notificationIcon) {

        notificationIcon.textContent =
            type === "success"
                ? "✓"
                : "⚠";

    }


    /*
        Set notification title.
    */

    if (notificationTitle) {

        notificationTitle.textContent =
            title;

    }


    /*
        Set notification message.
    */

    if (notificationMessage) {

        notificationMessage.textContent =
            message;

    }


    /*
        Show the modal.
    */

    notificationModal.classList.add(
        "show"
    );


    /*
        Redirect messages automatically close
        and redirect after exactly 1.5 seconds.
    */

    if (
        autoRedirect &&
        redirectUrl
    ) {

        /*
            Hide the manual close controls
            while waiting for the redirect.
        */

        if (closeNotification) {

            closeNotification.style.display =
                "none";

        }


        if (notificationButton) {

            notificationButton.style.display =
                "none";

        }


        redirectTimer =
            setTimeout(() => {

                window.location.href =
                    redirectUrl;

            }, 1500);

    } else {

        /*
            Error/success messages that do not
            redirect must be closed by the user.
        */

        if (closeNotification) {

            closeNotification.style.display =
                "flex";

        }


        if (notificationButton) {

            notificationButton.style.display =
                "block";

        }

    }

}


/* =========================================================
   11. CLOSE NOTIFICATION MODAL
========================================================= */

/*
    Closes the general notification modal.

    Error messages require the user to close them.
*/

function closeNotificationModal() {

    if (!notificationModal) {

        return;

    }


    notificationModal.classList.remove(
        "show"
    );


    /*
        Clear any active redirect timer.
    */

    if (redirectTimer) {

        clearTimeout(
            redirectTimer
        );

        redirectTimer = null;

    }

}


/* =========================================================
   12. LOADING STATE
========================================================= */

/*
    Places an authentication button into
    its loading state.

    Example:

        Login
          ↓
        Spinner
        Logging in...
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
        button.querySelector(
            ".btn-text"
        );


    if (isLoading) {

        /*
            Disable the button.
        */

        button.disabled = true;


        /*
            Add loading class.
        */

        button.classList.add(
            "btn-loading"
        );


        /*
            Display spinner.
        */

        if (buttonText) {

            buttonText.innerHTML = `

                <span class="loading-spinner"></span>

                ${loadingText}

            `;

        }

    } else {

        /*
            Enable the button again.
        */

        button.disabled = false;


        /*
            Remove loading class.
        */

        button.classList.remove(
            "btn-loading"
        );


        /*
            Restore original button text.
        */

        if (button === loginButton) {

            buttonText.textContent =
                "Login";

        }


        if (button === signupButton) {

            buttonText.textContent =
                "Create Account";

        }


        if (button === forgotButton) {

            buttonText.textContent =
                "Send OTP";

        }

    }

}


/* =========================================================
   13. CREATE ACCOUNT FRONTEND VALIDATION
========================================================= */

/*
    Validates the Create Account form
    before sending anything to the backend.
*/

function validateSignupForm() {

    const email =
        signupEmail.value.trim();


    const password =
        signupPassword.value;


    const confirm =
        confirmPassword.value;


    /*
        Check email.
    */

    if (!email) {

        showNotification({

            type: "error",

            title: "Email Required",

            message:
                "Please enter your email address."

        });

        return false;

    }


    /*
        Check email format.
    */

    if (!isValidEmail(email)) {

        showNotification({

            type: "error",

            title: "Invalid Email",

            message:
                "Please enter a valid email address."

        });

        return false;

    }


    /*
        Check password.
    */

    if (!password) {

        showNotification({

            type: "error",

            title: "Password Required",

            message:
                "Please create a password."

        });

        return false;

    }


    /*
        Check password length.
    */

    if (!isValidPassword(password)) {

        showNotification({

            type: "error",

            title: "Invalid Password",

            message:
                "Password must contain at least 8 characters."

        });

        return false;

    }


    /*
        Check confirmation password.
    */

    if (!confirm) {

        showNotification({

            type: "error",

            title: "Confirm Password",

            message:
                "Please confirm your password."

        });

        return false;

    }


    /*
        Make sure both passwords match.
    */

    if (password !== confirm) {

        showNotification({

            type: "error",

            title: "Passwords Do Not Match",

            message:
                "Password and confirm password must match."

        });

        return false;

    }


    /*
        Check Terms & Privacy agreement.
    */

    if (
        !termsCheckbox ||
        !termsCheckbox.checked
    ) {

        showNotification({

            type: "error",

            title: "Agreement Required",

            message:
                "You must agree to the Terms & Privacy Policy before creating an account."

        });

        return false;

    }


    return true;

}


/* =========================================================
   14. CREATE ACCOUNT REQUEST
========================================================= */

/*
    Handles the complete frontend Create Account flow.

    FLOW:

        Validate
           ↓
        Backend
           ↓
        Success
           ↓
        Save email
           ↓
        Success modal
           ↓
        client-email-otp
*/

async function handleSignup(event) {

    event.preventDefault();


    /*
        Prevent duplicate requests.
    */

    if (authenticationLoading) {

        return;

    }


    /*
        Run frontend validation.
    */

    if (!validateSignupForm()) {

        return;

    }


    authenticationLoading = true;


    setLoading(
        signupButton,
        true,
        "Creating Account..."
    );


    try {

        /*
            Collect form values.
        */

        const email =
            signupEmail.value.trim();


        const password =
            signupPassword.value;


        const response =
            await fetch(
                API_ENDPOINT("/api/client-authentication/signup"), {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    credentials: "include",

                    body: JSON.stringify({

                        email,

                        password

                    })

                }
            );


        /*
            Attempt to read the backend response.
        */

        const data =
            await response.json();


        /*
            Backend returned an error.
        */

        if (!response.ok) {

            throw new Error(

                data.message ||
                "Unable to create your account."

            );

        }


        /*
            Save the client email.

            The client-email-otp page will use
            this email to verify the account.
        */

        sessionStorage.setItem(
            "clientEmail",
            email
        );


        /*
            Display success redirect modal.

            Redirect occurs after 1.5 seconds.
        */

        showNotification({

            type: "success",

            title: "Account Created",

            message:
                data.message ||
                "Your account has been created. An email verification OTP has been sent to you.",

            autoRedirect: true,

            redirectUrl:
                "../client-email-otp/index.html"

        });


    } catch (error) {

        /*
            Display backend/network errors
            through the notification modal.
        */

        showNotification({

            type: "error",

            title: "Create Account Failed",

            message:
                error.message ||
                "Something went wrong. Please try again."

        });


    } finally {

        authenticationLoading = false;


        setLoading(
            signupButton,
            false
        );

    }

}


/* =========================================================
   15. LOGIN FRONTEND VALIDATION
========================================================= */

function validateLoginForm() {

    const email =
        loginEmail.value.trim();


    const password =
        loginPassword.value;


    /*
        Check email.
    */

    if (!email) {

        showNotification({

            type: "error",

            title: "Email Required",

            message:
                "Please enter your email address."

        });

        return false;

    }


    /*
        Check email format.
    */

    if (!isValidEmail(email)) {

        showNotification({

            type: "error",

            title: "Invalid Email",

            message:
                "Please enter a valid email address."

        });

        return false;

    }


    /*
        Check password.
    */

    if (!password) {

        showNotification({

            type: "error",

            title: "Password Required",

            message:
                "Please enter your password."

        });

        return false;

    }


    return true;

}


/* =========================================================
   16. LOGIN REQUEST
========================================================= */

/*
    Handles the complete frontend login flow.

    Possible backend responses:

        1. Email not found
        2. Wrong password
        3. Suspended account
        4. Email verification required
        5. Profile completion required
        6. Fully authenticated
*/

async function handleLogin(event) {

    event.preventDefault();


    /*
        Prevent duplicate login requests.
    */

    if (authenticationLoading) {

        return;

    }


    /*
        Frontend validation.
    */

    if (!validateLoginForm()) {

        return;

    }


    authenticationLoading = true;


    setLoading(
        loginButton,
        true,
        "Logging In..."
    );


    try {

        const email =
            loginEmail.value.trim();


        const password =
            loginPassword.value;


        /*
            Send login request to backend.
        */

        const response =
            await fetch(
                API_ENDPOINT("/api/client-authentication/login"), {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    /*
                        Required so the browser can
                        receive the HttpOnly refresh-token
                        cookie.
                    */

                    credentials: "include",

                    body: JSON.stringify({

                        email,

                        password

                    })

                }
            );


        const data =
            await response.json();


        /*
            Backend authentication failed.
        */

        if (!response.ok) {

            throw new Error(

                data.message ||
                "Unable to login."

            );

        }


        /*
            Always save the client email.

            This is required if the user needs to
            verify email or complete their profile.
        */

        sessionStorage.setItem(
            "clientEmail",
            email
        );


        /* =================================================
           EMAIL VERIFICATION REQUIRED
        ================================================= */

        if (
            data.nextStep ===
            "email-verification"
        ) {

            showNotification({

                type: "success",

                title: "Verification Required",

                message:
                    data.message ||
                    "Your email is not verified. A new OTP has been sent to your email.",

                autoRedirect: true,

                redirectUrl:
                    "../client-email-otp/index.html"

            });

            return;

        }


        /* =================================================
           PROFILE COMPLETION REQUIRED
        ================================================= */

        if (
            data.nextStep ===
            "complete-profile"
        ) {

            showNotification({

                type: "success",

                title: "Complete Your Profile",

                message:
                    data.message ||
                    "Please complete your client profile to continue.",

                autoRedirect: true,

                redirectUrl:
                    "../client-create-profile/index.html"

            });

            return;

        }


        /* =================================================
           FULL AUTHENTICATION SUCCESS
        ================================================= */

        if (
            data.accessToken
        ) {

            /*
                Save ONLY the access token.

                The refresh token must never be exposed
                to JavaScript.

                The backend sets the refresh token as
                an HttpOnly cookie.
            */

            sessionStorage.setItem(
                "accessToken",
                data.accessToken
            );


            /*
                Make sure the client email is available
                to later pages.
            */

            if (data.email) {

                sessionStorage.setItem(
                    "clientEmail",
                    data.email
                );

            }


            /*
                Fully authenticated client.

                Redirect after exactly 1.5 seconds.
            */

            showNotification({

                type: "success",

                title: "Login Successful",

                message:
                    data.message ||
                    "Welcome back to SkillConnect.",

                autoRedirect: true,

                redirectUrl:
                    "../client-worker-search/index.html"

            });

            return;

        }


        /*
            Unexpected successful backend response.
        */

        throw new Error(
            "The server returned an unexpected authentication response."
        );


    } catch (error) {

        showNotification({

            type: "error",

            title: "Login Failed",

            message:
                error.message ||
                "Unable to login. Please try again."

        });

    } finally {

        authenticationLoading = false;


        setLoading(
            loginButton,
            false
        );

    }

}


/* =========================================================
   17. OPEN FORGOT PASSWORD MODAL
========================================================= */

/*
    Opens the Forgot Password modal.
*/

function openForgotPasswordModal(event) {

    event.preventDefault();


    if (!forgotModal) {

        return;

    }


    forgotModal.classList.add(
        "show"
    );


    /*
        Focus the email input automatically.
    */

    if (resetEmail) {

        setTimeout(() => {

            resetEmail.focus();

        }, 100);

    }

}


/* =========================================================
   18. CLOSE FORGOT PASSWORD MODAL
========================================================= */

function closeForgotPasswordModal() {

    if (!forgotModal) {

        return;

    }


    forgotModal.classList.remove(
        "show"
    );

}


/* =========================================================
   19. FORGOT PASSWORD VALIDATION
========================================================= */

function validateForgotPasswordForm() {

    const email =
        resetEmail.value.trim();


    /*
        Check email.
    */

    if (!email) {

        showNotification({

            type: "error",

            title: "Email Required",

            message:
                "Please enter your email address."

        });

        return false;

    }


    /*
        Validate email format.
    */

    if (!isValidEmail(email)) {

        showNotification({

            type: "error",

            title: "Invalid Email",

            message:
                "Please enter a valid email address."

        });

        return false;

    }


    return true;

}


/* =========================================================
   20. FORGOT PASSWORD REQUEST
========================================================= */

/*
    Handles the Forgot Password flow.

    IMPORTANT:

    The backend should return a generic response
    whether the email exists or not.

    This prevents revealing whether a client
    account exists.
*/

async function handleForgotPassword(event) {

    event.preventDefault();


    if (authenticationLoading) {

        return;

    }


    /*
        Frontend validation.
    */

    if (
        !validateForgotPasswordForm()
    ) {

        return;

    }


    authenticationLoading = true;


    setLoading(
        forgotButton,
        true,
        "Sending OTP..."
    );


    try {

        const email =
            resetEmail.value.trim();


        /*
            Send password reset request.
        */

        const response =
            await fetch(
                API_ENDPOINT("/api/client-authentication/forgot-password"), {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    credentials: "include",

                    body: JSON.stringify({

                        email

                    })

                }
            );


        const data =
            await response.json();


        /*
            Backend/network failure.
        */

        if (!response.ok) {

            throw new Error(

                data.message ||
                "Unable to process your request."

            );

        }


        /*
            Save the client email.

            The password-reset OTP page needs this
            email to verify the OTP.
        */

        sessionStorage.setItem(
            "clientEmail",
            email
        );


        /*
            Close the Forgot Password modal first.
        */

        closeForgotPasswordModal();


        /*
            Show success redirect modal.

            Redirect after exactly 1.5 seconds.
        */

        showNotification({

            type: "success",

            title: "OTP Request Sent",

            message:
                data.message ||
                "If an account exists with this email, a password reset OTP has been sent.",

            autoRedirect: true,

            redirectUrl:
                "../client-password-reset-otp/index.html"

        });


    } catch (error) {

        showNotification({

            type: "error",

            title: "Request Failed",

            message:
                error.message ||
                "Unable to process your password reset request."

        });

    } finally {

        authenticationLoading = false;


        setLoading(
            forgotButton,
            false
        );

    }

}


/* =========================================================
   21. TAB EVENT LISTENERS
========================================================= */

/*
    Attach click events to:

        Login
        Create Account
*/

tabs.forEach((tab) => {

    tab.addEventListener(
        "click",
        () => {

            const tabName =
                tab.dataset.tab;


            switchAuthTab(
                tabName
            );

        }
    );

});


/* =========================================================
   22. FORM EVENT LISTENERS
========================================================= */

/*
    Create Account form.
*/

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        handleSignup
    );

}


/*
    Login form.
*/

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        handleLogin
    );

}


/*
    Forgot Password form.
*/

if (forgotForm) {

    forgotForm.addEventListener(
        "submit",
        handleForgotPassword
    );

}


/* =========================================================
   23. FORGOT PASSWORD EVENT LISTENERS
========================================================= */

if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        openForgotPasswordModal
    );

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeForgotPasswordModal
    );

}


/* =========================================================
   24. NOTIFICATION MODAL EVENT LISTENERS
========================================================= */

/*
    Close button inside notification modal.
*/

if (closeNotification) {

    closeNotification.addEventListener(
        "click",
        closeNotificationModal
    );

}


/*
    Notification button also closes the modal.
*/

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        closeNotificationModal
    );

}


/* =========================================================
   25. CLOSE FORGOT MODAL WHEN CLICKING OUTSIDE
========================================================= */

if (forgotModal) {

    forgotModal.addEventListener(
        "click",
        (event) => {

            /*
                Only close when the user clicks
                the dark background itself.

                Clicking inside the modal card
                does nothing.
            */

            if (
                event.target ===
                forgotModal
            ) {

                closeForgotPasswordModal();

            }

        }
    );

}


/* =========================================================
   26. ESCAPE KEY HANDLING
========================================================= */

/*
    Allows the user to close the Forgot Password
    modal with the Escape key.
*/

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            forgotModal &&
            forgotModal.classList.contains("show")
        ) {

            closeForgotPasswordModal();

        }

    }
);


/* =========================================================
   27. INITIALIZE PASSWORD TOGGLES
========================================================= */

/*
    Activate all password visibility buttons
    after the page loads.
*/

setupPasswordToggles();


/* =========================================================
   28. INITIAL AUTHENTICATION STATE
========================================================= */

/*
    Make sure Login is the default authentication tab.
*/

switchAuthTab(
    "login"
);


/* =========================================================
   29. CLIENT AUTHENTICATION INITIALIZATION
========================================================= */

/*
    Confirm that the Client Authentication
    JavaScript loaded successfully.

    This is useful during development/debugging.
*/

console.log(
    "SkillConnect Client Authentication JavaScript loaded successfully."
);