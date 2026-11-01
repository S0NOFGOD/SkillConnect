"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const https = require("https");
const jwt = require("jsonwebtoken");
const Worker = require("../models/worker");

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "SkillConnect";
const OTP_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_OTP_SENDS = 4;

const hash = value =>
    crypto.createHash("sha256").update(value).digest("hex");

const generateOTP = () =>
    crypto.randomInt(100000, 1000000).toString();

const newOTP = () => ({
    otp: generateOTP(),
    expiresAt: new Date(Date.now() + OTP_MS)
});

const validEmail = email =>
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const frontendPage = (path, params = {}) => {
    const base = process.env.FRONTEND_URL;

    if (!base)
        throw new Error("FRONTEND_URL configuration is missing.");

    const url = new URL(
        path.replace(/^\/+/, ""),
        `${base.replace(/\/+$/, "")}/`
    );

    Object.entries(params).forEach(([key, value]) =>
        url.searchParams.set(key, value)
    );

    return url.toString();
};

const sendEmail = async ({ to, subject, htmlContent }) => {
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL)
        throw new Error("Brevo configuration is missing.");

    const body = JSON.stringify({
        sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent
    });

    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: "api.brevo.com",
            path: "/v3/smtp/email",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
                "api-key": BREVO_API_KEY
            }
        }, response => {
            let result = "";

            response.on("data", chunk => result += chunk);

            response.on("end", () => {
                if (response.statusCode >= 200 && response.statusCode < 300)
                    return resolve();

                reject(new Error(
                    `Brevo email error (${response.statusCode}): ${result}`
                ));
            });
        });

        request.on("error", reject);
        request.write(body);
        request.end();
    });
};

