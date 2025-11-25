// import FilledForm from "../../models/FilledForm.js";
// import mongo from "../../db.js";
// import mongoose from "mongoose"; // <-- Import mongoose

// // Define a model for the APIresponce collection
// const apiResponceSchema = new mongoose.Schema(
//   {
//     agent: String,
//     startTime: mongoose.Schema.Types.Mixed,
//     hanguptime: mongoose.Schema.Types.Mixed,
//   },
//   { strict: false, collection: "APIresponce" }
// );

// // Ensure we are using the 'crms' database
// const crmsDb = mongoose.connection.useDb("crms");
// const APIresponce = crmsDb.model("APIresponce", apiResponceSchema);

// // Get form counts by agent ID
// export const getFormCountsByAgent = async (req, res) => {
//   try {
//     const { agentId } = req.params;

//     if (!agentId) {
//       return res.status(400).json({
//         success: false,
//         message: "Agent ID is required",
//       });
//     }

//     // --- 1. Find the logged-in user ---
//     const user = await mongo.finddoc("adminAndAgents", { ID: agentId });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // --- 2. Create dynamic query objects based on user role ---
//     let formAgentQuery = {};
//     let callAgentQuery = {};

//     if (user.type === "executive") {
//       // --- Logic for Executives (Personal Stats) ---
//       console.log(
//         `[formCountsController] Role: Executive. Fetching personal stats.`
//       );

//       // Query for forms matching this agent's ID
//       formAgentQuery = { agentId: user.ID };

//       // Query for calls matching this agent's "agent string"
//       const username = user.username;
//       const hospital = user.hospitalName || "";
//       const formattedHospital = hospital.replace(/\s+/g, "");
//       const agentString = `${username}@${formattedHospital}`;
//       callAgentQuery = { agent: agentString };
//     } else if (
//       user.type === "teamLeader" ||
//       user.type === "supermanager" ||
//       user.type === "admin"
//     ) {
//       // --- Logic for Managers (Global Stats) ---
//       console.log(
//         `[formCountsController] Role: ${user.type}. Fetching ALL stats.`
//       );

//       // Empty query {} means "match all documents"
//       formAgentQuery = {};
//       callAgentQuery = {};
//     } else {
//       console.log(
//         `[formCountsController] User type ${user.type} has no stats view. Returning 0.`
//       );
//       // Return 0 for any other user type
//       return res.status(200).json({
//         success: true,
//         data: {
//           inbound: 0,
//           outbound: 0,
//           appointments: 0,
//           allTimeCalls: 0,
//           todaysCalls: 0,
//           avgCallDurationToday: 0,
//         },
//       });
//     }

//     // --- 3. Get Call Stats (Today's Calls, Avg Duration, All-Time) ---
//     let allTimeCalls = 0;
//     let todaysCalls = 0;
//     let avgCallDurationToday = 0;

//     // 3a. Get All-Time Calls (using the dynamic callAgentQuery)
//     allTimeCalls = await APIresponce.countDocuments(callAgentQuery);

//     // 3b. Get Today's Call Stats
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const startOfTodayMs = today.getTime();

//     // Create the $match stage for today's calls
//     const todayMatchStage = {
//       ...callAgentQuery, // This will be {} for managers, or {agent: "..."} for execs
//       startTime: { $gte: startOfTodayMs },
//     };

//     const callStats = await APIresponce.aggregate([
//       { $match: todayMatchStage },
//       {
//         $project: {
//           startTimeNum: { $ifNull: [{ $toLong: "$startTime" }, 0] },
//           hanguptimeNum: { $ifNull: [{ $toLong: "$hanguptime" }, 0] },
//         },
//       },
//       {
//         $project: {
//           validCall: {
//             $and: [
//               { $gt: ["$hanguptimeNum", 0] },
//               { $gt: ["$startTimeNum", 0] },
//               { $gte: ["$hanguptimeNum", "$startTimeNum"] },
//             ],
//           },
//           hanguptimeNum: 1,
//           startTimeNum: 1,
//         },
//       },
//       {
//         $project: {
//           callDurationSeconds: {
//             $cond: {
//               if: { $eq: ["$validCall", true] },
//               then: {
//                 $divide: [
//                   { $subtract: ["$hanguptimeNum", "$startTimeNum"] },
//                   1000,
//                 ],
//               },
//               else: 0,
//             },
//           },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           totalCalls: { $sum: 1 },
//           totalDurationSeconds: { $sum: "$callDurationSeconds" },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           totalCalls: 1,
//           avgDurationSeconds: {
//             $cond: [
//               { $eq: ["$totalCalls", 0] },
//               0,
//               { $divide: ["$totalDurationSeconds", "$totalCalls"] },
//             ],
//           },
//         },
//       },
//     ]);

