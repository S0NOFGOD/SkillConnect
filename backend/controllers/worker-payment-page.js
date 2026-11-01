"use strict";

const crypto = require("crypto");
const axios = require("axios");

const Worker = require("../models/worker");

const {
    authenticateWorker
} = require("./worker-authentication");

const PAYSTACK_URL = "https://api.paystack.co";
const AMOUNT = 100000;
const CURRENCY = "NGN";
const ACCESS_DURATION = 30 * 24 * 60 * 60 * 1000;

function paystackHeaders() {
    const key = process.env.PAYSTACK_SECRET_KEY;

    if (!key) throw new Error("Paystack secret key is missing.");

    return {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
    };
}

function authenticateRequest(req, res) {
    const authentication = authenticateWorker(req);

    if (!authentication.valid) {
        res.status(401).json({
            success: false,
            code: "AUTHENTICATION_REQUIRED",
            message: authentication.message ||
                "Your session has expired. Please log in again."
        });

        return false;
    }

    req.workerId = authentication.userId;
    return true;
}

async function verifyWithPaystack(reference) {
    const response = await axios.get(
        `${PAYSTACK_URL}/transaction/verify/${encodeURIComponent(reference)}`,
        {
            headers: paystackHeaders(),
            timeout: 15000
        }
    );

    const transaction = response.data?.data;

    if (
        response.data?.status !== true ||
        !transaction ||
        transaction.reference !== reference ||
        transaction.amount !== AMOUNT ||
        transaction.currency !== CURRENCY
    ) {
        throw new Error("Paystack transaction verification failed.");
    }

    return transaction;
}

function verifyOwner(transaction, workerId) {
    const metadata = transaction.metadata;

    if (
        !metadata ||
        String(metadata.workerId) !== String(workerId) ||
        metadata.purpose !== "phone-verification"
    ) {
        throw new Error("Payment ownership could not be verified.");
    }
}

async function recordSuccess(workerId, reference) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCESS_DURATION);

    const result = await Worker.updateOne(
        {
            _id: workerId,
            phoneVerificationPayments: {
                $elemMatch: {
                    reference,
                    status: "pending"
                }
            }
        },
        {
            $set: {
                "phoneVerificationPayments.$.status": "success",
                "phoneVerificationPayments.$.paidAt": now,
                profileVerificationExpires: expiresAt
            }
        }
    );

    if (result.modifiedCount === 1) {
        return expiresAt;
    }

    const worker = await Worker.findOne({
        _id: workerId,
        phoneVerificationPayments: {
            $elemMatch: {
                reference,
                status: "success"
            }
        }
    }).select("profileVerificationExpires");

    if (!worker) {
        throw new Error("Payment record could not be updated.");
    }

    return worker.profileVerificationExpires;
}

async function recordFailure(workerId, reference) {
    await Worker.updateOne(
        {
            _id: workerId,
            phoneVerificationPayments: {
                $elemMatch: {
                    reference,
                    status: "pending"
                }
            }
        },
        {
            $set: {
                "phoneVerificationPayments.$.status": "failed"
            }
        }
    );
}

async function initializePaystackPayment(req, res) {
    try {
        if (!authenticateRequest(req, res)) return;

        if (
            !process.env.PAYSTACK_SECRET_KEY ||
            !process.env.PAYSTACK_CALLBACK_URL
        ) {
            return res.status(500).json({
                success: false,
                message: "Payment configuration is incomplete."
            });
        }

        const worker = await Worker.findById(req.workerId)
            .select("email profileVerificationExpires");

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account not found."
            });
        }

        if (
            worker.profileVerificationExpires &&
            new Date(worker.profileVerificationExpires) > new Date()
        ) {
            return res.status(409).json({
                success: false,
                code: "PROFILE_VERIFICATION_ACTIVE",
                message:
                    `Your profile-verification access is already active until ${new Date(worker.profileVerificationExpires).toISOString()}.`
            });
        }

        const reference =
            `SC-PHONE-${worker._id}-` +
            crypto.randomBytes(16).toString("hex");

        const saveResult = await Worker.updateOne(
            { _id: worker._id },
            {
                $push: {
                    phoneVerificationPayments: {
                        reference,
                        amount: AMOUNT,
                        currency: CURRENCY,
                        status: "pending",
                        paidAt: null,
                        authorizationUrl: null
                    }
                }
            }
        );

        if (saveResult.modifiedCount !== 1) {
            return res.status(500).json({
                success: false,
                message: "Unable to create payment record."
            });
        }

        const response = await axios.post(
            `${PAYSTACK_URL}/transaction/initialize`,
            {
                email: worker.email,
                amount: AMOUNT,
                currency: CURRENCY,
                reference,
                callback_url: process.env.PAYSTACK_CALLBACK_URL,
                metadata: {
                    workerId: String(worker._id),
                    purpose: "phone-verification"
                }
            },
            {
                headers: paystackHeaders(),
                timeout: 15000
            }
        );

        const payment = response.data?.data;
        const authorizationUrl = payment?.authorization_url;

        let validURL = false;

        try {
            const url = new URL(authorizationUrl);

            validURL =
                url.protocol === "https:" &&
                url.hostname === "checkout.paystack.com";
        } catch {
            validURL = false;
        }

        if (
            response.data?.status !== true ||
            !validURL ||
            payment?.reference !== reference
        ) {
            return res.status(502).json({
                success: false,
                message: "Paystack returned invalid checkout information."
            });
        }

        await Worker.updateOne(
            {
                _id: worker._id,
                "phoneVerificationPayments.reference": reference
            },
            {
                $set: {
                    "phoneVerificationPayments.$.authorizationUrl":
                        authorizationUrl
                }
            }
        );

        return res.status(200).json({
            success: true,
            authorizationUrl,
            reference
        });

    } catch (error) {
        console.error(
            "Paystack initialization error:",
            error.response?.data || error.message
        );

        return res.status(502).json({
            success: false,
            message:
                "Unable to initialize payment. Please try again."
        });
    }
}