const sendOTPEmail = ({ email, otp, type }) => {
    const verification = type === "email-verification";
    const subject = verification
        ? "Verify Your SkillConnect Account"
        : "SkillConnect Password Reset";
    const title = verification ? "Verify Your Email" : "Reset Your Password";
    const message = verification
        ? "Use this code to verify your SkillConnect account."
        : "Use this code to verify your password reset request.";

    return sendEmail({
        to: email,
        subject,
        htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#333">
                <h2>${title}</h2><p>${message}</p>
                <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5">${otp}</div>
                <p>This code expires in 10 minutes.</p>
                <p>If you did not request this code, ignore this email.</p>
                <p>— SkillConnect</p>
            </div>`
    });
};

const generateAccessToken = ({ userId, userType }) =>
    jwt.sign({ userId, userType }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRE || "15m"
    });

const generateRefreshToken = ({ userId, userType }) =>
    jwt.sign({ userId, userType }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d"
    });

const setAuthCookies = (res, accessToken, refreshToken) => {
    const production = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: production,
        sameSite: production ? "none" : "lax",
        maxAge: 15 * 60 * 1000,
        path: "/"
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: production,
        sameSite: production ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
    });
};

const createSession = async (worker, res) => {
    const accessToken = generateAccessToken({
        userId: worker._id,
        userType: "worker"
    });

    const refreshToken = generateRefreshToken({
        userId: worker._id,
        userType: "worker"
    });

    worker.refreshTokenHash = hash(refreshToken);
    await worker.save();

    setAuthCookies(res, accessToken, refreshToken);
};

const authenticateWorker = req => {
    const token = req.cookies?.accessToken;

    if (!token)
        return {
            valid: false,
            status: 401,
            message: "Authentication required."
        };

    try {
        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        if (decoded.userType !== "worker")
            return {
                valid: false,
                status: 403,
                message: "Worker authentication required."
            };

        return { valid: true, userId: decoded.userId };
    } catch {
        return {
            valid: false,
            status: 401,
            message: "Authentication required."
        };
    }
};

const cooldownResponse = (res, message, date) =>
    res.status(429).json({
        success: false,
        message,
        cooldownUntil: date.toISOString()
    });

/* SIGNUP */

const signupWorker = async (req, res) => {
    try {
        const { email, password, confirmPassword, termsAccepted } = req.body;

        if (!validEmail(email))
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });

        if (typeof password !== "string" || password.length < 8)
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });

        if (typeof confirmPassword !== "string" || !confirmPassword)
            return res.status(400).json({
                success: false,
                message: "Please confirm your password."
            });

        if (password !== confirmPassword)
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });

        if (termsAccepted !== true)
            return res.status(400).json({
                success: false,
                message: "You must agree to the Terms and Privacy Policy."
            });

        const normalizedEmail = email.trim().toLowerCase();

        if (await Worker.exists({ email: normalizedEmail }))
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });

        const passwordHash = await bcrypt.hash(password, 10);
        const { otp, expiresAt } = newOTP();

        const worker = await Worker.create({
            email: normalizedEmail,
            passwordHash,
            accountType: "password",
            emailVerified: false,
            profileCompleted: false,
            emailOtpHash: hash(otp),
            emailOtpExpires: expiresAt
        });

        try {
            await sendOTPEmail({
                email: worker.email,
                otp,
                type: "email-verification"
            });
        } catch (error) {
            await Worker.deleteOne({
                _id: worker._id,
                emailVerified: false
            });

            throw error;
        }

        return res.status(201).json({
            success: true,
            message: "A verification code has been sent to your email.",
            email: worker.email,
            nextStep: "email-verification"
        });
    } catch (error) {
        console.error("Worker signup error:", error);

        return res.status(500).json({
            success: false,
            message: "An error occurred while creating your worker account."
        });
    }
};

/* LOGIN */

const loginWorker = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!validEmail(email))
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });

        if (typeof password !== "string" || !password)
            return res.status(400).json({
                success: false,
                message: "Password is required."
            });

        const worker = await Worker.findOne({
            email: email.trim().toLowerCase()
        }).select("+passwordHash");

        if (!worker)
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        if (worker.accountType === "googleId")
            return res.status(400).json({
                success: false,
                message: "This account uses Google authentication. Please continue with Google."
            });

        if (
            !worker.passwordHash ||
            !await bcrypt.compare(password, worker.passwordHash)
        )
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        if (!worker.emailVerified) {
            const attempts = worker.emailOtpResendAttempts;
            const now = Date.now();
            const cooldownUntil = attempts.coolDownUntil;

            if (cooldownUntil && cooldownUntil.getTime() > now)
                return cooldownResponse(
                    res,
                    "Email verification resend cooldown is active. Please try again later.",
                    cooldownUntil
                );

            if (cooldownUntil && cooldownUntil.getTime() <= now) {
                attempts.coolDownUntil = null;
                attempts.emailOtpResendCount = 0;
            }

            if (attempts.emailOtpResendCount >= MAX_OTP_SENDS) {
                attempts.emailOtpResendCount = 0;
                attempts.coolDownUntil = new Date(now + COOLDOWN_MS);

                await worker.save();

                return cooldownResponse(
                    res,
                    "You have reached the email verification OTP resend limit. Please try again after 24 hours.",
                    attempts.coolDownUntil
                );
            }

            const { otp, expiresAt } = newOTP();

            await sendOTPEmail({
                email: worker.email,
                otp,
                type: "email-verification"
            });

            worker.emailOtpHash = hash(otp);
            worker.emailOtpExpires = expiresAt;
            attempts.emailOtpResendCount += 1;

            await worker.save();

            return res.status(200).json({
                success: true,
                message: "Verification code has been sent to your email.",
                email: worker.email,
                nextStep: "email-verification"
            });
        }

        if (!worker.profileCompleted)
            return res.status(200).json({
                success: true,
                message: "Please complete your worker profile.",
                email: worker.email,
                nextStep: "profile"
            });

        await createSession(worker, res);

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${worker.fullName || "worker"}.`,
            email: worker.email,
            fullName: worker.fullName,
            nextStep: "authenticated"
        });
    } catch (error) {
        console.error("Worker login error:", error);

        return res.status(500).json({
            success: false,
            message: "An error occurred while logging in."
        });
    }
};

