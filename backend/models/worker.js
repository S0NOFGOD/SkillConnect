"use strict";

const mongoose = require("mongoose");

const resendSchema = new mongoose.Schema({
    count: { type: Number, default: 0, min: 0 },
    coolDownUntil: { type: Date, default: null }
}, { _id: false });

const workerSchema = new mongoose.Schema({
    email: {
        type: String, required: true, unique: true,
        lowercase: true, trim: true, index: true
    },
    passwordHash: { type: String, default: null, select: false },
    googleId: {
        type: String, unique: true, sparse: true,
        default: null, index: true, select: false
    },
    accountType: {
        type: String, enum: ["password", "googleId"],
        default: "password", required: true
    },
    emailVerified: { type: Boolean, default: false, required: true },
    emailOtpHash: { type: String, default: null, select: false },
    emailOtpExpires: { type: Date, default: null, select: false },

    emailOtpResendAttempts: {
        emailOtpResendCount: { type: Number, default: 0, min: 0 },
        coolDownUntil: { type: Date, default: null }
    },

    phoneOtpHash: { type: String, default: null, select: false },
    phoneOtpExpires: { type: Date, default: null, select: false },
    phoneOtpResendAttempts: {
        phoneOtpResendCount: { type: Number, default: 0, min: 0 },
        coolDownUntil: { type: Date, default: null }
    },

    fullName: { type: String, trim: true, default: null },
    profilePhoto: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    phoneVerificationExpires: { type: Date, default: null },

    phoneVerificationPayments: [{
        reference: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, enum: ["NGN"], required: true },
        status: {
            type: String,
            enum: ["pending", "success", "failed"],
            default: "pending", required: true
        },
        paidAt: { type: Date, default: null },
        authorizationUrl: { type: String, default: null },
        createdAt: { type: Date, default: Date.now }
    }],

    country: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null, index: true },
    city: { type: String, trim: true, default: null, index: true },
    lga: { type: String, trim: true, default: null, index: true },

    skills: [{ type: String, trim: true }],

    services: [{
        id: { type: Number, required: true },
        skill: { type: String, trim: true, required: true },
        experience: { type: String, trim: true, default: null },
        description: { type: String, trim: true, default: null },
        portfolios: [{ type: String, trim: true }],
        date: { type: Date, default: Date.now },
        ratingAndReview: [{
            clientId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Client", required: true
            },
            fullName: { type: String, trim: true, required: true },
            rating: { type: Number, required: true, min: 1, max: 5 },
            review: { type: String, trim: true, default: "" },
            date: { type: Date, default: Date.now }
        }],
        serviceCountDown: {type: Date,default: null},
        adminApproval: {
            type: String,
            enum: ["in review", "approved", "rejected"],
            default: "in review"
        },
        adminResponse: {
            type: String, trim: true,
            default: "Your service is currently under review. It may take up to 24 hours for an admin update."
        }
    }],

    profileCompleted: { type: Boolean, default: false, required: true },

    contacts: [{
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client", required: true
        },
        date: { type: Date, default: Date.now }
    }],
    totalContact: { type: Number, default: 0 },

    refreshTokenHash: { type: String, default: null, select: false },
    googleExchangeCode: { type: String, default: null, select: false },

    passwordResetOtpHash: { type: String, default: null, select: false },
    passwordResetOtpExpires: { type: Date, default: null, select: false },

    passwordResetOtpResendAttempts: {
        passwordResetOtpResendCount: { type: Number, default: 0, min: 0 },
        coolDownUntil: { type: Date, default: null }
    },

    passwordResetVerified: { type: Boolean, default: false, select: false },
    passwordResetVerifiedAt: { type: Date, default: null, select: false },
    resetAuthorizationExpires: { type: Date, default: null, select: false }

}, { timestamps: true });

module.exports = mongoose.models.Worker ||
    mongoose.model("Worker", workerSchema);