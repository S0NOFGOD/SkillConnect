/* =========================================================
   SKILLCONNECT ABOUT PAGE JAVASCRIPT
========================================================= */


/* =========================================================
   WAIT FOR THE HTML DOCUMENT TO LOAD
========================================================= */

/*
    This waits until the entire HTML document has loaded
    before JavaScript starts interacting with the page.
*/

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       FOOTER YEAR
    ===================================================== */

    /*
        Find the footer paragraph.

        The About page currently contains:

        © 2026 SkillConnect. All rights reserved.

        We will replace the hard-coded year with the
        current year automatically.
    */

    const footerText =
        document.querySelector("footer p");


    /*
        Make sure the footer paragraph exists before
        trying to modify it.
    */

    if (footerText) {

        /*
            Get the current year from the user's browser.
        */

        const currentYear =
            new Date().getFullYear();


        /*
            Replace the old year with the current year.

            This keeps the copyright year automatically
            updated.
        */

        footerText.innerHTML =
            `© ${currentYear} SkillConnect. All rights reserved.`;

    }


    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    /*
        Select all major sections on the About page.

        We will add the "reveal" class to them using
        JavaScript.

        The CSS will then control their animation.
    */

    const sections =
        document.querySelectorAll(
            ".section, .cta"
        );


    /*
        Only create the observer if sections exist.
    */

    if (sections.length > 0) {


        /* =================================================
           INTERSECTION OBSERVER
        ================================================= */

        /*
            IntersectionObserver allows JavaScript to
            detect when an element enters the visible
            part of the screen.
        */

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
       NAVIGATION ACTIVE STATE
    ===================================================== */

    /*
        Find all navigation links.
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

                    This gives visual feedback.
                */

                link.classList.add("active");

            });

        });

    }


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