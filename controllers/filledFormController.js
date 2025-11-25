import FilledForm from "../models/FilledForm.js";
import mongoose from "mongoose";
import mongo from "../db.js"; // Import the mongo db helper

// Create new filled form
export const createFilledForm = async (req, res) => {
  try {
    const formData = req.body;
    console.log("Received form data for crms database:", formData);

    // Validate required fields - only formType is required
    if (!formData.formType) {
      return res.status(400).json({
        success: false,
        message: "Form type is required",
        receivedData: formData,
      });
    }

    // Prepare the data object based on form type
    let filledFormData = {
      formType: formData.formType,
      hospitalId: formData.hospitalId || null,
      agentId: formData.agentId || null,
      submittedAt: new Date(),
    };

    if (formData.formType === "inbound") {
      // Map inbound form data to schema
      filledFormData.inboundData = {
        callerType: formData.callerType || "",
        referenceFrom: formData.referenceFrom || "",
        patientDetails: {
          patientName: formData.patientName || "",
          patientMobile: formData.patientMobile || "",
          alternateMobile: formData.alternateMobile || "",
          patientAge: formData.patientAge
            ? parseInt(formData.patientAge)
            : null,
          location: formData.location || "",
          gender: formData.gender || "",
          status: formData.status || "",
          category: formData.category || "",
        },
        attendantDetails: {
          attendantName: formData.attendantName || "",
          attendantMobile: formData.attendantMobile || "",
        },
        purpose: formData.purpose || "", // This is set if callStatus is 'Connected'
      };

      // --- UPDATED: Handle all 16 Inbound purposes ---

      // Add purpose-specific data
      if (formData.purpose === "Appointment") {
        filledFormData.inboundData.appointment = {
          department: formData.apptDepartment || "",
          dateTime: formData.apptDateTime || null,
          doctor: formData.apptDoctor || "",
          remarks: formData.apptRemarks || "",
        };
      } else if (formData.purpose === "General Query") {
        filledFormData.inboundData.generalQuery = {
          department: formData.gqDepartment || "",
          remarks: formData.gqRemarks || "",
        };
      } else if (formData.purpose === "Surgery") {
        filledFormData.inboundData.surgery = {
          surgeryName: formData.surgeryName || "",
          department: formData.surgDepartment || "",
          doctor: formData.surgDoctor || "",
          remarks: formData.surgRemarks || "",
        };
      } else if (formData.purpose === "Health Checkup") {
        filledFormData.inboundData.healthCheckup = {
          doctor: formData.hcDoctor || "",
          healthPackageName: formData.healthPackageName || "",
          remarks: formData.hcRemarks || "",
        };
      } else if (formData.purpose === "Emergency Query") {
        filledFormData.inboundData.emergencyQuery = {
          department: formData.eqDepartment || "",
          doctor: formData.eqDoctor || "",
          issue: formData.eqIssue || "",
          remarks: formData.eqRemarks || "",
        };
      } else if (formData.purpose === "Call Drop") {
        // This purpose is handled by callStatus in Forms.jsx,
        // but validation implies it can also be a purpose.
        filledFormData.inboundData.callDrop = {
          callBack: formData.callBack || "",
          connected: formData.connected || "",
          disconnectionReason: formData.disconnectionReason || "",
          remarks: formData.cdRemarks || "",
        };
      } else if (formData.purpose === "Marketing Campaign") {
        filledFormData.inboundData.marketingCampaign = {
          marketingCampaignName: formData.marketingCampaignName || "",
          remarks: formData.mcRemarks || "",
        };
      } else if (formData.purpose === "Complaints") {
        filledFormData.inboundData.complaints = {
          department: formData.compDepartment || "",
          doctor: formData.compDoctor || "",
          remarks: formData.compRemarks || "",
        };
      } else if (formData.purpose === "OPD Timings") {
        filledFormData.inboundData.opdTimings = {
          department: formData.opdDepartment || "",
          doctor: formData.opdDoctor || "",
          remarks: formData.opdRemarks || "",
        };
      } else if (formData.purpose === "Diagnosis or Test Price") {
        // Field name from Forms.jsx
        filledFormData.inboundData.diagnosingTestPrice = {
          // Schema name from FilledForm.js
          department: formData.dtDepartment || "",
          doctor: formData.dtDoctor || "",
          remarks: formData.dtRemarks || "",
        };
      } else if (formData.purpose === "Reports") {
        filledFormData.inboundData.reports = {
          reportName: formData.reportName || "",
          remarks: formData.repRemarks || "",
        };
      } else if (formData.purpose === "Government Health Schemes") {
        filledFormData.inboundData.govtHealthScheme = {
          department: formData.ghsDepartment || "",
          healthSchemeName: formData.govtHealthSchemeName || "",
          remarks: formData.ghsRemarks || "",
        };
      } else if (formData.purpose === "Non-Government Schemes") {
        filledFormData.inboundData.nonGovtHealthScheme = {
          department: formData.nghsDepartment || "",
          healthSchemeName: formData.nonGovtHealthSchemeName || "",
          remarks: formData.nghsRemarks || "",
        };
      } else if (formData.purpose === "Ambulance") {
        filledFormData.inboundData.ambulance = {
          ambulanceLocation: formData.ambulanceLocation || "",
          ambulanceShared: formData.ambulanceShared || "",
          remarks: formData.ambRemarks || "",
        };
      } else if (formData.purpose === "Junk") {
        filledFormData.inboundData.junk = {
          remarks: formData.junkRemarks || "",
        };
      } else if (formData.purpose === "Job Related") {
        filledFormData.inboundData.jobRelated = {
          remarks: formData.jrRemarks || "",
        };
      }

      // Handle 'Call Drop' as a callStatus (from Forms.jsx logic)
      if (formData.callStatus === "Call Drop") {
        filledFormData.inboundData.callDrop = {
          ...filledFormData.inboundData.callDrop, // Keep purpose data if it exists
          disconnectionReason: formData.callDropReason || "",
          // Note: The form doesn't seem to collect callBack/connected for this status
        };
      }
    } else if (formData.formType === "outbound") {
      // Handle outbound form data
      filledFormData.outboundData = {
        patientName: formData.patientName || "",
        mobileNumber: formData.mobileNumber || "",
        purpose: formData.purpose || "",
      };

      // --- UPDATED: Handle all 10 Outbound purposes ---
      if (formData.purpose === "appointment") {
        filledFormData.outboundData.appointment = {
          department: formData.appointmentDepartment || "",
          doctor: formData.appointmentDoctor || "",
          dateTime: formData.appointmentDateTime || null,
          remarks: formData.appointmentRemarks || "",
        };
      } else if (formData.purpose === "followup") {
        filledFormData.outboundData.followup = {
          followupType: formData.followupType || "",
          status: formData.followupStatus || "", // 'status' field from form
          department: formData.followupDepartment || "", // <-- ADDED
          doctor: formData.followupDoctor || "", // <-- ADDED
          remarks: formData.followupRemarks || "",
        };
      } else if (formData.purpose === "informative") {
        filledFormData.outboundData.informative = {
          informativeTopic: formData.informativeTopic || "",
          detailsShared: formData.informativeDetailsShared || "",
          remarks: formData.informativeRemarks || "",
        };
      } else if (formData.purpose === "marketing") {
        filledFormData.outboundData.marketing = {
          marketingCampaignName: formData.marketingCampaignName || "",
          detailsShared: formData.marketingDetailsShared || "",
          remarks: formData.marketingRemarks || "",
        };
      } else if (formData.purpose === "feedback") {
        filledFormData.outboundData.feedback = {
          feedbackType: formData.feedbackType || "",
        };
        if (formData.feedbackType === "ipd") {
          const questions = [];
          for (let i = 1; i <= 10; i++) {
            if (formData[`ipdQ${i}`]) {
              questions.push({
                question: `Question ${i}`,
                rating: parseInt(formData[`ipdQ${i}`]),
              });
            }
          }
          filledFormData.outboundData.feedback.ipdFeedback = {
            ipdNumber: formData.ipdNumber || "",
            questions: questions,
            remarks: formData.ipdRemarks || "",
          };
        } else if (formData.feedbackType === "opd") {
          const questions = [];
          for (let i = 1; i <= 10; i++) {
            if (formData[`opdQ${i}`]) {
              questions.push({
                question: `Question ${i}`,
                rating: parseInt(formData[`opdQ${i}`]),
              });
            }
          }
          filledFormData.outboundData.feedback.opdFeedback = {
            opdNumber: formData.opdNumber || "",
            questions: questions,
            remarks: formData.opdRemarks || "",
          };
        } else if (formData.feedbackType === "noFeedback") {
          filledFormData.outboundData.feedback.noFeedback = {
            remarks: formData.noFeedbackRemarks || "",
          };
        } else if (formData.feedbackType === "notConnected") {
          filledFormData.outboundData.feedback.notConnected = {
            remarks: formData.notConnectedRemarks || "",
          };
        }
      } else if (formData.purpose === "missed") {
        filledFormData.outboundData.missedCall = {
          connectionStatus: formData.missedConnectionStatus || "",
        };
        if (formData.missedConnectionStatus === "Connected") {
          filledFormData.outboundData.missedCall.patientDetails = {
            patientName: formData.missedPatientName || "",
            patientMobile: formData.missedPatientMobile || "",
            alternateMobile: formData.missedAltMobile || "",
            patientAge: formData.missedPatientAge
              ? parseInt(formData.missedPatientAge)
              : null,
            location: formData.missedLocation || "",
            gender: formData.missedGender || "",
            status: formData.missedStatus || "",
            category: formData.missedCategory || "",
          };
          filledFormData.outboundData.missedCall.remarks =
            formData.missedRemarks || "";
        } else if (formData.missedConnectionStatus === "Not Connected") {
          filledFormData.outboundData.missedCall.remarks =
            formData.missedNotRemarks || "";
        }
      }

      // Handle lead platforms
      const platforms = ["justdial", "practo", "whatsapp", "facebook"];
      if (platforms.includes(formData.purpose)) {
        const platform = formData.purpose;
        filledFormData.outboundData[platform] = {
          lead: formData[`${platform}Lead`] || "",
        };
        if (formData[`${platform}Lead`] === "Yes") {
          filledFormData.outboundData[platform].patientDetails = {
            patientName: formData[`${platform}PatientName`] || "",
            patientMobile: formData[`${platform}PatientMobile`] || "",
            alternateMobile: formData[`${platform}AltMobile`] || "",
            patientAge: formData[`${platform}PatientAge`]
              ? parseInt(formData[`${platform}PatientAge`])
              : null,
            location: formData[`${platform}Location`] || "",
            gender: formData[`${platform}Gender`] || "",
            status: formData[`${platform}Status`] || "",
            category: formData[`${platform}Category`] || "",
          };
          filledFormData.outboundData[platform].remarks =
            formData[`${platform}Remarks`] || "";
        } else if (formData[`${platform}Lead`] === "No") {
          filledFormData.outboundData[platform].remarks =
            formData[`${platform}NoRemarks`] || "";
        }
      }
    }

    console.log(
      "Prepared form data for saving in crms.filledForms:",
      JSON.stringify(filledFormData, null, 2)
    );
    const filledForm = new FilledForm(filledFormData);

    await filledForm.save();

    res.status(201).json({
      success: true,
      message: "Form submitted successfully to crms database",
      data: filledForm,
    });
  } catch (error) {
    console.error("Error creating filled form in crms database:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all filled forms with filtering and pagination
export const getFilledForms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      formType,
      hospitalId,
      agentId,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (formType) filter.formType = formType;
    if (hospitalId) filter.hospitalId = hospitalId;
    if (agentId) filter.agentId = agentId;

    // Date range filter
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { submittedAt: -1 },
      populate: [
        { path: "hospitalId", select: "name" },
        { path: "agentId", select: "name email" },
      ],
    };

    const filledForms = await FilledForm.find(filter)
      .populate("hospitalId", "name")
      .populate("agentId", "name email")
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FilledForm.countDocuments(filter);

    res.json({
      success: true,
      data: filledForms,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching filled forms:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single filled form by ID
export const getFilledFormById = async (req, res) => {
  try {
    const filledForm = await FilledForm.findById(req.params.id)
      .populate("hospitalId", "name address")
      .populate("agentId", "name email phone");

    if (!filledForm) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.json({
      success: true,
      data: filledForm,
    });
  } catch (error) {
    console.error("Error fetching filled form:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update filled form
export const updateFilledForm = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const filledForm = await FilledForm.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!filledForm) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.json({
      success: true,
      message: "Form updated successfully",
      data: filledForm,
    });
  } catch (error) {
    console.error("Error updating filled form:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete filled form
export const deleteFilledForm = async (req, res) => {
  try {
    const filledForm = await FilledForm.findByIdAndDelete(req.params.id);

    if (!filledForm) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.json({
      success: true,
      message: "Form deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting filled form:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ---
// 2. THIS IS THE NEW FUNCTION FOR YOUR DASHBOARD
// ---
export const getAgentDashboardCounts = async (req, res) => {
  try {
    const { agentId } = req.params; // Get agentId from the URL

    if (!agentId) {
      return res
        .status(400)
        .json({ success: false, message: "Agent ID is required" });
    }

    // --- A. Get Agent's Username ---
    // We need the username (like 'Vineet') to query the 'callData' collection.
    const agentData = await mongo.finddoc("adminAndAgents", { ID: agentId });

    if (!agentData || agentData === "not found") {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    // *** ASSUMPTION 1: The agent's username is stored in the 'username' field.
    const agentUsername = agentData.username;
    if (!agentUsername) {
      return res
        .status(404)
        .json({ success: false, message: "Agent username not found" });
    }

    // --- B. Define "Today" ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Start of today (00:00:00)

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // End of today (23:59:59)

    // --- C. Run All Queries in Parallel ---
    const [
      allTimeInbound,
      allTimeOutbound,
      allTimeAppointments,
      todaysCallData, // <-- Get the raw call data
    ] = await Promise.all([
      // Query 1: All-time Inbound form count (from FilledForm)
      FilledForm.countDocuments({ agentId: agentId, formType: "inbound" }),

      // Query 2: All-time Outbound form count (from FilledForm)
      FilledForm.countDocuments({ agentId: agentId, formType: "outbound" }),

      // Query 3: All-time Appointment form count (from FilledForm)
      FilledForm.countDocuments({
        agentId: agentId,
        formType: "inbound",
        "inboundData.purpose": "Appointment",
      }),

      // Query 4: Today's ACTUAL calls from 'callData'
      // *** ASSUMPTION 2: Your call collection is named "callData"
      mongo.finddocs("callData", {
        // *** ASSUMPTION 3: The agent's username is stored in "agentUsername"
        agentUsername: agentUsername,
        // *** ASSUMPTION 4: The call date is stored in "callDate"
        callDate: { $gte: todayStart, $lte: todayEnd },
      }),
    ]);

    // --- D. Calculate Today's Stats from callData ---
    const todaysCallsCount =
      todaysCallData && todaysCallData !== "not found"
        ? todaysCallData.length
        : 0;

    let totalDurationToday = 0;
    if (todaysCallsCount > 0) {
      totalDurationToday = todaysCallData.reduce((acc, call) => {
        // *** ASSUMPTION 5: Call duration is stored in a field named "duration" (in seconds)
        return acc + (call.duration || 0);
      }, 0);
    }

    // Calculate average, prevent division by zero
    const avgCallDurationToday =
      todaysCallsCount > 0
        ? Math.floor(totalDurationToday / todaysCallsCount)
        : 0;

    // --- E. Send Response ---
    res.json({
      success: true,
      data: {
        inbound: allTimeInbound,
        outbound: allTimeOutbound,
        appointments: allTimeAppointments,
        todaysCalls: todaysCallsCount, // <-- Correctly a daily call count
        avgCallDurationToday: avgCallDurationToday, // <-- Correctly a daily average
      },
    });
  } catch (error) {
    console.error("Error fetching agent dashboard counts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get form statistics by agent
export const getFormStatisticsByAgent = async (req, res) => {
  try {
    const { agentId, hospitalId, startDate, endDate } = req.query;

    const matchStage = {};
    // FIX: agentId in the database is a String, not ObjectId
    if (agentId) matchStage.agentId = agentId; // <-- Corrected: No ObjectId conversion
    if (hospitalId)
      matchStage.hospitalId = new mongoose.Types.ObjectId(hospitalId);
    if (startDate || endDate) {
      matchStage.submittedAt = {};
      if (startDate) matchStage.submittedAt.$gte = new Date(startDate);
      if (endDate) matchStage.submittedAt.$lte = new Date(endDate);
    }

    const statistics = await FilledForm.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$formType",
          count: { $sum: 1 },
          inboundPurposes: {
            $push: {
              $cond: [
                { $eq: ["$formType", "inbound"] },
                "$inboundData.purpose",
                null,
              ],
            },
          },
          outboundPurposes: {
            $push: {
              $cond: [
                { $eq: ["$formType", "outbound"] },
                "$outboundData.purpose",
                null,
              ],
            },
          },
        },
      },
    ]);

    // Process purpose counts
    const purposeStats = {
      inbound: {},
      outbound: {},
    };

    statistics.forEach((stat) => {
      if (stat._id === "inbound") {
        stat.inboundPurposes.forEach((purpose) => {
          if (purpose) {
            purposeStats.inbound[purpose] =
              (purposeStats.inbound[purpose] || 0) + 1;
          }
        });
      } else if (stat._id === "outbound") {
        stat.outboundPurposes.forEach((purpose) => {
          if (purpose) {
            purposeStats.outbound[purpose] =
              (purposeStats.outbound[purpose] || 0) + 1;
          }
        });
      }
    });

    // Calculate totals
    const inboundCount =
      statistics.find((stat) => stat._id === "inbound")?.count || 0;
    const outboundCount =
      statistics.find((stat) => stat._id === "outbound")?.count || 0;
    const totalCount = inboundCount + outboundCount;

    res.json({
      success: true,
      data: {
        totalForms: totalCount,
        inboundCount,
        outboundCount,
        formTypeCounts: statistics,
        purposeStats,
      },
    });
  } catch (error) {
    console.error("Error fetching form statistics by agent:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get form statistics
export const getFormStatistics = async (req, res) => {
  try {
    const { hospitalId, startDate, endDate } = req.query;

    const matchStage = {};
    if (hospitalId) matchStage.hospitalId = hospitalId; // Assuming hospitalId is a string, if it's ObjectId, it needs conversion
    if (startDate || endDate) {
      matchStage.submittedAt = {};
      if (startDate) matchStage.submittedAt.$gte = new Date(startDate);
      if (endDate) matchStage.submittedAt.$lte = new Date(endDate);
    }

    const statistics = await FilledForm.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$formType",
          count: { $sum: 1 },
          inboundPurposes: {
            $push: {
              $cond: [
                { $eq: ["$formType", "inbound"] },
                "$inboundData.purpose",
                null,
              ],
            },
          },
          outboundPurposes: {
            $push: {
              $cond: [
                { $eq: ["$formType", "outbound"] },
                "$outboundData.purpose",
                null,
              ],
            },
          },
        },
      },
    ]);

    // Process purpose counts
    const purposeStats = {
      inbound: {},
      outbound: {},
    };

    statistics.forEach((stat) => {
      if (stat._id === "inbound") {
        stat.inboundPurposes.forEach((purpose) => {
          if (purpose) {
            purposeStats.inbound[purpose] =
              (purposeStats.inbound[purpose] || 0) + 1;
          }
        });
      } else if (stat._id === "outbound") {
        stat.outboundPurposes.forEach((purpose) => {
          if (purpose) {
            purposeStats.outbound[purpose] =
              (purposeStats.outbound[purpose] || 0) + 1;
          }
        });
      }
    });

    res.json({
      success: true,
      data: {
        totalForms: statistics.reduce((sum, stat) => sum + stat.count, 0),
        formTypeCounts: statistics,
        purposeStats,
      },
    });
  } catch (error) {
    console.error("Error fetching form statistics:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
