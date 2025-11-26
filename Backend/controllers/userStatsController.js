// // userStatsController.js
// import mongo from "../db.js";

// /**
//  * Get total login hours for a user
//  */
// const getUserLoginHours = async (req, res) => {
//   try {
//     const { agentId } = req.params;

//     if (!agentId) {
//       return res.status(400).json({
//         success: false,
//         message: "Agent ID is required"
//       });
//     }

//     // Find user by ID (assuming ID field contains the agentId)
//     const userData = await mongo.finddoc("adminAndAgents", { 
//       ID: agentId,
//       isDeleted: { $ne: true }
//     });

//     if (userData === "not found") {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     // ---
//     // --- NEW LOGIC: Calculate current session duration ---
//     // ---
//     let totalLoginSeconds = 0;

//     console.log("User data:", userData);

//     // Check if user is logged in and has a sessionStart time
//     if (userData.isLoggedIn === true && userData.sessionStart) {
//       const sessionStartTime = new Date(userData.sessionStart).getTime();
//       const currentTime = new Date().getTime();

//       console.log("Session start time:", sessionStartTime);
//       console.log("Current time:", currentTime);
//       // Calculate difference in seconds
//       if (currentTime > sessionStartTime) {
//         totalLoginSeconds = Math.round((currentTime - sessionStartTime) / 1000);
//       }
//     }


//     console.log("Total login seconds:", userData.sessionStart);
//     console.log("Total login hours:", Math.floor(totalLoginSeconds / 3600));


    


//     // Format to HH:MM:SS
//     const formatDuration = (seconds) => {
//       const hours = Math.floor(seconds / 3600);
//       const minutes = Math.floor((seconds % 3600) / 60);
//       const secs = seconds % 60;
//       return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     };

//     res.json({
//       success: true,
//       data: {
//         totalLoginSeconds,
//         formattedTime: formatDuration(totalLoginSeconds),
//         hours: Math.floor(totalLoginSeconds / 3600),
//         minutes: Math.floor((totalLoginSeconds % 3600) / 60),
//         seconds: totalLoginSeconds % 60
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching login hours:', error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching login hours"
//     });
//   }
// };

// export { getUserLoginHours };


// userStatsController.js
import mongo from "../db.js";

// Helper to format date as YYYY-MM-DD string
function getFormattedDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const startOfDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Get total login hours for a user (Daily Cumulative)
 */
const getUserLoginHours = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!agentId) {
      return res.status(400).json({ success: false, message: "Agent ID is required" });
    }

    // Find user by ID
    const userData = await mongo.finddoc("adminAndAgents", { 
      ID: agentId,
      isDeleted: { $ne: true }
    });

    if (userData === "not found") {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const todayDate = getFormattedDate(new Date());
    
    // --- 1. Base Accumulated Time (DAILY) ---
    // If dailyLoginDate matches today, use the accumulated time. Otherwise, use 0.
    const storedDailySeconds =
      typeof userData.dailyAccumulatedTime === "number"
        ? userData.dailyAccumulatedTime
        : Number(userData.dailyAccumulatedTime) || 0;

    const accumulatedSeconds =
      userData.dailyLoginDate === todayDate ? storedDailySeconds : 0;
    
    let currentSessionSeconds = 0;
    
    // --- 2. Current Session Duration (if active) ---
    if (userData.isLoggedIn === true && userData.sessionStart) {
      const sessionStartDate = new Date(userData.sessionStart);
      if (!Number.isNaN(sessionStartDate.getTime())) {
        const currentDate = new Date();
        const todayStart = startOfDay(currentDate);
        const effectiveStart =
          sessionStartDate < todayStart ? todayStart : sessionStartDate;

        if (currentDate > effectiveStart) {
          currentSessionSeconds = Math.round(
            (currentDate.getTime() - effectiveStart.getTime()) / 1000
          );
        }
      }
    }

    // --- 3. Final Calculation (Frontend Base Time) ---
    // This is the CUMULATIVE total time the frontend timer must start at.
    const finalDailyTotalSeconds = accumulatedSeconds + currentSessionSeconds;

    // Format duration for response
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    res.json({
      success: true,
      data: {
        // This is the CUMULATIVE time the frontend timer starts from
        initialBaseSeconds: finalDailyTotalSeconds, 
        formattedTime: formatDuration(finalDailyTotalSeconds),
        // Returning accumulatedSeconds (without current session) for debugging/transparency
        accumulatedBaseSeconds: accumulatedSeconds 
      }
    });

  } catch (error) {
    console.error('Error fetching daily login hours:', error);
    res.status(500).json({ success: false, message: "Error fetching daily login hours" });
  }
};

export { getUserLoginHours };