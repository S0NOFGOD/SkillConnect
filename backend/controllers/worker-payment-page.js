"use strict";

const crypto = require("crypto");
const axios = require("axios");

const Worker = require("../models/worker");
const {
    authenticateWorker
} = require("./worker-authentication");

const PAYSTACK_URL = "https://api.paystack.co";
const AMOUNT = 100000; // ₦1,000 in kobo
const CURRENCY = "NGN";
const ACCESS_DURATION = 30 * 24 * 60 * 60 * 1000;

function paystackHeaders() {
    const key = process.env.PAYSTACK_SECRET_KEY;

    if (!key) {
        throw new Error("Paystack secret key is not configured.");
    }

    return {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
    };
}

function authenticateRequest(req, res) {
    const authentication = authenticateWorker(req);

    if (!authentication.valid) {
        res.status(authentication.status || 401).json({
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
        transaction.reference !== reference
    ) {
        throw new Error("Paystack transaction verification failed.");
    }

    if (
        transaction.amount !== AMOUNT ||
        transaction.currency !== CURRENCY
    ) {
        throw new Error("Paystack transaction amount or currency is invalid.");
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

    // A payment can activate access only once.
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
        return {
            alreadyProcessed: false,
            expiresAt
        };
    }

    // Repeated status requests or webhooks must not extend access.
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
        throw new Error("No matching pending payment record exists.");
    }

    return {
        alreadyProcessed: true,
        expiresAt: worker.profileVerificationExpires
    };
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
        // Authentication belongs to the controller, not the route.
        if (!authenticateRequest(req, res)) return;

        if (
            !process.env.PAYSTACK_CALLBACK_URL ||
            !process.env.PAYSTACK_SECRET_KEY
        ) {
            return res.status(500).json({
                success: false,
                message: "Payment configuration is incomplete."
            });
        }

        const worker = await Worker.findById(req.workerId).select(
            "email profileVerificationExpires phoneVerificationPayments"
        );

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker account not found."
            });
        }

        // Do not charge again while profile-verification access is active.
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

        // Save the reference before contacting Paystack.
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
                        authorizationUrl: null,
                        createdAt: new Date()
                    }
                }
            }
        );

        if (saveResult.modifiedCount !== 1) {
            return res.status(500).json({
                success: false,
                message: "Unable to create a payment record. Please try again."
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

        let checkoutURLIsValid = false;

        try {
            const url = new URL(authorizationUrl);

            checkoutURLIsValid =
                url.protocol === "https:" &&
                (
                    url.hostname === "checkout.paystack.com" ||
                    url.hostname.endsWith(".paystack.com")
                );
        } catch {
            checkoutURLIsValid = false;
        }

        if (
            response.data?.status !== true ||
            !checkoutURLIsValid ||
            payment?.reference !== reference
        ) {
            return res.status(502).json({
                success: false,
                message:
                    "Paystack did not return valid checkout information. Please check your payment status before retrying."
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
                "We could not confirm checkout initialization. Please check your payment status before retrying."
        });
    }
}

async function verifyPaystackPaymentStatus(req, res) {
    try {
        // Authentication belongs to the controller, not the route.
        if (!authenticateRequest(req, res)) return;

        const { reference } = req.params;

        if (
            !reference ||
            reference.length > 200 ||
            !/^[a-zA-Z0-9_-]+$/.test(reference)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment reference."
            });
        }

        const worker = await Worker.findOne({
            _id: req.workerId,
            "phoneVerificationPayments.reference": reference
        }).select("phoneVerificationPayments");

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Payment reference not found."
            });
        }

        const payment = worker.phoneVerificationPayments.find(
            item => item.reference === reference
        );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment reference not found."
            });
        }

        // Verify directly with Paystack. Never trust the browser alone.
        const transaction = await verifyWithPaystack(reference);
        verifyOwner(transaction, req.workerId);

        if (transaction.status === "success") {
            const result = await recordSuccess(req.workerId, reference);

            return res.status(200).json({
                success: true,
                paymentStatus: "success",
                message: "Payment verified successfully.",
                reference,
                amount: AMOUNT,
                currency: CURRENCY,
                profileVerificationExpires:
                    result.expiresAt?.toISOString() || null
            });
        }

        if (
            transaction.status === "failed" ||
            transaction.status === "abandoned"
        ) {
            await recordFailure(req.workerId, reference);

            return res.status(200).json({
                success: true,
                paymentStatus: "failed",
                message:
                    transaction.status === "abandoned"
                        ? "Payment was cancelled or abandoned."
                        : "Payment failed.",
                reference,
                amount: AMOUNT,
                currency: CURRENCY
            });
        }

        return res.status(200).json({
            success: true,
            paymentStatus: "pending",
            message: "Paystack has not confirmed the payment yet.",
            reference,
            amount: AMOUNT,
            currency: CURRENCY
        });
    } catch (error) {
        console.error(
            "Paystack status error:",
            error.response?.data || error.message
        );

        return res.status(502).json({
            success: false,
            message:
                "Unable to verify payment right now. If you have been charged, do not pay again until the status is checked."
        });
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

    const receivedBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    return (
        receivedBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    );
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

        // Independently verify the transaction with Paystack.
        const transaction = await verifyWithPaystack(reference);

        if (transaction.status !== "success") {
            return res.status(200).json({
                success: true,
                message: "Payment is not confirmed as successful."
            });
        }

        const workerId = transaction.metadata?.workerId;

        if (
            !workerId ||
            !/^[a-f0-9]{24}$/i.test(String(workerId))
        ) {
            return res.status(400).json({
                success: false,
                message: "Worker information is invalid."
            });
        }

        verifyOwner(transaction, workerId);

        // Only a recorded payment belonging to this worker can grant access.
        const paymentExists = await Worker.exists({
            _id: workerId,
            "phoneVerificationPayments.reference": reference
        });

        if (!paymentExists) {
            return res.status(404).json({
                success: false,
                message: "Payment reference not found."
            });
        }

        await recordSuccess(workerId, reference);

        return res.status(200).json({
            success: true,
            message: "Payment verified and processed."
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
    verifyPaystackPaymentStatus,
    handlePaystackWebhook
};