/* =========================================================
   SKILLCONNECT HOMEPAGE JAVASCRIPT
========================================================= */


/* =========================================================
   WAIT FOR THE HTML DOCUMENT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    /*
        Find the hamburger button.
    */

    const menuToggle =
        document.getElementById(
            "menuToggle"
        );


    /*
        Find the mobile sidebar.
    */

    const mobileSidebar =
        document.getElementById(
            "mobileSidebar"
        );


    /*
        Find the dark overlay behind the sidebar.
    */

    const sidebarOverlay =
        document.getElementById(
            "sidebarOverlay"
        );


    /*
        Find the sidebar close button.
    */

    const sidebarClose =
        document.getElementById(
            "sidebarClose"
        );


    /*
        Find all links inside the mobile sidebar.
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
            Slide the sidebar into view.
        */

        mobileSidebar.classList.add(
            "open"
        );


        /*
            Show the dark background overlay.
        */

        sidebarOverlay.classList.add(
            "show"
        );


        /*
            Update accessibility information.
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
            Slide the sidebar out of view.
        */

        mobileSidebar.classList.remove(
            "open"
        );


        /*
            Hide the dark overlay.
        */

        sidebarOverlay.classList.remove(
            "show"
        );


        /*
            Reset accessibility information.
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
            Restore normal page scrolling.
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
                    Toggle the sidebar.
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
       SIDEBAR NAVIGATION LINKS
    ===================================================== */

    if (sidebarLinks.length > 0) {

        sidebarLinks.forEach((link) => {

            link.addEventListener(
                "click",
                () => {

                    /*
                        Close the sidebar before
                        following the link.
                    */

                    closeSidebar();

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
                Allow the Escape key to close
                the mobile sidebar.
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
       ANIMATED STATISTICS
    ===================================================== */

    const counters =
        document.querySelectorAll(
            ".counter"
        );


    /*
        This function animates one counter
        from 0 to its target number.
    */

    const animateCounter = (counter) => {


        /*
            Read the target number from HTML.
        */

        const target =
            Number(counter.dataset.target);


        /*
            Starting number.
        */

        let currentNumber = 0;


        /*
            Calculate the animation increment.
        */

        const increment =
            Math.max(
                1,
                Math.ceil(target / 100)
            );


        /*
            Create the counter animation.
        */

        const updateCounter = () => {


            /*
                Increase the current number.
            */

            currentNumber += increment;


            /*
                Prevent the number from exceeding
                its target.
            */

            if (currentNumber >= target) {

                currentNumber = target;

            }


            /*
                Display the current number
                using comma formatting.
            */

            counter.textContent =
                currentNumber.toLocaleString();


            /*
                Continue until the target is reached.
            */

            if (currentNumber < target) {

                requestAnimationFrame(
                    updateCounter
                );

            }

        };


        /*
            Start the animation.
        */

        updateCounter();

    };


    /* =====================================================
       COUNTER OBSERVER
    ===================================================== */

    if (counters.length > 0) {

        const counterObserver =
            new IntersectionObserver(
                (entries, observer) => {

                    entries.forEach((entry) => {

                        if (entry.isIntersecting) {

                            animateCounter(
                                entry.target
                            );

                            observer.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.3
                }
            );


        /*
            Observe every counter.
        */

        counters.forEach((counter) => {

            counterObserver.observe(
                counter
            );

        });

    }


    /* =====================================================
       SCROLL REVEAL ANIMATION
    ===================================================== */

    const revealElements =
        document.querySelectorAll(
            ".reveal"
        );


    if (revealElements.length > 0) {

        const revealObserver =
            new IntersectionObserver(
                (entries, observer) => {

                    entries.forEach((entry) => {

                        if (entry.isIntersecting) {

                            entry.target.classList.add(
                                "show"
                            );

                            observer.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.15
                }
            );


        /*
            Observe every reveal element.
        */

        revealElements.forEach((element) => {

            revealObserver.observe(
                element
            );

        });

    }


    /* =====================================================
       CURRENT YEAR
    ===================================================== */

    const currentYear =
        document.getElementById(
            "currentYear"
        );


    if (currentYear) {

        /*
            Automatically display the current year.
        */

        currentYear.textContent =
            new Date().getFullYear();

    }


    /* =====================================================
       HOMEPAGE INITIALIZATION MESSAGE
    ===================================================== */

    console.log(
        "SkillConnect homepage JavaScript loaded successfully."
    );

});