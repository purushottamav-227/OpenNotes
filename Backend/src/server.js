import app from "./app.js";
import env from "./config/env.js";
import {
  connectDatabase,
  disconnectDatabase
} from "./config/database.js";

let server;

async function startServer() {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      console.log(`OpenNotes API listening on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Failed to start OpenNotes API:", error.message);
    process.exitCode = 1;
    await disconnectDatabase();
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    server.close(async (error) => {
      if (error) {
        console.error("Error closing HTTP server:", error.message);
        process.exitCode = 1;
      }

      try {
        await disconnectDatabase();
      } catch (disconnectError) {
        console.error(
          "Error closing MongoDB connection:",
          disconnectError.message
        );
        process.exitCode = 1;
      }

      process.exit();
    });
  } else {
    await disconnectDatabase();
    process.exit();
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();