function redirectToPaymentPage(res, payment, message) {
    const frontendURL = process.env.WORKER_PAYMENT_PAGE_URL;

    if (!frontendURL) {
        return res.status(500).send("Payment return URL is not configured.");
    }

    const url = new URL(frontendURL);

    url.searchParams.set("payment", payment);
    url.searchParams.set("message", message);

    return res.redirect(303, url.toString());
}

async function handlePaystackCallback(req, res) {
    try {
        const reference = req.query.reference || req.query.trxref;

        if (
            typeof reference !== "string" ||
            !/^[a-zA-Z0-9_-]{1,200}$/.test(reference)
        ) {
            return redirectToPaymentPage(
                res,
                "failed",
                "Invalid payment reference. Please contact support if you have been charged."
            );
        }

        const worker = await Worker.findOne({
            "phoneVerificationPayments.reference": reference
        }).select("phoneVerificationPayments");

        if (!worker) {
            return redirectToPaymentPage(
                res,
                "failed",
                "Payment reference not found."
            );
        }

        const payment = worker.phoneVerificationPayments.find(
            item => item.reference === reference
        );

        if (!payment) {
            return redirectToPaymentPage(
                res,
                "failed",
                "Payment record not found."
            );
        }

        const transaction = await verifyWithPaystack(reference);

        verifyOwner(transaction, worker._id);

        if (transaction.status === "success") {
            await recordSuccess(worker._id, reference);

            return redirectToPaymentPage(
                res,
                "success",
                "Your ₦1,000 payment has been confirmed. Your profile-verification access is active for 30 days."
            );
        }

        if (
            transaction.status === "failed" ||
            transaction.status === "abandoned"
        ) {
            await recordFailure(worker._id, reference);

            return redirectToPaymentPage(
                res,
                "failed",
                transaction.status === "abandoned"
                    ? "Your payment was cancelled."
                    : "Your payment was unsuccessful. You can try again."
            );
        }

        return redirectToPaymentPage(
            res,
            "failed",
            "Your payment is still pending confirmation. Please contact support before trying another payment."
        );

    } catch (error) {
        console.error(
            "Paystack callback error:",
            error.response?.data || error.message
        );

        return redirectToPaymentPage(
            res,
            "failed",
            "Unable to confirm your payment. If you have been charged, contact support before trying again."
        );
    }
}

function validWebhookSignature(req) {
    const key = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers["x-paystack-signature"];

    if (
        !key ||
        typeof signature !== "string" ||
        !/^[a-f0-9]{128}$/i.test(signature) ||
        !Buffer.isBuffer(req.rawBody)
    ) {
        return false;
    }

    const expected = crypto
        .createHmac("sha512", key)
        .update(req.rawBody)
        .digest("hex");

    const received = Buffer.from(signature, "hex");
    const calculated = Buffer.from(expected, "hex");

    return received.length === calculated.length &&
        crypto.timingSafeEqual(received, calculated);
}

async function handlePaystackWebhook(req, res) {
    try {
        if (!validWebhookSignature(req)) {
            return res.status(401).json({
                success: false,
                message: "Invalid Paystack webhook signature."
            });
        }

        if (req.body?.event !== "charge.success") {
            return res.status(200).json({ success: true });
        }

        const reference = req.body.data?.reference;

        if (
            typeof reference !== "string" ||
            !/^[a-zA-Z0-9_-]{1,200}$/.test(reference)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment reference."
            });
        }

        const transaction = await verifyWithPaystack(reference);

        if (transaction.status !== "success") {
            return res.status(200).json({ success: true });
        }

        const workerId = transaction.metadata?.workerId;

        if (!workerId || !/^[a-f0-9]{24}$/i.test(String(workerId))) {
            return res.status(400).json({
                success: false,
                message: "Invalid worker information."
            });
        }

        verifyOwner(transaction, workerId);

        const paymentExists = await Worker.exists({
            _id: workerId,
            "phoneVerificationPayments.reference": reference
        });

        if (!paymentExists) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found."
            });
        }

        await recordSuccess(workerId, reference);

        return res.status(200).json({
            success: true,
            message: "Payment processed successfully."
        });

    } catch (error) {
        console.error(
            "Paystack webhook error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to process payment notification."
        });
    }
}

module.exports = {
    initializePaystackPayment,
    handlePaystackCallback,
    handlePaystackWebhook
};