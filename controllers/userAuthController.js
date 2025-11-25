import jwt from "jsonwebtoken";
import env from "../config/env.js";
import mongo from "../db.js";
import { fetchAndStoreSamwadData } from "../services/samwadService.js";

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const secondsBetween = (from, to) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));

const secondsForToday = (sessionStart, sessionEnd) => {
  if (!(sessionStart instanceof Date) || Number.isNaN(sessionStart.getTime())) {
    return 0;
  }

  const todayStart = startOfDay(sessionEnd);
  const effectiveStart = sessionStart < todayStart ? todayStart : sessionStart;

  if (effectiveStart >= sessionEnd) {
    return 0;
  }

  return secondsBetween(effectiveStart, sessionEnd);
};

const formatDuration = (seconds) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds < 0) {
    return "00:00:00";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const userLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt:", { username });

    if (!env.jwtSecret) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const userData = await mongo.finddoc("adminAndAgents", {
      username,
      isDeleted: { $ne: true },
    });

    if (!userData || userData === "not found") {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    if (password !== userData.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const now = new Date();
    const today = formatDate(now);

    // Handle any previous session that never logged out cleanly
    const previousSessionStart = userData.sessionStart
      ? new Date(userData.sessionStart)
      : null;
    const existingDailySeconds =
      typeof userData.dailyAccumulatedTime === "number"
        ? userData.dailyAccumulatedTime
        : Number(userData.dailyAccumulatedTime) || 0;

    let carryForwardSeconds = 0;
    if (
      userData.isLoggedIn &&
      previousSessionStart instanceof Date &&
      !Number.isNaN(previousSessionStart.getTime())
    ) {
      carryForwardSeconds = secondsForToday(previousSessionStart, now);
    }

    const updates = {
      $set: {
        lastLoginTime: now,
        isLoggedIn: true,
        sessionStart: now,
        dailyLoginDate: today,
      },
      $inc: { loginCount: 1 },
    };

    const isNewDayLogin = userData.dailyLoginDate !== today;
    let finalDailySeconds = existingDailySeconds;

    if (isNewDayLogin) {
      // If it's a new day, reset the accumulated time to 0
      finalDailySeconds = 0;
    }

    if (carryForwardSeconds > 0) {
      finalDailySeconds += carryForwardSeconds;
  
    }
updates.$set.dailyAccumulatedTime = finalDailySeconds;


    await mongo.updateDocument(
      { _id: userData._id },
      "adminAndAgents",
      updates
    );

    fetchAndStoreSamwadData().catch((err) => {
      console.error("Background data sync failed to start.", err.message);
    });

    const tokenPayload = {
      agentId: userData.ID,
      userId: userData.ID,
      userType: userData?.userType || userData?.type,
      hospitals: userData?.hospitalNames || userData?.hospitalName,
      branchName: userData?.branchName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
    };

    const token = jwt.sign(tokenPayload, env.jwtSecret);

    const result = {
      id: userData.ID,
      name: userData.name || userData.username,
      username: userData.username,
      isadmin: userData.isadmin,
      type: userData?.type || userData?.userType,
      hospitals: userData?.hospitalNames || userData?.hospitalName,
      phoneuser: userData?.phoneuser,
      phonepass: userData?.phonepass,
      userCreatedBy: userData?.userCreatedBy,
      branchName: userData?.branchName,
    };

    res.cookie("token", token, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "strict",
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Login successful",
      result: { ...result, token },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login",
    });
  }
};

export const userLogout = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID not found",
      });
    }

    const userData = await mongo.finddoc("adminAndAgents", { ID: userId });
    if (!userData || userData === "not found") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let sessionDuration = 0;

    if (userData.isLoggedIn && userData.sessionStart) {
      const sessionEnd = new Date();
      const sessionStartDate = new Date(userData.sessionStart);
      const validSessionStart =
        sessionStartDate instanceof Date &&
        !Number.isNaN(sessionStartDate.getTime())
          ? sessionStartDate
          : null;

      const today = formatDate(sessionEnd);
      let todaysSessionSeconds = 0;

      if (validSessionStart) {
        sessionDuration = secondsBetween(validSessionStart, sessionEnd);
        todaysSessionSeconds = secondsForToday(validSessionStart, sessionEnd);
      } else {
        sessionDuration = 0;
      }

      const existingDailySeconds =
        typeof userData.dailyAccumulatedTime === "number"
          ? userData.dailyAccumulatedTime
          : Number(userData.dailyAccumulatedTime) || 0;

      const dailyAccumulatedTime =
        userData.dailyLoginDate === today
          ? existingDailySeconds + todaysSessionSeconds
          : todaysSessionSeconds;

      await mongo.updateDocument({ ID: userId }, "adminAndAgents", {
        $set: {
          isLoggedIn: false,
          lastLogoutTime: sessionEnd,
          lastSessionDuration: sessionDuration,
          dailyAccumulatedTime,
          dailyLoginDate: today,
        },
        $inc: { totalLoginTime: sessionDuration },
        $unset: { sessionStart: "" },
      });
    } else {
      await mongo.updateDocument({ ID: userId }, "adminAndAgents", {
        $set: { isLoggedIn: false },
        $unset: { sessionStart: "" },
      });
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "strict",
    });

    res.json({
      success: true,
      message: "Logout successful",
      sessionDuration: formatDuration(sessionDuration),
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
};

export default {
  userLogin,
  userLogout,
};
