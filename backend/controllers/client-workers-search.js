const Client = require("../models/client");
const Worker = require("../models/worker");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET
});

const searchWorkers = async (req, res) => {
try {
// The route authenticates the client before this controller runs.
const clientId = req.clientId;

    if (!clientId) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    const client = await Client.findById(clientId).select(
        "fullName profileCompleted lga"
    );

    if (!client) {
        return res.status(401).json({
            success: false,
            message: "Client account not found."
        });
    }

    if (!client.profileCompleted) {
        return res.status(400).json({
            success: false,
            message: "Please complete your client profile before searching for workers."
        });
    }

    if (!client.lga || !client.lga.trim()) {
        return res.status(400).json({
            success: false,
            message: "Your location is not available. Please update your profile."
        });
    }

    // Retrieve workers in the client's LGA who have at least
    // one approved service.
    const workers = await Worker.find({
        lga: client.lga.trim(),
        "services.adminApproval": "approved"
    })
        .select("fullName profilePhoto lga services")
        .sort({ fullName: 1 })
        .lean();

    const workerData = workers
        .map(worker => {
            // Only expose services approved by an administrator.
            const approvedServices = (worker.services || [])
                .filter(service =>
                    service.adminApproval === "approved"
                )
                .map(service => ({
                    id: service.id,
                    serviceId: service.id,
                    skill: service.skill
                }));

            if (approvedServices.length === 0) {
                return null;
            }

            let profilePhoto = null;

            if (worker.profilePhoto) {
                profilePhoto = /^https?:\/\//i.test(
                    worker.profilePhoto
                )
                    ? worker.profilePhoto
                    : cloudinary.url(worker.profilePhoto, {
                        secure: true
                    });
            }

            return {
                workerId: worker._id.toString(),
                profilePhoto,
                fullName: worker.fullName,
                lga: worker.lga,
                services: approvedServices
            };
        })
        .filter(Boolean);

    return res.status(200).json({
        success: true,
        message: workerData.length
            ? `Workers found near ${client.lga}.`
            : `No workers are currently available in ${client.lga}.`,
        client: {
            fullName: client.fullName,
            lga: client.lga
        },
        workers: workerData
    });

} catch (error) {
    console.error("Client worker search error:", error);

    return res.status(500).json({
        success: false,
        message: "Unable to find workers. Please try again."
    });
}

};

module.exports = {
searchWorkers
};