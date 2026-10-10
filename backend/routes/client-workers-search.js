const express = require("express");
const router = express.Router();

const {
authenticateClient
} = require("../controllers/client-authentication");

const {
searchWorkers
} = require("../controllers/client-workers-search");

router.get("/", async (req, res, next) => {
try {
const auth = authenticateClient(req);

    if (!auth.valid) {
        return res.status(auth.status).json({
            success: false,
            message: auth.message
        });
    }

    req.clientId = auth.userId;

    return next();
} catch (error) {
    return next(error);
}

}, searchWorkers);

module.exports = router;