"use strict";

const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
    {
        ipAddress: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        latitude: {
            type: Number,
            required: true,
            min: -90,
            max: 90
        },

        longitude: {
            type: Number,
            required: true,
            min: -180,
            max: 180
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Client", clientSchema);