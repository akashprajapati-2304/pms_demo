/**
 * Other Controller (Dynamic Forms)
 * Manages dynamic forms: add, update, fetch all, and get forms by hospital/branch.
 * Related routes: dynamic form CRUD, fetch by hospital/branch.
 */
import mongo from "../db.js";
import { generateUniqueId } from "../src/utils.js";

//* Function to add or update a dynamic form
const addDynamicForm = async (req, res) => {
  const { body } = req;
  if (!body || !Object.keys(body).length) {
    return res.json({ message: "empty request", success: false });
  }
  const id = generateUniqueId();
  body.id = id; // Assign a unique ID to the form
  console.log("body is :", body);
  const formTitle = body.formTitle;
  const foundDoc = await mongo.finddoc("dynamicForms", { formTitle });
  console.log("foundDoc is :", foundDoc);
  try {
    if (foundDoc === "not found") {
      await mongo.insertOne(body, "dynamicForms");
    } else {
      await mongo.updateMulti({ formTitle }, "dynamicForms", { $set: body });
    }
    res.json({ message: "data inserted successfully", success: true });
  } catch (error) {
    console.log("error in inserting", error);
    res.json({ message: "upload error", success: false });
  }
};

//* Function to update a dynamic form
const updateDynamicForm = async (req, res) => {
  try {
    const { body } = req;
    if (!body || !Object.keys(body).length) {
      return res.json({ message: "empty request", success: false });
    }
    console.log("body is :", body);
    const formId = body.id;
    await mongo.updateMulti({ id: formId }, "dynamicForms", { $set: body });
    res.json({ message: "data updated successfully", success: true });
  } catch (error) {
    console.log("error in inserting", error);
    res.json({ message: "upload error", success: false });
  }
};

//* Function to get all dynamic forms
const getAllDynamicForms = async (req, res) => {
  try {
    const forms = await mongo.findAllData({}, "dynamicForms");
    res.json({ forms, success: true });
  } catch (error) {
    console.error("Error fetching dynamic forms:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

// * function to get dynamic forms by hospital trimmed name and branchID
const getDynamicFormsByHospital = async (req, res) => {
  try {
    const { hospitalName, branchId } = req.params;
    if (!hospitalName || !branchId) {
      return res
        .status(400)
        .json({ message: "Missing required parameters", success: false });
    }
    const forms = await mongo.findAllData(
      {
        hospitalName,
        branch: branchId,
      },
      "dynamicForms"
    );
    if (forms === "not found") {
      return res.status(404).json({
        message: "No forms found for the specified hospital and branch",
        success: false,
      });
    }
    res.json({ data: forms, success: true });
  } catch (error) {
    console.error("Error fetching dynamic forms by hospital:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};


// * api for deleting dynamic form by id in res.params
const deleteDynamicForm = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Missing form ID", success: false });
    }
    const result = await mongo.updateDocument({ id }, "dynamicForms", { $set: { isDeleted: true } });
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Form not found", success: false });
    }
    res.json({ message: "Form deleted successfully", success: true });
  } catch (error) {
    console.error("Error deleting dynamic form:", error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export default {
  getAllDynamicForms,
  updateDynamicForm,
  addDynamicForm,
  deleteDynamicForm,
  getDynamicFormsByHospital,
};
