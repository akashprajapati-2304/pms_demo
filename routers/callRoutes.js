import { Router } from "express";
import auth from "../middlewares/auth.js";
import { logCallEvent, getCallData } from "../controllers/callController.js";
import { getCallStatsByAgent } from "../controllers/controller/callStatsController.js";


const router = Router();

router.post("/v1/call-event", logCallEvent);
router.get("/getCallData", auth, getCallData);
router.get("/getCallStats/:agentId", auth, getCallStatsByAgent);

export default router;

