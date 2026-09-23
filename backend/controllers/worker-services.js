const jwt = require("jsonwebtoken");
const Worker = require("../models/worker");

const authenticateWorkerFromRequest = (req) => {

    const authorization = req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {
        return null;
    }

    const accessToken = authorization.substring(7);

    try {
        return jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );
    } catch (error) {
        return null;
    }
};

const getWorkerServices = async (req, res) => {

    try {

        const decodedToken =
            authenticateWorkerFromRequest(req);

        if (!decodedToken) {

            return res.status(401).json({
                success: false,
                message:
                    "Worker authentication is required."
            });

        }

        if (
            decodedToken.userType &&
            decodedToken.userType !== "worker"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Worker access is required."
            });

        }

        const workerId =
            decodedToken.userId;

        if (!workerId) {

            return res.status(401).json({
                success: false,
                message:
                    "Worker authentication is required."
            });

        }

        const worker =
            await Worker.findById(
                workerId
            ).select("services");

        if (!worker) {

            return res.status(404).json({
                success: false,
                message:
                    "Worker account was not found."
            });

        }

        if (
            worker.services === null ||
            !Array.isArray(worker.services) ||
            worker.services.length === 0
        ) {

            return res.status(200).json({
                success: true,
                services: null
            });

        }

        const services =
            worker.services.map(
                (service) => {

                    return {
                        id: service.id,
                        skill: service.skill,
                        date: service.date
                    };

                }
            );

        return res.status(200).json({
            success: true,
            services
        });

    } catch (error) {

        console.error(
            "Get worker services error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load your services."
        });

    }

};

module.exports = {
    getWorkerServices
};