//     if (callStats && callStats.length > 0) {
//       todaysCalls = callStats[0].totalCalls;
//       avgCallDurationToday = Math.round(callStats[0].avgDurationSeconds);
//     }

//     // --- 4. Get Form Stats (Inbound, Outbound, Appointments) ---
//     const result = {
//       inbound: 0,
//       outbound: 0,
//       appointments: 0,
//     };

//     const counts = await FilledForm.aggregate([
//       {
//         $match: formAgentQuery, // Use the dynamic formAgentQuery
//       },
//       {
//         $group: {
//           _id: "$formType",
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           formType: "$_id",
//           count: 1,
//         },
//       },
//     ]);

//     counts.forEach((item) => {
//       if (item.formType === "inbound") {
//         result.inbound = item.count;
//       } else if (item.formType === "outbound") {
//         result.outbound = item.count;
//       }
//     });

//     const appointmentCounts = await FilledForm.aggregate([
//       {
//         $match: {
//           ...formAgentQuery, // Use the dynamic formAgentQuery
//           $or: [
//             { "inboundData.purpose": "Appointment" },
//             { "outboundData.purpose": "appointment" },
//           ],
//         },
//       },
//       {
//         $count: "total",
//       },
//     ]);

//     if (appointmentCounts.length > 0) {
//       result.appointments = appointmentCounts[0].total;
//     }

//     // --- 5. Combine all stats and send response ---
//     result.allTimeCalls = allTimeCalls;
//     result.todaysCalls = todaysCalls;
//     result.avgCallDurationToday = avgCallDurationToday;

//     res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error getting form counts:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

import FilledForm from "../../models/FilledForm.js";
import { getQueryContextByRole } from "./roleController.js";
import { getCallStatistics } from "./callStatsController.js";

// --- Helper Function: Get Form Stats (Inbound, Outbound, Appointments) ---
/**
 * Fetches and calculates form submission statistics from the FilledForm collection.
 * * @param {object} formAgentQuery - The MongoDB filter query for the agent (personal or global).
 * @returns {Promise<{
 * inbound: number, 
 * outbound: number, 
 * appointments: number
 * }>}
 */
const getFormStatistics = async (formAgentQuery) => {
    const result = {
        inbound: 0,
        outbound: 0,
        appointments: 0,
    };

    // 1. Get Inbound and Outbound counts
    const counts = await FilledForm.aggregate([
        { $match: formAgentQuery }, // Apply role-based filter
        {
            $group: {
                _id: "$formType",
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                formType: "$_id",
                count: 1,
            },
        },
    ]);

    counts.forEach((item) => {
        if (item.formType === "inbound") {
            result.inbound = item.count;
        } else if (item.formType === "outbound") {
            result.outbound = item.count;
        }
    });

    // 2. Get Appointment counts (check purpose field for both inbound/outbound)
    const appointmentCounts = await FilledForm.aggregate([
        {
            $match: {
                ...formAgentQuery, // Apply role-based filter
                $or: [
                    { "inboundData.purpose": "Appointment" },
                    { "outboundData.purpose": "appointment" },
                ],
            },
        },
        {
            $count: "total",
        },
    ]);

    if (appointmentCounts.length > 0) {
        result.appointments = appointmentCounts[0].total;
    }

    return result;
};


// --- Main Controller Function (API Endpoint) ---
export const getFormCountsByAgent = async (req, res) => {
    const { agentId } = req.params;

    if (!agentId) {
        return res.status(400).json({
            success: false,
            message: "Agent ID is required",
        });
    }

    try {
        // 1. Determine User Context and Queries
        const context = await getQueryContextByRole(agentId);

        if (!context.success) {
            // User not found
            return res.status(404).json({ success: false, message: context.message });
        }
        
        if (!context.formAgentQuery) {
            // User found, but role has no stats view (return zero stats)
             return res.status(200).json({
                success: true,
                message: context.message,
                data: {
                    inbound: 0, outbound: 0, appointments: 0,
                    allTimeCalls: 0, todaysCalls: 0, avgCallDurationToday: 0,
                },
            });
        }
        
        const { formAgentQuery, callAgentQuery } = context;

        // 2. Run Data Fetches for Calls and Forms in Parallel
        const [callStats, formCountsResult] = await Promise.all([
            getCallStatistics(callAgentQuery),
            getFormStatistics(formAgentQuery)
        ]);
        
        // 3. Combine Results and Send Response
        const finalResult = {
            ...formCountsResult,
            allTimeCalls: callStats.allTimeCalls,
            todaysCalls: callStats.todaysCalls,
            avgCallDurationToday: callStats.avgCallDurationToday,
        };

        res.status(200).json({
            success: true,
            data: finalResult,
        });

    } catch (error) {
        console.error("Error getting combined stats:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};