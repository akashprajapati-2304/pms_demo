import { Router } from "express";
import { userLogin, userLogout } from "../controllers/userAuthController.js";
import auth from "../middlewares/auth.js";

const router = Router();

// Public routes
router.post("/login", userLogin);

// Protected routes (require authentication)
router.post("/logout", auth, userLogout);

export default router;