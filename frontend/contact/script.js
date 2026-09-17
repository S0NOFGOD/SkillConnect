/* =========================================================
   SKILLCONNECT CONTACT PAGE JAVASCRIPT
   Handles the contact form and communicates with the backend.
========================================================= */


/* =========================================================
   BACKEND API URL
========================================================= */

/*
    This is the address where our Express backend
    will run during local development.

    Example:

    http://localhost:5000
*/

const API_URL = "http://localhost:5000";


/* =========================================================
   WAIT FOR THE HTML DOCUMENT TO LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       GET CONTACT FORM ELEMENTS
    ===================================================== */

    /*
        Find the contact form using its ID.
    */

    const contactForm =
        document.getElementById("contactForm");


    /*
        Find the form message element.

        JavaScript will use this element to display
        success and error messages.
    */

    const formMessage =
        document.getElementById("formMessage");


    /*
        Find the submit button.
    */

    const submitButton =
        document.getElementById("submitButton");


    /* =====================================================
       CHECK THAT REQUIRED ELEMENTS EXIST
    ===================================================== */

    /*
        If the form, message area, or button cannot
        be found, stop the script.

        This prevents JavaScript errors.
    */

    if (
        !contactForm ||
        !formMessage ||
        !submitButton
    ) {

        console.error(
            "Contact form elements could not be found."
        );

        return;

    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    /*
        Get the hamburger button.
    */

    const menuToggle =
        document.getElementById(
            "menuToggle"
        );


    /*
        Get the mobile sidebar.
    */

    const mobileSidebar =
        document.getElementById(
            "mobileSidebar"
        );


    /*
        Get the sidebar overlay.
    */

    const sidebarOverlay =
        document.getElementById(
            "sidebarOverlay"
        );


    /*
        Get the sidebar close button.
    */

    const sidebarClose =
        document.getElementById(
            "sidebarClose"
        );


    /*
        Get the mobile sidebar links.
    */

    const sidebarLinks =
        document.querySelectorAll(
            ".sidebar-links a"
        );


    /* =====================================================
       OPEN MOBILE SIDEBAR
    ===================================================== */

    function openSidebar() {

        /*
            Add the open class to the sidebar.
        */

        mobileSidebar.classList.add(
            "open"
        );


        /*
            Show the dark overlay.
        */

        sidebarOverlay.classList.add(
            "show"
        );


        /*
            Update accessibility state.
        */

        menuToggle.setAttribute(
            "aria-expanded",
            "true"
        );


        menuToggle.setAttribute(
            "aria-label",
            "Close navigation menu"
        );


        /*
            Prevent the page behind the sidebar
            from scrolling.
        */

        document.body.style.overflow =
            "hidden";

    }


    /* =====================================================
       CLOSE MOBILE SIDEBAR
    ===================================================== */

    function closeSidebar() {

        /*
            Remove the open class.
        */

        mobileSidebar.classList.remove(
            "open"
        );


        /*
            Hide the overlay.
        */

        sidebarOverlay.classList.remove(
            "show"
        );


        /*
            Update accessibility state.
        */

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );


        menuToggle.setAttribute(
            "aria-label",
            "Open navigation menu"
        );


        /*
            Restore page scrolling.
        */

        document.body.style.overflow =
            "";

    }


    /* =====================================================
       HAMBURGER BUTTON
    ===================================================== */

    if (menuToggle) {

        menuToggle.addEventListener(
            "click",
            () => {

                /*
                    Check whether the sidebar
                    is currently open.
                */

                const isOpen =
                    mobileSidebar.classList.contains(
                        "open"
                    );


                /*
                    Toggle the sidebar state.
                */

                if (isOpen) {

                    closeSidebar();

                } else {

                    openSidebar();

                }

            }
        );

    }


    /* =====================================================
       SIDEBAR CLOSE BUTTON
    ===================================================== */

    if (sidebarClose) {

        sidebarClose.addEventListener(
            "click",
            closeSidebar
        );

    }


    /* =====================================================
       SIDEBAR OVERLAY
    ===================================================== */

    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );

    }


    /* =====================================================
       MOBILE SIDEBAR LINKS
    ===================================================== */

    if (sidebarLinks.length > 0) {

        sidebarLinks.forEach((link) => {

            link.addEventListener(
                "click",
                () => {

                    /*
                        Close the sidebar before
                        following the selected link.
                    */

                    closeSidebar();


                    /*
                        Update the active state.
                    */

                    sidebarLinks.forEach((item) => {

                        item.classList.remove(
                            "active"
                        );

                    });


                    link.classList.add(
                        "active"
                    );

                }
            );

        });

    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            /*
                Allow the user to close the
                mobile sidebar with Escape.
            */

            if (
                event.key === "Escape" &&
                mobileSidebar.classList.contains("open")
            ) {

                closeSidebar();

            }

        }
    );


    /* =====================================================
       FORM SUBMISSION
    ===================================================== */

    /*
        Listen for the form's submit event.

        This happens when the user clicks:

        "Send Message"
    */

    contactForm.addEventListener(
        "submit",
        async (event) => {


            /* =================================================
               PREVENT NORMAL FORM SUBMISSION
            ================================================= */

            /*
                Normally, submitting an HTML form causes
                the browser to reload or navigate to another
                page.

                preventDefault() stops that behaviour.

                We will send the data ourselves using fetch().
            */

            event.preventDefault();


            /* =================================================
               CLEAR PREVIOUS MESSAGE
            ================================================= */

            /*
                Remove any previous success/error message.
            */

            formMessage.textContent = "";

            formMessage.className = "form-message";


            /* =================================================
               GET FORM VALUES
            ================================================= */

            /*
                FormData collects the values from the form.

                The names come from our HTML:

                name
                email
                message
            */

            const formData =
                new FormData(contactForm);


            /*
                Get the name entered by the user.

                trim() removes unnecessary spaces
                from the beginning and end.
            */

            const name =
                formData.get("name").trim();


            /*
                Get the email entered by the user.
            */

            const email =
                formData.get("email").trim();


            /*
                Get the message entered by the user.
            */

            const message =
                formData.get("message").trim();


            /* =================================================
               FRONTEND VALIDATION
            ================================================= */

            /*
                Check whether any required field is empty.
            */

            if (
                !name ||
                !email ||
                !message
            ) {

                formMessage.textContent =
                    "Please fill in all fields.";

                formMessage.classList.add(
                    "error"
                );

                return;

            }


            /* =================================================
               MESSAGE LENGTH VALIDATION
            ================================================= */

            /*
                Prevent extremely short messages.

                This gives the backend cleaner data.
            */

            if (message.length < 10) {

                formMessage.textContent =
                    "Please enter a message of at least 10 characters.";

                formMessage.classList.add(
                    "error"
                );

                return;

            }


            /* =================================================
               DISABLE SUBMIT BUTTON
            ================================================= */

            /*
                Prevent the user from accidentally sending
                the same message multiple times while the
                request is processing.
            */

            submitButton.disabled = true;


            /*
                Change the button text while waiting
                for the backend.
            */

            submitButton.textContent =
                "Sending...";


            /* =================================================
               SEND DATA TO BACKEND
            ================================================= */

            try {


                /*
                    Send a POST request to:

                    /api/contact

                    The complete URL becomes:

                    http://localhost:5000/api/contact
                */

                const response =
                    await fetch(
                        `${API_URL}/api/contact`,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            /*
                                Convert our JavaScript object
                                into JSON before sending it.
                            */

                            body: JSON.stringify({
                                name: name,
                                email: email,
                                message: message
                            })

                        }
                    );


                /* =================================================
                   CONVERT SERVER RESPONSE TO JAVASCRIPT
                ================================================= */

                /*
                    The backend will return JSON.

                    Example:

                    {
                        success: true,
                        message: "Message sent successfully."
                    }
                */

                const data =
                    await response.json();


                /* =================================================
                   CHECK SERVER RESPONSE
                ================================================= */

                /*
                    response.ok is true for successful
                    HTTP responses such as 200.

                    We also check data.success because our
                    backend will explicitly tell us whether
                    the operation succeeded.
                */

                if (
                    response.ok &&
                    data.success
                ) {


                    /* =============================================
                       SUCCESS MESSAGE
                    ============================================= */

                    formMessage.textContent =
                        data.message ||
                        "Your message has been sent successfully.";


                    formMessage.classList.add(
                        "success"
                    );


                    /* =============================================
                       CLEAR FORM
                    ============================================= */

                    /*
                        Empty the form after a successful
                        submission.
                    */

                    contactForm.reset();

                } else {


                    /* =============================================
                       SERVER ERROR MESSAGE
                    ============================================= */

                    formMessage.textContent =
                        data.message ||
                        "Unable to send your message. Please try again.";


                    formMessage.classList.add(
                        "error"
                    );

                }


            } catch (error) {


                /* =================================================
                   NETWORK / SERVER ERROR
                ================================================= */

                /*
                    This happens when the browser cannot
                    communicate with the backend.

                    For example:

                    - Backend is not running
                    - Wrong API URL
                    - Network problem
                    - CORS problem
                */

                console.error(
                    "Contact form error:",
                    error
                );


                formMessage.textContent =
                    "Unable to connect to the server. Please try again later.";


                formMessage.classList.add(
                    "error"
                );


            } finally {


                /* =================================================
                   ENABLE BUTTON AGAIN
                ================================================= */

                /*
                    Whether the request succeeds or fails,
                    allow the user to submit again.
                */

                submitButton.disabled = false;


                /*
                    Restore the original button text.
                */

                submitButton.textContent =
                    "Send Message";

            }

        }
    );


    /* =====================================================
       FOOTER YEAR
    ===================================================== */

    /*
        Find the footer paragraph.
    */

    const footer =
        document.querySelector("footer p");


    /*
        Automatically update the copyright year.
    */

    if (footer) {

        const currentYear =
            new Date().getFullYear();


        footer.textContent =
            `© ${currentYear} SkillConnect. All rights reserved.`;

    }


    /* =====================================================
       PAGE LOADED MESSAGE
    ===================================================== */

    /*
        This helps us confirm in the browser console that
        the Contact page JavaScript loaded successfully.
    */

    console.log(
        "SkillConnect Contact page JavaScript loaded successfully."
    );

});