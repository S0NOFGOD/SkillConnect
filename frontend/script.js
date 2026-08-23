/* =========================================================
   SKILLCONNECT HOMEPAGE JAVASCRIPT
========================================================= */


/* =========================================================
   WAIT FOR THE HTML DOCUMENT
========================================================= */

/*
    This event waits until the HTML page has been completely
    loaded before JavaScript starts looking for elements.
*/

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       MOBILE NAVIGATION
    ===================================================== */

    /*
        Find the mobile menu button.

        HTML:
        <button id="menuToggle">
    */

    const menuToggle = document.getElementById("menuToggle");


    /*
        Find the navigation links container.

        HTML:
        <div id="navLinks">
    */

    const navLinks = document.getElementById("navLinks");


    /*
        Check that both elements exist before adding events.

        This prevents JavaScript errors if either element
        is accidentally removed from the HTML.
    */

    if (menuToggle && navLinks) {


        /* =================================================
           OPEN/CLOSE MOBILE MENU
        ================================================= */

        menuToggle.addEventListener("click", () => {


            /*
                Add or remove the "show" class.

                CSS controls the actual appearance
                of the menu through:

                .nav-links.show
            */

            navLinks.classList.toggle("show");


            /*
                Check whether the menu is currently open.
            */

            const menuIsOpen =
                navLinks.classList.contains("show");


            /*
                Update accessibility information.

                "true" means the menu is open.

                "false" means the menu is closed.
            */

            menuToggle.setAttribute(
                "aria-expanded",
                menuIsOpen
            );


            /*
                Change the button icon.

                ☰ = closed menu

                ✕ = open menu
            */

            menuToggle.textContent =
                menuIsOpen ? "✕" : "☰";

        });


        /* =================================================
           CLOSE MENU AFTER CLICKING A LINK
        ================================================= */

        /*
            Select every navigation link.
        */

        const navigationLinks =
            navLinks.querySelectorAll("a");


        /*
            Loop through every navigation link.
        */

        navigationLinks.forEach((link) => {


            /*
                When a navigation link is clicked,
                close the mobile menu.
            */

            link.addEventListener("click", () => {

                navLinks.classList.remove("show");

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

                menuToggle.textContent = "☰";

            });

        });

    }


    /* =====================================================
       ANIMATED STATISTICS
    ===================================================== */

    /*
        Select all elements with the class "counter".

        These elements contain:

        data-target="5000"

        data-target="10000"

        data-target="25000"
    */

    const counters =
        document.querySelectorAll(".counter");


    /*
        This function animates one counter
        from 0 to its target number.
    */

    const animateCounter = (counter) => {


        /*
            Read the target number from the HTML.

            Example:

            data-target="5000"

            becomes:

            5000
        */

        const target =
            Number(counter.dataset.target);


        /*
            Starting number.
        */

        let currentNumber = 0;


        /*
            Calculate how much the number should increase
            during each animation step.
        */

        const increment =
            Math.max(1, Math.ceil(target / 100));


        /*
            Create the counter animation.
        */

        const updateCounter = () => {


            /*
                Increase the current number.
            */

            currentNumber += increment;


            /*
                Make sure the counter does not go beyond
                its final target.
            */

            if (currentNumber >= target) {

                currentNumber = target;

            }


            /*
                Display the current number.

                toLocaleString() changes:

                5000

                into:

                5,000
            */

            counter.textContent =
                currentNumber.toLocaleString();


            /*
                Continue the animation until
                the target is reached.
            */

            if (currentNumber < target) {

                requestAnimationFrame(updateCounter);

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

    /*
        IntersectionObserver allows JavaScript to detect
        when an element becomes visible on the screen.
    */

    if (counters.length > 0) {


        const counterObserver =
            new IntersectionObserver(
                (entries, observer) => {


                    /*
                        Check every observed counter.
                    */

                    entries.forEach((entry) => {


                        /*
                            Only start animation when the
                            counter becomes visible.
                        */

                        if (entry.isIntersecting) {


                            /*
                                Animate this counter.
                            */

                            animateCounter(
                                entry.target
                            );


                            /*
                                Stop observing this counter.

                                This prevents the animation
                                from restarting every time
                                the user scrolls away and back.
                            */

                            observer.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    /*
                        Start when approximately 30% of
                        the element becomes visible.
                    */

                    threshold: 0.3
                }
            );


        /*
            Start observing every counter.
        */

        counters.forEach((counter) => {

            counterObserver.observe(counter);

        });

    }


    /* =====================================================
       SCROLL REVEAL ANIMATION
    ===================================================== */

    /*
        Select all elements that have the
        "reveal" class.
    */

    const revealElements =
        document.querySelectorAll(".reveal");


    /*
        Only create the observer if reveal elements exist.
    */

    if (revealElements.length > 0) {


        /*
            Create an IntersectionObserver for
            scroll-reveal elements.
        */

        const revealObserver =
            new IntersectionObserver(
                (entries, observer) => {


                    /*
                        Check every observed element.
                    */

                    entries.forEach((entry) => {


                        /*
                            Check whether the element
                            is visible.
                        */

                        if (entry.isIntersecting) {


                            /*
                                Add the "show" class.

                                CSS changes:

                                .reveal

                                into:

                                .reveal.show
                            */

                            entry.target.classList.add(
                                "show"
                            );


                            /*
                                Stop observing this element.

                                This means the animation
                                happens only once.
                            */

                            observer.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    /*
                        Start the animation when
                        approximately 15% of the
                        section becomes visible.
                    */

                    threshold: 0.15
                }
            );


        /*
            Observe every reveal element.
        */

        revealElements.forEach((element) => {

            revealObserver.observe(element);

        });

    }


    /* =====================================================
       CURRENT YEAR
    ===================================================== */

    /*
        Find the element containing the copyright year.

        HTML:

        <span id="currentYear">2026</span>
    */

    const currentYear =
        document.getElementById("currentYear");


    /*
        Make sure the element exists.
    */

    if (currentYear) {


        /*
            Get the current year from the user's
            computer/browser and display it.

            This prevents us from manually changing
            the year every January.
        */

        currentYear.textContent =
            new Date().getFullYear();

    }


    /* =====================================================
       HOMEPAGE INITIALIZATION MESSAGE
    ===================================================== */

    /*
        This confirms in the browser console that
        SkillConnect's homepage JavaScript loaded.
    */

    console.log(
        "SkillConnect homepage JavaScript loaded successfully."
    );

});