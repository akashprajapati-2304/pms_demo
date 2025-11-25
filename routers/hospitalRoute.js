import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  updateOrAddHospital,
  updateHospital,
  getHospitalsNames,
  getHospitalByName,
  getAllHospitals,
  getHospitalById,
  updateBranchInHospital,
  addBranchToHospital,
  getBranchesByHosptialName,
  hospitalsWithBasicInfo,
  getBranchById,
  updateHospitalById,
  deleteHospitalById,
  deleteBranchById,
  getDoctorsAndDepartmentsNames,
} from "../controllers/hospitalController.js";

const router = Router();

router.post("/addOrUpdateHospital", auth, updateOrAddHospital);
// * Endpoint to update hospital details
router.post("/updateHospitals", auth, updateHospital);
router.put("/updateHospital/:ID", auth, updateHospitalById);
router.delete("/deleteHospital/:id", auth, deleteHospitalById);
router.get("/getHospitalsNames", auth, getHospitalsNames);
router.get("/getHospitalByName/:hospitalName", auth, getHospitalByName);
router.get("/getAllHospitals", auth, getAllHospitals);
router.get("/hospitalsBasicInfo", auth, hospitalsWithBasicInfo);
router.get("/getAllHospitals/:id", auth, getHospitalById);
router.put("/hospitals/:hospitalId/branch", auth, updateBranchInHospital);
router.post("/hospitals/:hospitalId/branch", auth, addBranchToHospital);
router.get("/hospitals/:hospitalName/branches", auth, getBranchesByHosptialName);
router.get("/hospitals/:hospitalId/branch/:branchId", auth, getBranchById);
router.get("/hospitals/:hospitalName/branch/:branchId/doctorsAndDepartments", auth, getDoctorsAndDepartmentsNames);
router.delete("/hospitals/:hospitalId/branch/:branchId", auth, deleteBranchById);

export default router;
