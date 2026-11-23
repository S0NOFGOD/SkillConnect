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

        const currentYear =
            new Date().getFullYear();


        footerText.innerHTML =
            `© ${currentYear} SkillConnect. All rights reserved.`;

    }


    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const revealElements =
        document.querySelectorAll(".reveal");


    if (!("IntersectionObserver" in window)) {

        revealElements.forEach((element) => {

            element.classList.add("show");

        });

    } else {

        const revealObserver =
            new IntersectionObserver(
                (entries, observer) => {

                    entries.forEach((entry) => {

                        if (entry.isIntersecting) {

                            entry.target.classList.add("show");

                            observer.unobserve(entry.target);

                        }

                    });

                },
                {
                    threshold: 0.15
                }
            );


        revealElements.forEach((element) => {

            revealObserver.observe(element);

        });

    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const menuToggle =
        document.getElementById("menuToggle");


    const mobileSidebar =
        document.getElementById("mobileSidebar");


    const sidebarOverlay =
        document.getElementById("sidebarOverlay");


    const sidebarClose =
        document.getElementById("sidebarClose");


    const sidebarLinks =
        document.querySelectorAll(".sidebar-links a");


    /* =====================================================
       OPEN MOBILE SIDEBAR
    ===================================================== */

    function openSidebar() {

        mobileSidebar.classList.add("open");

        sidebarOverlay.classList.add("show");

        mobileSidebar.setAttribute(
            "aria-hidden",
            "false"
        );

        mobileSidebar.removeAttribute("inert");

        menuToggle.setAttribute(
            "aria-expanded",
            "true"
        );

        menuToggle.setAttribute(
            "aria-label",
            "Close navigation menu"
        );

        document.body.style.overflow = "hidden";

    }


    /* =====================================================
       CLOSE MOBILE SIDEBAR
    ===================================================== */

    function closeSidebar() {

        mobileSidebar.classList.remove("open");

        sidebarOverlay.classList.remove("show");

        mobileSidebar.setAttribute(
            "aria-hidden",
            "true"
        );

        mobileSidebar.setAttribute(
            "inert",
            ""
        );

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

        menuToggle.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        document.body.style.overflow = "";

    }


    /* =====================================================
       HAMBURGER BUTTON
    ===================================================== */

    if (menuToggle) {

        menuToggle.addEventListener(
            "click",
            () => {

                const isOpen =
                    mobileSidebar.classList.contains("open");


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
       SIDEBAR LINKS
    ===================================================== */

    if (sidebarLinks.length > 0) {

        sidebarLinks.forEach((link) => {

            link.addEventListener(
                "click",
                closeSidebar
            );

        });

    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

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

    console.log(
        "SkillConnect About page JavaScript loaded successfully."
    );

});