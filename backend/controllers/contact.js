"use strict";

const Contact = require("../models/contact");

const submitContact = async (req, res, next) => {
    try {
        const fullName = typeof req.body.fullName === "string"
            ? req.body.fullName.trim() : "";
        const email = typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase() : "";
        const message = typeof req.body.message === "string"
            ? req.body.message.trim() : "";

        if (fullName.length < 2 || fullName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 2 and 100 characters."
            });
        }

        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (!message || message.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message is required and must not exceed 5,000 characters."
            });
        }

        await Contact.create({ fullName, email, message });

        return res.status(201).json({
            success: true,
            message: "Your message was sent successfully. Thank you for contacting SkillConnect!"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { submitContact };