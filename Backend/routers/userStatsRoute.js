// userStatsRoute.js
import { Router } from "express";
import { getUserLoginHours } from "../controllers/userStatsController.js";
import auth from "../middlewares/auth.js";

const router = Router();

// Protected route to get user login hours
router.get("/login-hours/:agentId", auth, getUserLoginHours);

export default router;