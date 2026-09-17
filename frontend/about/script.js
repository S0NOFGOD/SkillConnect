/* =========================================================
   WAIT FOR THE HTML DOCUMENT TO LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       FOOTER YEAR
    ===================================================== */

    const footerText =
        document.querySelector("footer p");


    if (footerText) {

        /*
            Get the current year from the user's browser.
        */

        const currentYear =
            new Date().getFullYear();


        footerText.innerHTML =
            `© ${currentYear} SkillConnect. All rights reserved.`;

    }


    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const sections =
        document.querySelectorAll(
            ".section, .cta"
        );


    if (sections.length > 0) {


        /* =================================================
           INTERSECTION OBSERVER
        ================================================= */

        const revealObserver =
            new IntersectionObserver(
                (entries, observer) => {


                    /*
                        Loop through every observed element.
                    */

                    entries.forEach((entry) => {


                        /*
                            Check whether the element is
                            currently visible.
                        */

                        if (entry.isIntersecting) {


                            /*
                                Add the "show" class.

                                CSS can use:

                                .reveal.show

                                to animate the element.
                            */

                            entry.target.classList.add(
                                "show"
                            );


                            /*
                                Stop watching the element.

                                The animation will therefore
                                happen only once.
                            */

                            observer.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {

                    /*
                        The animation begins when about
                        15% of the element becomes visible.
                    */

                    threshold: 0.15

                }
            );


        /* =================================================
           PREPARE AND OBSERVE SECTIONS
        ================================================= */

        /*
            Loop through all About page sections.
        */

        sections.forEach((section) => {


            /*
                Add the "reveal" class.

                The CSS for this class will initially
                hide and move the section slightly down.
            */

            section.classList.add("reveal");


            /*
                Start observing the section.
            */

            revealObserver.observe(section);

        });

    }


    /* =====================================================
       DESKTOP NAVIGATION ACTIVE STATE
    ===================================================== */

    /*
        Find all desktop navigation links.
    */

    const navigationLinks =
        document.querySelectorAll(
            ".nav-links a"
        );


    /*
        Check whether navigation links exist.
    */

    if (navigationLinks.length > 0) {


        /*
            Loop through every navigation link.
        */

        navigationLinks.forEach((link) => {


            /*
                Listen for clicks on the link.
            */

            link.addEventListener("click", () => {


                /*
                    Remove the active class from
                    all navigation links.
                */

                navigationLinks.forEach((item) => {

                    item.classList.remove("active");

                });


                /*
                    Add the active class to the
                    link that was clicked.
                */

                link.classList.add("active");

            });

        });

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

        mobileSidebar.classList.add("open");


        /*
            Show the dark overlay.
        */

        sidebarOverlay.classList.add("show");


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
       ABOUT PAGE INITIALIZATION MESSAGE
    ===================================================== */

    /*
        This message helps us confirm in the browser
        console that the About page JavaScript loaded.
    */

    console.log(
        "SkillConnect About page JavaScript loaded successfully."
    );

});