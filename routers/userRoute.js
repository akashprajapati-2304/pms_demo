import { Router } from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  updatePassword,
  getUsersByAdmin,
  getUsersBySuperadmin,
  deleteUserById,
  getMe
} from "../controllers/userController.js";
import auth from "../middlewares/auth.js";

const router = Router();

router.post("/addUsers", auth, createUser);
router.get("/getAllUsers", auth, getAllUsers);
router.get("/getUsersBySuperadmin", auth, getUsersBySuperadmin);
router.get("/getUsersByAdmin/:adminName", auth, getUsersByAdmin);
router.put("/updateUser", auth, updateUser);
router.put("/updatePassword", auth, updatePassword);
router.delete("/deleteUser/:id", auth, deleteUserById);
router.get("/getMe", auth, getMe);
export default router;
