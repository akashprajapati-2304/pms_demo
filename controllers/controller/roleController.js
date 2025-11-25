import mongo from "../../db.js";

/**
 * Determines the user's role and sets up the appropriate MongoDB queries 
 * for fetching personal vs. global stats.
 * * @param {string} agentId - The ID of the currently logged-in user.
 * @returns {Promise<{
 * success: boolean, 
 * user: object|null, 
 * formAgentQuery: object, 
 * callAgentQuery: object, 
 * message: string|undefined 
 * }>}
 */
export const getQueryContextByRole = async (agentId) => {
    try {
        // --- 1. Find the logged-in user in 'adminAndAgents' collection ---
        const user = await mongo.finddoc("adminAndAgents", { ID: agentId });

        if (!user) {
            return { success: false, user: null, formAgentQuery: {}, callAgentQuery: {}, message: "User not found" };
        }

        // --- 2. Create dynamic query objects based on user role ---
        let formAgentQuery = {}; // For FilledForm collection
        let callAgentQuery = {}; // For APIresponce collection

        if (user.type === "executive") {
            // Executive: Query for personal stats only
            formAgentQuery = { agentId: user.ID };

            // Construct agent string for APIresponce collection query: "username@HospitalName"
            const username = user.username;
            const hospital = user.hospitalName || "";
            const formattedHospital = hospital.replace(/\s+/g, "");
            const agentString = `${username}@${formattedHospital}`;
            callAgentQuery = { agent: agentString };

        } else if (
            user.type === "teamLeader" ||
            user.type === "supermanager" ||
            user.type === "admin"
        ) {
            // Manager/Admin Roles: Query for ALL stats
            formAgentQuery = {}; // Match all documents
            callAgentQuery = {}; // Match all documents

        } else {
            // Role found, but no dashboard view available for this role
            return { 
                success: true, 
                user: user, 
                formAgentQuery: null, 
                callAgentQuery: null, 
                message: `User type ${user.type} does not have a dashboard view.`
            };
        }

        return {
            success: true,
            user: user,
            formAgentQuery,
            callAgentQuery
        };

    } catch (error) {
        console.error("Error determining user role and context:", error);
        return { success: false, user: null, formAgentQuery: {}, callAgentQuery: {}, message: "Internal server error" };
    }
};