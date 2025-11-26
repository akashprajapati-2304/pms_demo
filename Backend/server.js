import path from "path";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import fs from "fs";

// Import configurations and routes
import env from "./config/env.js";
import authRoutes from "./routers/userAuthRoute.js";
import userRoutes from "./routers/userRoute.js";
import hospitalRoutes from "./routers/hospitalRoute.js";
import otherRoutes from "./routers/otherRoutes.js";
import filledFormRoutes from "./routers/filledForms.js";
import userStatsRoutes from "./routers/userStatsRoute.js";
import callRoutes from "./routers/callRoutes.js";
import healthRoutes from "./routers/healthRoute.js";
import legacyRoutes from "./routers/legacyRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";

// --- Application Setup (from app.js) ---
const app = express();

// Middleware
app.use(express.json());
// app.use(express.json()); // Duplicate call, removed one

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
app.options("*", cors());

// Routes
app.use("/health", healthRoutes);
app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", hospitalRoutes);
app.use("/", otherRoutes);
app.use("/api/filled-forms", filledFormRoutes);
app.use("/", userStatsRoutes);
app.use("/api", callRoutes);
app.use("/", legacyRoutes);

// Serve static files from public directory if it exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "public");

// Only serve static files in production and if public directory exists
try {
  if (process.env.NODE_ENV === "production" && fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));

    // Handle SPA routing - serve index.html for all routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  }
} catch (err) {
  console.warn("Static file serving disabled:", err.message);
}

// Error Handlers
app.use(errorHandler.notFound);
app.use(errorHandler.general);

// --- Server Start Logic (from server.js) ---
let isConnected = false;

async function connectToMongoDB() {
  try {
    if (!env.mongoUrl) {
      throw new Error("MONGO_URL environment variable is not set");
    }
    await mongoose.connect(env.mongoUrl, {
      dbName: env.mongoDbName,
    });
    console.log("MongoDB connected");
    isConnected = true;
  } catch (error) {
    console.log("MongoDB connection failed:", error);
    // You might not want to exit the process immediately in a serverless environment
    // process.exit(1)
  }
}

// Middleware to ensure DB connection is attempted
app.use((req, res, next) => {
  if (!isConnected) {
    connectToMongoDB();
  }
  next();
});

// Start the server only if running directly (not in a Vercel serverless environment)
// Vercel only needs the exported app instance.
const PORT = process.env.PORT || env.port || 5000;

// Start the server only if not in Vercel's serverless environment
if (process.env.VERCEL !== "1") {
  connectToMongoDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}

// Export the application instance for Vercel Serverless Function deployment
export default app;
