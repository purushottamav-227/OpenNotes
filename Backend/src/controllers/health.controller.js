import { isDatabaseConnected } from "../config/database.js";

export function getHealth(req, res) {
  return res.status(200).json({
    success: true,
    message: "OpenNotes API is running.",
    timestamp: new Date().toISOString()
  });
}
//Readiness: confirms that the application can use its required database.
export function getReadiness(req, res) {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Service is not ready.",
      dependencies: {
        database: "disconnected"
      }
    });
  }

  return res.status(200).json({
    success: true,
    message: "OpenNotes API is ready.",
    dependencies: {
      database: "connected"
    }
  });
}