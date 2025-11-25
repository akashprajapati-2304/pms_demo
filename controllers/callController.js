import mongo from "../db.js";
import { fetchAndStoreSamwadData } from "../services/samwadService.js";

const REQUIRED_CALL_KEYS = [
  "SourceNumber",
  "DestinationNumber",
  "DisplayNumber",
  "StartTime",
  "EndTime",
  "CallDuration",
  "Direction",
  "Status",
  "CallNotes",
  "ResourceURL",
  "CallSessionId",
  "CallerName",
  "CallerCity",
  "CallerState",
  "CallerCountry",
  "CallerZipCode",
];

const VALID_DIRECTIONS = ["inbound", "outbound"];
const VALID_STATUSES = ["agentpopup", "answered", "missedcall", "not-reachable"];

export const logCallEvent = async (req, res) => {
  const callPayload = req.body;

  const missingKeys = REQUIRED_CALL_KEYS.filter((key) => !(key in callPayload));
  if (missingKeys.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed: Payload is missing required fields.",
      missingFields: missingKeys,
    });
  }

  const normalizedDirection = String(callPayload.Direction).toLowerCase();
  const normalizedStatus = String(callPayload.Status).toLowerCase();

  if (!VALID_DIRECTIONS.includes(normalizedDirection)) {
    return res.status(400).json({
      success: false,
      message: `Invalid Direction value. Must be 'Inbound' or 'Outbound'. Received: ${callPayload.Direction}`,
    });
  }

  if (!VALID_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid Status value. Must be one of: AgentPopUp, Answered, MissedCall, Not-Reachable. Received: ${callPayload.Status}`,
    });
  }

  try {
    await mongo.insertOne(
      {
        ...callPayload,
        receivedAt: new Date(),
        CallDurationSeconds:
          parseInt(String(callPayload.CallDuration).replace(" sec", "").trim(), 10) || 0,
      },
      "APIresponce"
    );

    res.status(201).json({
      success: true,
      message: "Call event logged successfully.",
      callSessionId: callPayload.CallSessionId,
    });
  } catch (error) {
    console.error("Error processing call event:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during database insertion.",
      error: error.message,
    });
  }
};

export const getCallData = async (req, res) => {
  fetchAndStoreSamwadData().catch((err) => {
    console.error("Dashboard refresh sync trigger failed:", err.message);
  });

  try {
    const allCallData = await mongo.findMulti({}, "APIresponce");

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (!allCallData) {
      return res.status(404).json({ success: false, message: "No data found." });
    }

    res.json({
      success: true,
      count: allCallData.length,
      data: allCallData,
    });
  } catch (error) {
    console.error("Error in /api/getCallData endpoint:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching call data",
      error: error.message,
    });
  }
};

