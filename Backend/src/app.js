
import express from "express";
import cors from "cors";
import helmet from "helmet";

import env from "./config/env.js";

import healthRoutes from "./routes/health.routes.js";
import collegeRoutes from "./routes/college.routes.js";
import authRoutes from "./routes/auth.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import academicStructureRoutes from "./routes/academicStructure.routes.js";
import userManagementRoutes from "./routes/userManagement.routes.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

app.use("/api/v1", healthRoutes);
app.use("/api/v1/colleges", collegeRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/academic-structures", academicStructureRoutes);
app.use("/api/v1", resourceRoutes);
app.use("/api/v1", userManagementRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
