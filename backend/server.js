require("dotenv").config();

const mongoose=require("mongoose");
const express=require("express");
const cors=require("cors");
const cookieParser=require("cookie-parser");

const workerAuthenticationRoutes=require("./routes/worker-authentication");
const workerEmailOTPRoutes=require("./routes/worker-email-otp");
const workerPasswordResetOTPRoutes=require("./routes/worker-password-reset-otp");
const workerCreateProfileRoutes=require("./routes/worker-create-profile");
const workerEditProfileRoutes=require("./routes/worker-edit-profile");
const workerPasswordChangeRoutes=require("./routes/worker-password-change");
const workerDashboardRoutes=require("./routes/worker-dashboard");
const workerServicesRoutes=require("./routes/worker-services");
const workerCreateServiceRoutes=require("./routes/worker-create-service");
const workerViewServiceRoutes=require("./routes/worker-view-service");
const workerLogoutRoutes=require("./routes/worker-logout");
const refreshTokenRoutes=require("./routes/refreshToken");

const clientAuthenticationRoutes=require("./routes/client-authentication");
const clientEmailOTPRoutes=require("./routes/client-email-otp");
const clientPasswordResetOTPRoutes=require("./routes/client-password-reset-otp");
const clientCreateProfileRoutes=require("./routes/client-create-profile");
const clientPasswordChangeRoutes=require("./routes/client-password-change");
const clientWorkerSearchRoutes=require("./routes/client-worker-search");
const clientWorkerDetailsRoutes=require("./routes/client-worker-details");

const app=express();
const PORT=process.env.PORT||5000;


/* 1. DATABASE CONNECTION */

const connectDB=async()=>{
    try{
        const mongoURI=process.env.MONGODB_URI;

        if(!mongoURI){
            throw new Error(
                "MONGODB_URI is not defined in the .env file."
            );
        }

        const connection=await mongoose.connect(mongoURI);

        console.log(
            `MongoDB connected: ${connection.connection.host}`
        );

    }catch(error){
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    }
};


/* 2. SERVER CONFIGURATION */

app.set("trust proxy",1);

const allowedOrigins=[
    process.env.FRONTEND_URL,
    process.env.FRONTEND_PRODUCTION_URL
].filter(Boolean);

app.use(cors({
    origin(origin,callback){
        if(!origin)return callback(null,true);
        if(allowedOrigins.includes(origin))return callback(null,true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials:true
}));

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());


/* 3. API STATUS */

app.get("/",(req,res)=>{
    res.status(200).json({
        success:true,
        message:"SkillConnect API is running successfully."
    });
});


/* 4. WORKER ROUTES */

app.use("/api/worker-authentication",workerAuthenticationRoutes);
app.use("/api/auth/refresh",refreshTokenRoutes);
app.use("/api/auth/worker",workerEmailOTPRoutes);
app.use("/api/auth/worker",workerPasswordResetOTPRoutes);
app.use("/api/auth/worker",workerLogoutRoutes);
app.use("/api/worker",workerCreateProfileRoutes);
app.use("/api/worker",workerEditProfileRoutes);
app.use("/api/worker-password-change",workerPasswordChangeRoutes);
app.use("/api/worker",workerCreateServiceRoutes);
app.use("/api/worker",workerViewServiceRoutes);


/* 5. CLIENT ROUTES */

app.use("/api/client-authentication",clientAuthenticationRoutes);
app.use("/api/client-email-otp",clientEmailOTPRoutes);
app.use("/api/client-password-reset-otp",clientPasswordResetOTPRoutes);
app.use("/api/client-create-profile",clientCreateProfileRoutes);
app.use("/api/client-password-change",clientPasswordChangeRoutes);
app.use("/api/client/worker-search",clientWorkerSearchRoutes);
app.use("/api/client/worker-details",clientWorkerDetailsRoutes);


/* 6. OTHER WORKER ROUTES */

app.use("/api/worker",workerDashboardRoutes);
app.use("/api/worker",workerServicesRoutes);


/* 7. 404 ERROR */

app.use((req,res)=>{
    res.status(404).json({
        success:false,
        message:"The requested API endpoint was not found."
    });
});


/* 8. GLOBAL ERROR HANDLER */

app.use((error,req,res,next)=>{
    console.error("Server Error:",error);

    if(error.message==="Not allowed by CORS"){
        return res.status(403).json({
            success:false,
            message:"This origin is not allowed to access the SkillConnect API."
        });
    }

    return res.status(error.statusCode||500).json({
        success:false,
        message:process.env.NODE_ENV==="development"
            ? error.message
            : "An internal server error occurred."
    });
});


/* 9. START SERVER */

const startServer=async()=>{
    try{
        await connectDB();

        app.listen(PORT,()=>{
            console.log(
                `SkillConnect server running on port ${PORT}`
            );
        });

    }catch(error){
        console.error(
            "Failed to start SkillConnect server:",
            error.message
        );

        process.exit(1);
    }
};

startServer();