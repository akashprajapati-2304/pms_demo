/**
 * Hospital Controller
 * Handles adding, updating, and managing hospital records (including branches) in the database.
 * Related routes: add/update hospital, manage branches, check for duplicates, etc.
 */
import mongo from "../db.js";
import { generateUniqueId } from "../src/utils.js";

// * Updates an existing hospital if 'update' is true in the request body, otherwise adds a new hospital.
// * Also handles adding branches with unique IDs if inserting a new hospital.
// ? Expects hospital data in req.body, with optional 'update' flag.
const updateOrAddHospital = async (req, res) => {
  const hospitalData = req.body;
  const isToUpdate = req.body.update;
  try {
    if (isToUpdate) {
      const { trimmedName } = hospitalData; // Fix: Extract trimmedName from hospitalData
      if (!trimmedName) {
        return res.json({
          message: "trimmedName is required for update",
          success: false,
        });
      }
      await mongo.updateMulti(
        { trimmedName, isDeleted: { $ne: true } },
        "hospitals",
        {
          $set: hospitalData,
        }
      );
      return res.json({
        message: "Hospitals updated successfully",
        success: true,
      });
    }
    if (!hospitalData)
      return res.json({ message: "empty request", success: false });
    console.log("hospitalData is :", hospitalData);
    const trimmedName = hospitalData?.trimmedName;
    const foundDoc = await mongo.finddoc("hospitals", {
      trimmedName,
      isDeleted: { $ne: true },
    });
    console.log("foundDoc is :", foundDoc);
    if (foundDoc === "not found") {
      const branches = hospitalData?.branches || [];
      const branchesWithId = branches.map((branch) => {
        return {
          ID: generateUniqueId(),
          ...branch,
        };
      });
      hospitalData.branches = branchesWithId;
      await mongo.insertOne(hospitalData, "hospitals");
      return res.json({
        message: "Hospitals inserted successfully",
        success: true,
      });
    } else {
      res.json({
        message: "Hospital with this name already exists",
        success: false,
      });
    }
  } catch (error) {
    console.log("error in inserting", error);
    res.json({ message: "Error occurred while inserting", success: false });
  }
};

