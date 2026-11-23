
import { Router } from "express";
import { listAcademicStructuresController } from "../controllers/academicStructure.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticateUser, listAcademicStructuresController);

export default router;
