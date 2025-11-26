/**
 * User Controller
 * Manages user records: fetch all users, fetch by admin, and related user data operations.
 * Related routes: get all users, get users by admin, user data management.
 */
import mongo from "../db.js";
import { generateUniqueId } from "../src/utils.js";

// * function to get all users
const getAllUsers = async (req, res) => {
  try {
    const dataFromDb = await mongo.findAllData(
      { isDeleted: { $ne: true } },
      "adminAndAgents"
    );
    const data = dataFromDb?.filter((obj) => obj.type !== "superadmin") || null;
    res.json({
      message: "Users successfully fetched",
      data: data ? data : null,
      success: true,
    });
  } catch (error) {
    console.error("Error in fetching data:", error);
    res.json({ message: "Error occurred while fetching", success: false });
  }
};

//* function to get users by adminName
const getUsersByAdmin = async (req, res) => {
  console.log("hit api getUsersByAdmin");
  try {
    const { adminName } = req.params;
    if (!adminName) {
      return res.json({
        message: "Admin name is required",
        success: false,
      });
    }
    const projectionObject = {
      _id: 0,
      username: 1,
      email: 1,
      type: 1,
      name: 1,
      hospitalNames: 1,
      branchName: 1,
      hospitalName: 1,
      hospitalNames: 1,
      ID: 1,
      parentUser: 1,
    };
    const dataFromDb = await mongo.findAllDataWithProjection(
      // * here changed previously it was userCreatedBy: "admin" not this is parentUser: adminName
      { parentUser: adminName, isDeleted: { $ne: true } },
      projectionObject,
      "adminAndAgents"
    );
    const data = dataFromDb || null;
    res.json({
      message: "Users successfully fetched",
      success: true,
      data: data ? data : null,
    });
  } catch (error) {
    console.error("Error in fetching data:", error);
    res.json({
      message: "Error occurred while fetching",
      success: false,
    });
  }
};

// * function to create a new user
const createUser = async (req, res) => {
  try {
    const userData = { ...req.body, ID: generateUniqueId() };
    // userData.ID = generateUniqueId();

    if (!userData.username) {
      return res
        .status(400)
        .json({ success: false, message: "Username is required" });
    }

    console.log("Received user data:", userData);

    // Check if the user already exists in the database
    const existingUsers = await mongo.findMulti(
      { username: userData.username, isDeleted: { $ne: true } },
      "adminAndAgents"
    );

    if (existingUsers.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // Insert new user into the database
    await mongo.insertOne(userData, "adminAndAgents");

    return res
      .status(201)
      .json({ success: true, message: "User added successfully" });
  } catch (error) {
    console.error("Error in /addUsers API:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// * function to update a user
const updateUser = async (req, res) => {
  try {
    const userData = { ...req.body };
    const { id, ID, ...rest } = userData;
    if (!ID) {
      return res.json({ success: false, message: "id is required" });
    }
    if (!userData.username) {
      return res.json({ success: false, message: "Username is required" });
    }
    console.log("Received user data:", userData);
    const isDoc = await mongo.finddoc("adminAndAgents", {
      ID,
      isDeleted: { $ne: true },
    });
    console.log("isDoc is :", isDoc);

    await mongo.updateMulti(
      { ID, isDeleted: { $ne: true } },
      "adminAndAgents",
      {
        $set: rest,
      }
    );
    return res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Error in /updateUser API:", error);
    return res.json({ success: false, message: "Internal server error" });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!newPassword) {
      return res.json({ success: false, message: "New password is required" });
    }
    if (!username) {
      return res.json({ success: false, message: "username is required" });
    }
    console.log("Received new password:", newPassword);
    await mongo.updateMulti(
      { username, isDeleted: { $ne: true } },
      "adminAndAgents",
      {
        $set: { password: newPassword },
      }
    );
    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in /updatePassword API:", error);
    return res.json({ success: false, message: "Internal server error" });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.json({ success: false, message: "ID is required" });
    }
    const result = await mongo.updateDocument(
      { ID: id, isDeleted: { $ne: true } },
      "adminAndAgents",
      {
        $set: { isDeleted: true },
      }
    );
    if (result.matchedCount === 0) {
      return res.json({
        success: false,
        message: "User not found or already deleted",
      });
    }
    if (result.modifiedCount === 0) {
      return res.json({
        success: false,
        message: "User already marked as deleted",
      });
    }

    // If the user is successfully marked as deleted
    console.log(`User with ID ${id} marked as deleted`);
    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error in /deleteUserById API:", error);
    return res.json({ success: false, message: "Internal server error" });
  }
};

const getUsersBySuperadmin = async (req, res) => {
  try {
    const users = await mongo.findAllData(
      { userCreatedBy: "superadmin", isDeleted: { $ne: true } },
      "adminAndAgents"
    );
    return res.json({ success: true, message: "Users fetched successfully", data: users });
  } catch (error) {
    console.error("Error in /getUsersBySuperadmin API:", error);
    return res.json({ success: false, message: "Internal server error" });
  }


  // * function to get the logged-in user's own profile

};
const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication failed. User ID not found in token.",
        success: false,
      });
    }
    const userData = await mongo.finddoc("adminAndAgents", {
      ID: userId,
      isDeleted: { $ne: true },
    });

    if (userData === "not found") {
      return res.status(404).json({
        message: "User not found in the database.",
        success: false,
      });
    }
    const { password, ...safeUserData } = userData;
    res.json({
      message: "User profile successfully fetched",
      data: safeUserData,
      success: true,
    });
  } catch (error) {
    console.error("Error in fetching user profile:", error);
    res.status(500).json({
      message: "Internal server error while fetching profile",
      success: false,
    });
  }
};

export {
  getAllUsers,
  createUser,
  updateUser,
  updatePassword,
  deleteUserById,
  getUsersByAdmin,
  getUsersBySuperadmin,
  getMe,
};
