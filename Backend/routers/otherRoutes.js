import { Router } from "express";
import auth from "../middlewares/auth.js";
import otherController from "../controllers/otherController.js";
const {
  getAllDynamicForms,
  addDynamicForm,
  updateDynamicForm,
  deleteDynamicForm,
  getDynamicFormsByHospital,
} = otherController;

const router = Router();

router.post("/AddDynamicForms", auth, addDynamicForm);
router.get("/allDynamicForms", auth, getAllDynamicForms);
router.put("/updateDynamicForms", auth, updateDynamicForm); // Reusing the same function for update
router.get("/getDynamicForms/:hospitalName/:branchId", auth, getDynamicFormsByHospital); // Updated function name
router.delete("/deleteDynamicForm/:id", auth, deleteDynamicForm);

export default router;
