
import { Router } from "express";

import {
  searchCollegesController,
  getCollegeController
} from "../controllers/college.controller.js";

const router = Router();

router.get("/search", searchCollegesController);
router.get("/:id", getCollegeController);

export default router;