// * Updates hospital details from the hospital admin side.
// * Requires 'keyToUpdate' and 'trimmedName' in the request body.
// ! Returns error if required fields are missing or no update fields are provided.
// * Updates hospital details by hospital ID.
// * Requires 'ID' in req.params and update fields in req.body.
// ! Returns error if ID or update fields are missing, or if no hospital is found.
const updateHospital = async (req, res) => {
  try {
    const hospitalData = req.body;
    if (!hospitalData || Object.keys(hospitalData).length === 0) {
      return res
        .status(400)
        .json({ message: "Missing request body", success: false });
    }

    const { keyToUpdate, trimmedName, ...updateDoc } = hospitalData;
    console.log(
      "keyToUpdate ,trimmednmae,updatedoc",
      keyToUpdate,
      trimmedName,
      updateDoc
    );

    if (!keyToUpdate) {
      return res
        .status(400)
        .json({ message: "Missing keyToUpdate", success: false });
    }
    if (!trimmedName) {
      return res
        .status(400)
        .json({ message: "Missing trimmedName", success: false });
    }

    if (Object.keys(updateDoc).length === 0) {
      return res
        .status(400)
        .json({ message: "No fields provided for update", success: false });
    }

    const result = await mongo.updateDocument(
      { trimmedName, isDeleted: { $ne: true } },
      "hospitals",
      {
        $set: updateDoc,
      }
    );

    if (result.error) {
      console.error("Error occurred while updating:", result.error);
      return res.status(500).json({
        message: "Error occurred while updating",
        success: false,
        error: result.error,
      });
    }
    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "No hospital found with this name", success: false });
    }
    if (result.modifiedCount === 0) {
      return res.status(200).json({
        message:
          "Document matched but no changes were made (maybe the new value is the same).",
        success: false,
      });
    }

    return res
      .status(200)
      .json({ message: "Hospital updated successfully", success: true });
  } catch (error) {
    console.error("Unexpected server error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};

const updateHospitalById = async (req, res) => {
  const { ID } = req.params;
  const hospitalData = req.body;
  if (!ID) {
    return res.status(400).json({
      message: "ID is required",
      success: false,
    });
  }
  if (!hospitalData || Object.keys(hospitalData).length === 0) {
    return res.status(400).json({
      message: "No fields provided for update",
      success: false,
    });
  }

  try {
    const result = await mongo.updateDocument(
      { ID, isDeleted: { $ne: true } },
      "hospitals",
      {
        $set: hospitalData,
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "No hospital found with this ID",
        success: false,
      });
    }
    if (result.modifiedCount === 0) {
      return res.status(200).json({
        message: "No changes were made (maybe the new value is the same).",
        success: false,
      });
    }
    return res.status(200).json({
      message: "Hospital updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error in updating hospital:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: error.message,
    });
  }
};

// * Fetches all hospital names from the database.
// * Returns an array of hospital names.
const getHospitalsNames = async (req, res) => {
  try {
    const dataFromDb = await mongo.findAllData(
      { isDeleted: { $ne: true } },
      "hospitals"
    );

    // console.log("dataFromDb is in api gethostpitalsnames:", dataFromDb);
    const hospitalNames = dataFromDb?.map((item) => item.name);
    res.json({
      message: "Hospitals names successfully fetched",
      data: hospitalNames,
      success: true,
    });
  } catch (error) {
    console.log("error in fetching data", error);
    res.json({ message: "Error occurred while fetching", success: false });
  }
};

// * Fetches a single hospital by its name (from req.params).
// * Returns the hospital document if found, or an error if not found.
const getHospitalByName = async (req, res) => {
  const { hospitalName } = req.params;
  if (!hospitalName)
    return res.json({ message: "empty request", success: false });
  console.log("hospitalName is :", hospitalName);
  try {
    const dataFromDb = await mongo.finddoc("hospitals", {
      name: hospitalName,
      isDeleted: { $ne: true },
    });
    if (dataFromDb === "not found") {
      return res.json({
        message: "No hospital found with this name",
        success: false,
      });
    }
    res.json({
      message: "Hospital successfully fetched",
      data: dataFromDb,
      success: true,
    });
  } catch (error) {
    console.log("error in fetching data", error);
    res.json({ message: "Error occurred while fetching", success: false });
  }
};

// * Fetches all hospitals with basic info (ID, trimmedName, name, city).
// * Returns an array of hospital objects.
// * Fetches all hospitals with extended basic info (contact, account, management, etc.).
// * Returns an array of hospital objects with more fields than getAllHospitals.
const getAllHospitals = async (req, res) => {
  try {
    const projectionObject = {
      ID: 1,
      trimmedName: 1,
      name: 1,
      city: 1,
      _id: 0,
    };
    const dataFromDbWithProjection = await mongo.findAllDataWithProjection(
      { isDeleted: { $ne: true } },
      projectionObject,
      "hospitals"
    );
    res.json({
      message: "Hospitals successfully fetched",
      data: dataFromDbWithProjection ? dataFromDbWithProjection : null,
      success: true,
    });
  } catch (error) {
    console.error("Error in fetching data:", error);
    res.json({ message: "Error occurred while fetching", success: false });
  }
};



// * Fetches all hospitals with basic info (ID, trimmedName, name, city).
// * Returns an array of hospital objects.
const hospitalsWithBasicInfo = async (req, res) => {
  try {
    const projectionObject = {
      ID: 1,
      trimmedName: 1,
      name: 1,
      city: 1,
      _id: 0,
      contactNumbers: 1,
      accondDetails: 1,
      managementDetails: 1,
      corporateAddress: 1,
      city: 1,
      hospitalCode: 1,
    };
    const dataFromDbWithProjection = await mongo.findAllDataWithProjection(
      { isDeleted: { $ne: true } },
      projectionObject,
      "hospitals"
    );
    console.log(
      "dataFromDbWithProjection in hospitalsWithBasicInfo is :",
      dataFromDbWithProjection
    );
    res.json({
      message: "Hospitals basic info successfully fetched",
      data: dataFromDbWithProjection ? dataFromDbWithProjection : null,
      success: true,
    });
  } catch (error) {
    console.error("Error in fetching data:", error);
    res.json({ message: "Error occurred while fetching", success: false });
  }
};

// * Fetches a hospital by its unique ID (from req.params).
// * Returns the hospital document if found, or an error if not found.
const getHospitalById = async (req, res) => {
  const { id } = req.params;
  try {
    // const dataFromDb1 = await mongo.finddoc("hospitals", { ID: id });
    const dataFromDb1 = await mongo.findActiveHospitalData(
      { ID: id },
      { _id: 0 },
      "hospitals",
      "isDeleted"
    );
    // console.log("dataFromDb1 is :", dataFromDb1);
    if (dataFromDb1 === "not found") {
      return res.json({
        message: "No hospital found with this ID",
        success: false,
      });
    }
    // const { _id, ...dataFromDb } = dataFromDb1;
    // console.log("dataFromDb is :", dataFromDb);
    return res.json({
      message: "hospital fetched successfully",
      data: dataFromDb1["0"],
      success: true,
    });
  } catch (error) {
    console.log("error in fetching data", error);
    return res.json({
      message: "Error occurred while fetching",
      success: false,
    });
  }
};

// * get branch doctors and departments by hospitalTimmed Name and branchId
const getDoctorsAndDepartmentsNames = async (req, res) => {
  const { hospitalName, branchId } = req.params;
  if (!hospitalName || !branchId) {
    return res.status(400).json({
      message: "Hospital name and branch ID are required",
      success: false,
    });
  }
  const trimmedName = hospitalName.trim().toLowerCase().replace(/\s+/g, "");
  try {
    const result = await mongo.findDoctorsAndDepartmentsByBranch(
      trimmedName,
      branchId,
      "hospitals",
      process.env.database
    );
    const responseObject = {
      message: "Doctors and departments fetched successfully",
      success: true,
      data: result,
    };
    res.json(responseObject);
  } catch (error) {
    console.error("Error fetching doctors and departments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// * Updates an existing branch in a hospital by hospitalId (from req.params).
// * Expects updated branch data in req.body.
// ! Returns error if hospitalId or branch data is missing.
const updateBranchInHospital = async (req, res) => {
  const { hospitalId } = req.params;
  if (!hospitalId)
    return res.status(400).json({
      message: "Hospital ID is required",
      success: false,
    });
  const newBranch = req.body;
  // const isBranchValid = validateBranch(newBranch);

  if (!newBranch || Object.keys(newBranch).length === 0) {
    return res
      .status(400)
      .json({ error: "Branch data is required in the request body." });
  }

  if (!newBranch?.name) {
    return res
      .status(400)
      .json({ error: "Branch name is required in the request body." });
  }

  try {
    const result = await mongo.updateBranchInHospital(
      process.env.database,
      "hospitals",
      hospitalId,
      newBranch
    );
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Error adding branch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// * Adds a new branch to a hospital by hospitalId (from req.params).
// * Expects new branch data in req.body.
// ! Returns error if hospitalId or branch data is missing.
const addBranchToHospital = async (req, res) => {
  const { hospitalId } = req.params;
  if (!hospitalId)
    return res.status(400).json({
      message: "Hospital ID is required",
      success: false,
    });
  const newBranch = req.body;
  // const isBranchValid = validateBranch(newBranch);

  if (!newBranch || Object.keys(newBranch).length === 0) {
    return res
      .status(400)
      .json({ error: "Branch data is required in the request body." });
  }

  if (!newBranch?.name) {
    return res
      .status(400)
      .json({ error: "Branch name is required in the request body." });
  }

  try {
    const result = await mongo.addBranchToHospital(
      process.env.database,
      "hospitals",
      hospitalId,
      newBranch
    );
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Error adding branch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// * Fetches a branch by hospitalId and branchId (from req.params).
// * Returns the branch object if found, or an error if not found.
const getBranchById = async (req, res) => {
  const { hospitalId, branchId } = req.params;
  if (!hospitalId || !branchId) {
    return res.status(400).json({
      message: "Hospital ID and Branch ID are required",
      success: false,
    });
  }
  try {
    const result = await mongo.findBranchById(
      hospitalId,
      branchId,
      "hospitals",
      process.env.database
    );
    const responseObject = {
      message: "Branch fetched successfully",
      success: true,
      data: result,
    };
    res.json(responseObject);
  } catch (error) {
    console.error("Error fetching branch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// * Soft deletes a branch by hospitalId and branchId (from req.params).
// * Marks the branch as deleted in the database.
// ! Returns error if hospitalId or branchId is missing.
const deleteBranchById = async (req, res) => {
  const { hospitalId, branchId } = req.params;
  if (!hospitalId || !branchId) {
    return res.status(400).json({
      message: "Hospital ID and Branch ID are required",
      success: false,
    });
  }
  try {
    const result = await mongo.softDeleteBranchInHospital(
      process.env.database,
      "hospitals",
      hospitalId,
      branchId
    );
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// * Fetches all branches for a hospital by hospitalName (from req.params).
// * Returns an array of branch objects (not marked as deleted).
const getBranchesByHosptialName = async (req, res) => {
  const { hospitalName } = req.params;
  if (!hospitalName)
    return res.status(400).json({
      message: "Hospital name is required",
      success: false,
    });
  const trimmedName = hospitalName.trim().toLowerCase().replace(/\s+/g, "");
  console.log("trimmedName is :", trimmedName);

  try {
    const fieldsToKeep = ["ID", "name", "isDeleted"];

    const dataFromDb = await mongo.findSingleProjectedArrayField(
      { trimmedName, isDeleted: { $ne: true } },
      "branches",
      fieldsToKeep,
      "hospitals"
    );
    const data =
      dataFromDb?.branches?.filter((branch) => branch.isDeleted !== true) ||
      null;
    console.log("branches data is :", data);

    res.json({
      message: "successfully fetched branches",
      branches: data,
      success: true,
    });
  } catch (error) {
    console.log("error in fetching data", error);
    res.json({
      message: "error during fetching branches",
      success: false,
    });
  }
};

// * Soft deletes a hospital by its unique ID (from req.params).
// * Marks the hospital as deleted in the database.
// ! Returns error if ID is missing or hospital is already deleted.
const deleteHospitalById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.json({
      message: "ID is required",
      success: false,
    });
  }
  try {
    const result = await mongo.updateDocument(
      { ID: id, isDeleted: { $ne: true } },
      "hospitals",
      {
        $set: { isDeleted: true },
      }
    );
    if (result.matchedCount === 0) {
      return res.json({
        message: "No hospital found with this ID or already deleted",
        success: false,
      });
    }
    if (result.modifiedCount === 0) {
      return res.json({
        message: "Hospital already marked as deleted",
        success: false,
      });
    }
    // If the hospital is successfully marked as deleted
    console.log(`Hospital with ID ${id} marked as deleted`);
    return res.json({
      message: "Hospital deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error in /deleteHospitalById API:", error);
    return res.json({ success: false, message: "Internal server error" });
  }
};

export {
  updateOrAddHospital,
  updateHospital,
  updateHospitalById,
  getHospitalsNames,
  getHospitalByName,
  getAllHospitals,
  hospitalsWithBasicInfo,
  getHospitalById,
  getDoctorsAndDepartmentsNames,
  updateBranchInHospital,
  addBranchToHospital,
  getBranchById,
  deleteBranchById,
  getBranchesByHosptialName,
  deleteHospitalById,
};
