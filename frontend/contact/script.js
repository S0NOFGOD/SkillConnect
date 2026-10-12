"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const nameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");
    const messageInput = document.getElementById("message");
    const submitButton = document.getElementById("submitButton");
    const formMessage = document.getElementById("formMessage");

    const modal = document.getElementById("contactModal");
    const modalIcon = document.getElementById("modalIcon");
    const modalTitle = document.getElementById("modalTitle");
    const modalText = document.getElementById("modalText");
    const modalContinue = document.getElementById("modalContinue");

    // Mobile navigation
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("mobileSidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidebarClose = document.getElementById("sidebarClose");

    // Get the full API URL from config.js
    const CONTACT_ENDPOINT = API_ENDPOINT("/api/contact");

    let isSending = false;
    let lastFocusedElement = null;

    function openMenu() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
        menuToggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
        sidebarClose.focus();
    }

    function closeMenu() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
        menuToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        menuToggle.focus();
    }

    menuToggle?.addEventListener("click", openMenu);
    sidebarClose?.addEventListener("click", closeMenu);
    sidebarOverlay?.addEventListener("click", closeMenu);

    sidebar?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("show");
            menuToggle.setAttribute("aria-expanded", "false");
            document.body.style.overflow = "";
        });
    });

    // Modal
    function showModal(title, message, type = "error") {
        lastFocusedElement = document.activeElement;

        modalTitle.textContent = title;
        modalText.textContent = message;
        modalIcon.textContent = type === "success" ? "✓" : "!";
        modal.classList.toggle("success", type === "success");
        modal.hidden = false;

        document.body.classList.add("modal-open");
        modalContinue.focus();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove("modal-open");

        if (lastFocusedElement?.isConnected) {
            lastFocusedElement.focus();
        }
    }

    modalContinue.addEventListener("click", closeModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }

        if (event.key === "Escape" && sidebar.classList.contains("open")) {
            closeMenu();
        }
    });

    // Frontend validation
    function validateForm() {
        const fullName = nameInput.value.trim();
        const email = emailInput.value.trim();
        const message = messageInput.value.trim();

        [nameInput, emailInput, messageInput].forEach(input => {
            input.classList.remove("invalid");
            input.removeAttribute("aria-invalid");
        });

        let error = "";
        let invalidInput = null;

        if (fullName.length < 2 || fullName.length > 100) {
            error = "Please enter your name (2–100 characters).";
            invalidInput = nameInput;
        } else if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            error = "Please enter a valid email address.";
            invalidInput = emailInput;
        } else if (!message || message.length > 5000) {
            error = "Please enter a message of 1–5,000 characters.";
            invalidInput = messageInput;
        }

        if (invalidInput) {
            invalidInput.classList.add("invalid");
            invalidInput.setAttribute("aria-invalid", "true");
            showModal("Please check your details", error);
            return null;
        }

        return { fullName, email, message };
    }

    [nameInput, emailInput, messageInput].forEach(input => {
        input.addEventListener("input", () => {
            input.classList.remove("invalid");
            input.removeAttribute("aria-invalid");
        });
    });

    // Submit contact form
    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (isSending) return;

        const data = validateForm();
        if (!data) return;

        isSending = true;
        submitButton.disabled = true;
        submitButton.textContent = "Sending…";
        formMessage.textContent = "";
        formMessage.className = "form-message";

        try {
            // Send directly to the URL generated by config.js
            const response = await fetch(CONTACT_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Unable to send your message. Please try again."
                );
            }

            form.reset();

            formMessage.textContent =
                result.message || "Your message was sent successfully.";
            formMessage.classList.add("success");

            showModal(
                "Message Sent Successfully!",
                result.message ||
                "Thank you for contacting SkillConnect. We'll get back to you soon.",
                "success"
            );

        } catch (error) {
            showModal(
                "Message Not Sent",
                error.message ||
                "Something went wrong. Please check your connection and try again."
            );
        } finally {
            isSending = false;
            submitButton.disabled = false;
            submitButton.textContent = "Send Message";
        }
    });
});