"use strict";

const Worker = require("../models/worker");

const bcrypt = require("bcryptjs");


const changeWorkerPassword = async (req, res) => {

    try {

        const {
            email,
            password,
            confirmPassword
        } = req.body;


        // BACKEND VALIDATION: Required fields.
        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password ||
            typeof confirmPassword !== "string" ||
            !confirmPassword
        ) {

            return res.status(400).json({

                success: false,

                message: "Email, new password and confirm password are required."

            });

        }


        // BACKEND VALIDATION: Email format.
        const normalizedEmail = email.trim().toLowerCase();

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(normalizedEmail)) {

            return res.status(400).json({

                success: false,

                message: "Please provide a valid email address."

            });

        }


        // BACKEND VALIDATION: Minimum eight characters.
        if (password.length < 8) {

            return res.status(400).json({

                success: false,

                message: "Password must contain at least 8 characters."

            });

        }


        // BACKEND VALIDATION: Confirmation required.
        if (!confirmPassword.trim()) {

            return res.status(400).json({

                success: false,

                message: "Please confirm your new password."

            });

        }


        // BACKEND VALIDATION: Passwords must match.
        if (password !== confirmPassword) {

            return res.status(400).json({

                success: false,

                message: "The new password and confirmation password must be the same."

            });

        }


        // FIND THE WORKER BY EMAIL.
        const worker = await Worker.findOne({

            email: normalizedEmail

        }).select("+resetAuthorizationExpires");


        // WORKER DOES NOT EXIST.
        if (!worker) {

            return res.status(404).json({

                success: false,

                message: "Worker account was not found."

            });

        }


        // CHECK RESET AUTHORIZATION.
        if (
            !worker.resetAuthorizationExpires ||
            worker.resetAuthorizationExpires <= new Date()
        ) {

            return res.status(401).json({

                success: false,

                message: "Your password reset authorization has expired. Please restart the password reset process."

            });

        }


        // HASH THE NEW PASSWORD.
        const hashedPassword = await bcrypt.hash(

            password,

            12

        );


        // SAVE THE NEW PASSWORD HASH.
        worker.passwordHash = hashedPassword;


        // CLEAR RESET AUTHORIZATION.
        worker.resetAuthorizationExpires = null;


        // SAVE CHANGES TO THE DATABASE.
        await worker.save();


        // RETURN SUCCESS RESPONSE.
        return res.status(200).json({

            success: true,

            message: "Your password has been changed successfully. You can now log in with your new password."

        });


    } catch (error) {

        console.error(

            "Worker password change error:",

            error

        );


        return res.status(500).json({

            success: false,

            message: "Something went wrong while changing your password. Please try again."

        });

    }

};


module.exports = {

    changeWorkerPassword

};