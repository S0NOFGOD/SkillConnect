"use strict";

document.addEventListener("DOMContentLoaded", initializePaymentPage);

const getElement = id => document.getElementById(id);

const INITIALIZE_URL = "/api/worker-payment-page/paystack/initialize";
const DASHBOARD_URL = "../worker-dashboard/index.html";
const AUTH_URL = "../worker-authentication/index.html";

let busy = false;
let modalOpen = false;
let continueDestination = DASHBOARD_URL;

function initializePaymentPage() {
    getElement("backBtn")?.addEventListener("click", () => {
        if (busy || modalOpen) return;
        window.location.assign(DASHBOARD_URL);
    });

    getElement("paystackPaymentButton")
        ?.addEventListener("click", startPayment);

    getElement("paymentModalContinue")
        ?.addEventListener("click", () => {
            if (!modalOpen) return;

            getElement("paymentResultModal").hidden = true;
            document.body.classList.remove("modal-open");
            modalOpen = false;

            window.location.assign(continueDestination);
        });

    const year = getElement("currentYear");
    if (year) year.textContent = new Date().getFullYear();

    handlePaystackReturn();
}

function setButton(connecting) {
    const button = getElement("paystackPaymentButton");
    const label = getElement("paystackButtonText");

    if (button) {
        button.disabled = connecting;
        button.setAttribute("aria-busy", String(connecting));
    }

    if (label) {
        label.textContent = connecting
            ? "Connecting..."
            : "Pay with Paystack";
    }
}

function showMessage(message, type = "info") {
    const element = getElement("paymentMessage");
    if (!element) return;

    element.textContent = message;
    element.className = `payment-message ${type}`;
    element.hidden = false;
}

function hideMessage() {
    const element = getElement("paymentMessage");
    if (!element) return;

    element.textContent = "";
    element.className = "payment-message";
    element.hidden = true;
}

function showResult(success, title, message, destination = DASHBOARD_URL) {
    const modal = getElement("paymentResultModal");
    const icon = getElement("paymentModalIcon");
    const heading = getElement("paymentModalTitle");
    const description = getElement("paymentModalDescription");
    const button = getElement("paymentModalContinue");

    if (!modal || !icon || !heading || !description || !button) {
        showMessage(message, success ? "info" : "error");
        return;
    }

    continueDestination = destination;
    modalOpen = true;

    icon.className = `payment-modal-icon ${success ? "success" : "error"}`;
    icon.textContent = success ? "✓" : "!";
    heading.textContent = title;
    description.textContent = message;
    button.textContent = "Continue";

    modal.hidden = false;
    document.body.classList.add("modal-open");
    button.focus();
}

function readMessage(data, fallback) {
    return typeof data?.message === "string" && data.message.trim()
        ? data.message
        : fallback;
}

async function readJSON(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function isAuthenticationError(response, data) {
    return response.status === 401 ||
        data?.code === "AUTHENTICATION_REQUIRED" ||
        data?.code === "INVALID_ACCESS_TOKEN";
}

async function startPayment() {
    if (busy || modalOpen) return;

    busy = true;
    setButton(true);
    hideMessage();
    showMessage("Connecting to Paystack securely...");

    try {
        // API_REQUEST handles access-token refresh automatically.
        const response = await API_REQUEST(INITIALIZE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({})
        });

        const data = await readJSON(response);

        if (!response.ok) {
            if (isAuthenticationError(response, data)) {
                throw Object.assign(
                    new Error(readMessage(
                        data,
                        "Your session has expired. Please log in again."
                    )),
                    { authenticationError: true }
                );
            }

            if (data.code === "PROFILE_VERIFICATION_ACTIVE") {
                throw Object.assign(
                    new Error(data.message),
                    { activeProfile: true }
                );
            }

            throw new Error(readMessage(
                data,
                "Unable to initialize payment. Please try again."
            ));
        }

        const checkoutURL = data.authorizationUrl;

        let validURL = false;

        try {
            const url = new URL(checkoutURL);

            validURL = url.protocol === "https:" &&
                url.hostname === "checkout.paystack.com";
        } catch {
            validURL = false;
        }

        if (data.success !== true || !validURL || !data.reference) {
            throw new Error("Paystack returned invalid checkout information.");
        }

        hideMessage();
        window.location.assign(checkoutURL);

    } catch (error) {
        console.error("Payment initialization error:", error);

        if (error.authenticationError) {
            showResult(
                false,
                "Session expired",
                error.message,
                AUTH_URL
            );
        } else if (error.activeProfile) {
            showResult(
                false,
                "Verification already active",
                error.message,
                DASHBOARD_URL
            );
        } else {
            showResult(
                false,
                "Unable to start payment",
                error.message ||
                    "Please try again. If you may have been charged, contact support."
            );
        }
    } finally {
        busy = false;
        setButton(false);
        hideMessage();
    }
}

function handlePaystackReturn() {
    const url = new URL(window.location.href);

    const payment = url.searchParams.get("payment");
    const message = url.searchParams.get("message");

    if (!payment) return;

    url.searchParams.delete("payment");
    url.searchParams.delete("message");

    window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}${url.hash}`
    );

    if (payment === "success") {
        showResult(
            true,
            "Payment successful",
            message ||
                "Your ₦1,000 payment has been confirmed. Your profile-verification access is active for 30 days."
        );
    } else {
        showResult(
            false,
            "Payment not completed",
            message ||
                "Your payment was unsuccessful or cancelled. You can try again from this page."
        );
    }
}