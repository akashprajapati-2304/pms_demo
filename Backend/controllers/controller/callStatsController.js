import mongoose from "mongoose";
import { getQueryContextByRole } from "./roleController.js";

// Define the model/schema for the APIresponce collection
const apiResponceSchema = new mongoose.Schema(
    {
        agent: String,
        startTime: mongoose.Schema.Types.Mixed,
        hanguptime: mongoose.Schema.Types.Mixed,
    },
    { strict: false, collection: "APIresponce" }
);

// Ensure we are using the 'crms' database connection
const crmsDb = mongoose.connection.useDb("crms");
let APIresponce;
try {
    // Check if model already exists to prevent overwrite errors
    APIresponce = crmsDb.model("APIresponce");
} catch (error) {
    APIresponce = crmsDb.model("APIresponce", apiResponceSchema);
}

/**
 * Fetches and calculates call statistics from the APIresponce collection.
 * * @param {object} callAgentQuery - The MongoDB filter query for the agent (personal or global).
 * @returns {Promise<{
 * allTimeCalls: number, 
 * todaysCalls: number, 
 * avgCallDurationToday: number
 * }>}
 */


export const getCallStatistics = async (callAgentQuery) => {
    try {
        let allTimeCalls = 0;
        let todaysCalls = 0;
        let avgCallDurationToday = 0;

        // 1. Get All-Time Calls (simple count)
        allTimeCalls = await APIresponce.countDocuments(callAgentQuery);

        // 2. Setup Today's Call Date Range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfTodayMs = today.getTime();

        // Match stage for today's calls, filtered by the role query
        const todayMatchStage = {
            ...callAgentQuery, 
            startTime: { $gte: startOfTodayMs },
        };

        // 3. MongoDB Aggregation Pipeline for Today's Stats
        const callStats = await APIresponce.aggregate([
            { $match: todayMatchStage },
            {
                $project: {
                    // Convert mixed time types to numerical milliseconds
                    startTimeNum: { $ifNull: [{ $toLong: "$startTime" }, 0] },
                    hanguptimeNum: { $ifNull: [{ $toLong: "$hanguptime" }, 0] },
                },
            },
            {
                $project: {
                    // Check if the call has valid duration data (hangup >= start)
                    validCall: {
                        $and: [
                            { $gt: ["$hanguptimeNum", 0] },
                            { $gt: ["$startTimeNum", 0] },
                            { $gte: ["$hanguptimeNum", "$startTimeNum"] },
                        ],
                    },
                    hanguptimeNum: 1,
                    startTimeNum: 1,
                },
            },
            {
                $project: {
                    // Calculate duration in seconds
                    callDurationSeconds: {
                        $cond: {
                            if: { $eq: ["$validCall", true] },
                            then: {
                                $divide: [
                                    { $subtract: ["$hanguptimeNum", "$startTimeNum"] },
                                    1000, // Convert ms to seconds
                                ],
                            },
                            else: 0,
                        },
                    },
                },
            },
            {
                // Group all today's results to calculate totals
                $group: {
                    _id: null,
                    totalCalls: { $sum: 1 },
                    totalDurationSeconds: { $sum: "$callDurationSeconds" },
                },
            },
            {
                // Final projection to calculate the average
                $project: {
                    _id: 0,
                    totalCalls: 1,
                    avgDurationSeconds: {
                        $cond: [
                            { $eq: ["$totalCalls", 0] },
                            0,
                            { $divide: ["$totalDurationSeconds", "$totalCalls"] },
                        ],
                    },
                },
            },
        ]);

        if (callStats && callStats.length > 0) {
            todaysCalls = callStats[0].totalCalls;
            avgCallDurationToday = Math.round(callStats[0].avgDurationSeconds);
        }

        return {
            allTimeCalls,
            todaysCalls,
            avgCallDurationToday
        };

    } catch (error) {
        console.error("Error fetching call statistics:", error);
        return { allTimeCalls: 0, todaysCalls: 0, avgCallDurationToday: 0 };
    }
};

// Helper to compute stats for a custom time range
const getStatsForRange = async (callAgentQuery, startMs, endMs) => {
    try {
        const matchStage = {
            ...callAgentQuery,
            startTime: { $gte: startMs, $lte: endMs },
        };

        const callStats = await APIresponce.aggregate([
            { $match: matchStage },
            {
                $project: {
                    startTimeNum: { $ifNull: [{ $toLong: "$startTime" }, 0] },
                    hanguptimeNum: { $ifNull: [{ $toLong: "$hanguptime" }, 0] },
                },
            },
            {
                $project: {
                    validCall: {
                        $and: [
                            { $gt: ["$hanguptimeNum", 0] },
                            { $gt: ["$startTimeNum", 0] },
                            { $gte: ["$hanguptimeNum", "$startTimeNum"] },
                        ],
                    },
                    hanguptimeNum: 1,
                    startTimeNum: 1,
                },
            },
            {
                $project: {
                    callDurationSeconds: {
                        $cond: {
                            if: { $eq: ["$validCall", true] },
                            then: {
                                $divide: [
                                    { $subtract: ["$hanguptimeNum", "$startTimeNum"] },
                                    1000,
                                ],
                            },
                            else: 0,
                        },
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalCalls: { $sum: 1 },
                    totalDurationSeconds: { $sum: "$callDurationSeconds" },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalCalls: 1,
                    avgDurationSeconds: {
                        $cond: [
                            { $eq: ["$totalCalls", 0] },
                            0,
                            { $divide: ["$totalDurationSeconds", "$totalCalls"] },
                        ],
                    },
                },
            },
        ]);

        if (callStats && callStats.length > 0) {
            return {
                totalCalls: callStats[0].totalCalls,
                avgDurationSeconds: Math.round(callStats[0].avgDurationSeconds),
            };
        }
        return { totalCalls: 0, avgDurationSeconds: 0 };
    } catch (e) {
        console.error("Error computing stats for range:", e);
        return { totalCalls: 0, avgDurationSeconds: 0 };
    }
};

export const getCallStatsByAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        if (!agentId) {
            return res.status(400).json({ success: false, message: "Agent ID is required" });
        }

        const context = await getQueryContextByRole(agentId);
        if (!context.success) {
            return res.status(404).json({ success: false, message: context.message || "User not found" });
        }

        if (!context.callAgentQuery) {
            return res.status(200).json({
                success: true,
                data: { allTimeCalls: 0, todaysCalls: 0, avgCallDurationToday: 0 }
            });
        }

        const base = await getCallStatistics(context.callAgentQuery);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        const yStart = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0).getTime();
        const yEnd = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999).getTime();

        const day = now.getDay();
        const diffToMonday = (day + 6) % 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        const weekStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0).getTime();
        const weekEnd = todayEnd;

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        const monthEnd = todayEnd;

        const [todayStats, yesterdayStats, weekStats, monthStats] = await Promise.all([
            getStatsForRange(context.callAgentQuery, todayStart, todayEnd),
            getStatsForRange(context.callAgentQuery, yStart, yEnd),
            getStatsForRange(context.callAgentQuery, weekStart, weekEnd),
            getStatsForRange(context.callAgentQuery, monthStart, monthEnd),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                allTimeCalls: base.allTimeCalls,
                todaysCalls: todayStats.totalCalls,
                yesterdayCalls: yesterdayStats.totalCalls,
                weekCalls: weekStats.totalCalls,
                monthCalls: monthStats.totalCalls,
                avgCallDurationToday: todayStats.avgDurationSeconds,
            },
        });
    } catch (error) {
        console.error("Error in getCallStatsByAgent:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};