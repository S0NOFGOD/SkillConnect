"use strict";

document.addEventListener("DOMContentLoaded", () => {
    initializePaymentPage();
});

const getElement = id => document.getElementById(id);
const INITIALIZE_URL = "/api/worker-payment-page/paystack/initialize";
const STATUS_URL = "/api/worker-payment-page/paystack/status";
const DASHBOARD_URL = "../worker-dashboard/index.html";
const AMOUNT = 100000;
const CURRENCY = "NGN";

let busy = false;
let modalOpen = false;

function initializePaymentPage() {
    getElement("backBtn")?.addEventListener("click", () => {
        if (busy || modalOpen) return;

        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.assign(
                "../worker-dashboard/index.html"
            );
        }
    });

    getElement("paystackPaymentButton")
        ?.addEventListener("click", startPayment);

    getElement("paymentModalContinue")
        ?.addEventListener("click", () => {
            if (!modalOpen) return;

            getElement("paymentResultModal").hidden = true;
            document.body.classList.remove("modal-open");
            modalOpen = false;

            window.location.assign(DASHBOARD_URL);
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
    const el = getElement("paymentMessage");
    if (!el) return;

    el.textContent = message;
    el.className = `payment-message ${type}`;
    el.hidden = false;
}

function hideMessage() {
    const el = getElement("paymentMessage");
    if (!el) return;

    el.textContent = "";
    el.className = "payment-message";
    el.hidden = true;
}

function showResult(success, title, message) {
    const modal = getElement("paymentResultModal");
    const icon = getElement("paymentModalIcon");
    const heading = getElement("paymentModalTitle");
    const description = getElement("paymentModalDescription");
    const button = getElement("paymentModalContinue");

    if (!modal || !icon || !heading || !description || !button) {
        showMessage(message, success ? "info" : "error");
        return;
    }

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

function responseMessage(data, fallback) {
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

function validCheckoutURL(value) {
    try {
        const url = new URL(value);

        return url.protocol === "https:" &&
            (
                url.hostname === "checkout.paystack.com" ||
                url.hostname.endsWith(".paystack.com")
            );
    } catch {
        return false;
    }
}

async function startPayment() {
    if (busy || modalOpen) return;

    busy = true;
    setButton(true);
    showMessage("Connecting to Paystack securely...");

    try {
        const response = await API_REQUEST(INITIALIZE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });

        const data = await readJSON(response);

        if (!response.ok) {
            throw new Error(
                responseMessage(
                    data,
                    response.status === 401
                        ? "Your session has expired. Please log in again."
                        : "Unable to initialize payment. Please try again."
                )
            );
        }

        const checkoutURL =
            data.authorizationUrl || data.data?.authorization_url;

        const reference =
            data.reference || data.data?.reference;

        if (
            data.success !== true ||
            !reference ||
            !validCheckoutURL(checkoutURL)
        ) {
            throw new Error(
                "Paystack returned invalid checkout information."
            );
        }

        hideMessage();
        setButton(false);
        busy = false;

        window.location.assign(checkoutURL);
    } catch (error) {
        console.error("Payment initialization error:", error);

        showResult(
            false,
            "Unable to start payment",
            error.message ||
                "Please try again. If you may have been charged, contact support before retrying."
        );
    } finally {
        busy = false;
        setButton(false);
    }
}

function handlePaystackReturn() {
    const url = new URL(window.location.href);

    const reference =
        url.searchParams.get("reference") ||
        url.searchParams.get("trxref");

    const returnedFromPaystack =
        url.searchParams.has("reference") ||
        url.searchParams.has("trxref") ||
        url.searchParams.has("status");

    if (!returnedFromPaystack) return;

    url.searchParams.delete("reference");
    url.searchParams.delete("trxref");
    url.searchParams.delete("status");

    window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}${url.hash}`
    );

    if (!reference) {
        showResult(
            false,
            "Payment not confirmed",
            "We could not find the payment reference. Check your payment status or contact support before trying again."
        );
        return;
    }

    verifyPayment(reference);
}

async function verifyPayment(reference) {
    if (busy) return;

    busy = true;
    setButton(true);
    showMessage("Checking your payment with SkillConnect...");

    try {
        const response = await API_REQUEST(
            `${STATUS_URL}/${encodeURIComponent(reference)}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        const data = await readJSON(response);

        if (!response.ok) {
            throw new Error(
                responseMessage(
                    data,
                    response.status === 401
                        ? "Your session has expired. Please log in again."
                        : "We could not confirm your payment. Contact support if you have been charged."
                )
            );
        }

        if (
            data.success === true &&
            data.paymentStatus === "success" &&
            data.reference === reference &&
            data.amount === AMOUNT &&
            data.currency === CURRENCY
        ) {
            showResult(
                true,
                "Payment successful",
                "Your ₦1,000 payment has been confirmed. Continue to your worker dashboard."
            );
        } else if (
            data.paymentStatus === "failed" ||
            data.paymentStatus === "cancelled"
        ) {
            showResult(
                false,
                "Payment not completed",
                "Your payment was not successful. You can continue to your worker dashboard."
            );
        } else {
            showResult(
                false,
                "Payment pending",
                "Your payment has not yet been confirmed. Please wait or contact support before trying another payment."
            );
        }
    } catch (error) {
        console.error("Payment status error:", error);

        showResult(
            false,
            "Unable to confirm payment",
            `${error.message || "Please try again later."} If you have been charged, contact support before retrying.`
        );
    } finally {
        busy = false;
        setButton(false);
        hideMessage();
    }
}