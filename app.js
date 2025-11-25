import path from "path";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";

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

const app = express();

app.use(express.json());

app.use(express.json());
app.use(cors({
  origin: env.corsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Handle preflight requests
app.options('*', cors());

app.use("/health", healthRoutes);
app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", hospitalRoutes);
app.use("/", otherRoutes);
app.use("/api/filled-forms", filledFormRoutes);
app.use("/", userStatsRoutes);
app.use("/api", callRoutes);
app.use("/", legacyRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(errorHandler.notFound);
app.use(errorHandler.general);

export default app;