/* FORGOT PASSWORD */

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!validEmail(email))
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });

        const worker = await Worker.findOne({
            email: email.trim().toLowerCase()
        });

        if (!worker)
            return res.status(404).json({
                success: false,
                message: "No worker account was found with this email address."
            });

        if (worker.accountType === "googleId")
            return res.status(400).json({
                success: false,
                message: "This account uses Google authentication. Please continue with Google."
            });

        const attempts = worker.passwordResetOtpResendAttempts;
        const now = Date.now();
        const cooldownUntil = attempts.coolDownUntil;

        if (cooldownUntil && cooldownUntil.getTime() > now)
            return cooldownResponse(
                res,
                "You have reached the password reset OTP resend limit. Please try again after the cooldown period.",
                cooldownUntil
            );

        if (cooldownUntil && cooldownUntil.getTime() <= now) {
            attempts.coolDownUntil = null;
            attempts.passwordResetOtpResendCount = 0;
        }

        if (attempts.passwordResetOtpResendCount >= MAX_OTP_SENDS) {
            attempts.passwordResetOtpResendCount = 0;
            attempts.coolDownUntil = new Date(now + COOLDOWN_MS);

            await worker.save();

            return cooldownResponse(
                res,
                "You have reached the password reset OTP resend limit. Please try again after the cooldown period.",
                attempts.coolDownUntil
            );
        }

        const { otp, expiresAt } = newOTP();

        await sendOTPEmail({
            email: worker.email,
            otp,
            type: "password-reset"
        });

        worker.passwordResetOtpHash = hash(otp);
        worker.passwordResetOtpExpires = expiresAt;
        worker.passwordResetVerified = false;
        worker.passwordResetVerifiedAt = null;
        worker.resetAuthorizationExpires = null;
        attempts.passwordResetOtpResendCount += 1;

        await worker.save();

        return res.status(200).json({
            success: true,
            message: "Verification code has been sent to your email.",
            email: worker.email
        });
    } catch (error) {
        console.error("Worker forgot password error:", error);

        return res.status(500).json({
            success: false,
            message: "An error occurred while processing your password reset request."
        });
    }
};

/* GOOGLE START */

const googleAuthentication = (req, res) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CALLBACK_URL)
            throw new Error("Google OAuth configuration is missing.");

        const googleUrl = new URL(
            "https://accounts.google.com/o/oauth2/v2/auth"
        );

        googleUrl.searchParams.set(
            "client_id",
            process.env.GOOGLE_CLIENT_ID
        );
        googleUrl.searchParams.set(
            "redirect_uri",
            process.env.GOOGLE_CALLBACK_URL
        );
        googleUrl.searchParams.set("response_type", "code");
        googleUrl.searchParams.set("scope", "openid email profile");
        googleUrl.searchParams.set("prompt", "select_account");

        return res.status(200).json({
            success: true,
            authorizationUrl: googleUrl.toString()
        });
    } catch (error) {
        console.error("Worker Google start error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to connect to Google authentication. Please try again."
        });
    }
};

/* GOOGLE CALLBACK */

const googleCallback = async (req, res) => {
    const redirectToAuthentication = error =>
        res.redirect(frontendPage(
            "worker-authentication/index.html",
            { error }
        ));

    try {
        if (req.query.error || !req.query.code)
            return redirectToAuthentication(
                "google-authentication-failed"
            );

        const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    code: req.query.code,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
                    grant_type: "authorization_code"
                })
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token)
            return redirectToAuthentication(
                "google-authentication-failed"
            );

        const userResponse = await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`
                }
            }
        );

        const googleUser = await userResponse.json();

        if (
            !userResponse.ok ||
            !googleUser.email ||
            !googleUser.id ||
            googleUser.verified_email === false
        )
            return redirectToAuthentication(
                "google-authentication-failed"
            );

        const email = googleUser.email.trim().toLowerCase();
        const googleId = String(googleUser.id);

        let worker = await Worker.findOne({ email });

        if (worker && worker.accountType === "password")
            return redirectToAuthentication("password-account");

        if (!worker) {
            await Worker.create({
                email,
                googleId,
                accountType: "googleId",
                emailVerified: true,
                profileCompleted: false
            });

            return res.redirect(
                frontendPage("worker-create-profile/index.html")
            );
        }

        worker.googleId = googleId;
        worker.emailVerified = true;

        if (!worker.profileCompleted) {
            await worker.save();

            return res.redirect(
                frontendPage("worker-create-profile/index.html")
            );
        }

        await createSession(worker, res);

        return res.redirect(
            frontendPage("worker-services/index.html")
        );
    } catch (error) {
        console.error("Worker Google callback error:", error);

        try {
            return redirectToAuthentication(
                "google-authentication-failed"
            );
        } catch (redirectError) {
            console.error("Worker Google redirect error:", redirectError);

            return res.status(500).send(
                "Google authentication failed. Please return to SkillConnect and try again."
            );
        }
    }
};

module.exports = {
    signupWorker,
    loginWorker,
    forgotPassword,
    googleAuthentication,
    googleCallback,
    authenticateWorker
};