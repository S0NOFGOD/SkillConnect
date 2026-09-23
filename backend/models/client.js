const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String
    },
    googleId: {
        type: String,
        sparse: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    profileCompleted: {
        type: Boolean,
        default: false
    },
    emailOtp: {
        type: String
    },
    emailOtpExpires: {
        type: Date
    },
    passwordResetOtp: {
        type: String
    },
    passwordResetOtpExpiry: {
        type: Date
    },
    exchangeCode: {
        type: String
    },
    refreshTokenHash: {
        type: String
    }
});

module.exports = mongoose.model("Client", clientSchema);