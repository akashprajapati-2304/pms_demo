import mongoose from "mongoose";
import app from "./app.js";
import env from "./config/env.js";

const startServer = async () => {
  try {
    if (!env.mongoUrl) {
      throw new Error("MONGO_URL environment variable is not set");
    }

    await mongoose.connect(env.mongoUrl, {
      dbName: env.mongoDbName,
    });

    console.log("MongoDB connected");

    app.listen(env.port, () => {
      console.log(`Server is running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();