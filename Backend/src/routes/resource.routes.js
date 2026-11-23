
import { Router } from "express";

import {
  createNoteController,
  createPYQController,
  browseNotesController,
  browsePYQsController,
  getNoteController,
  getPYQController,
  downloadResourceController,
  pendingResourcesController,
  approveResourceController,
  rejectResourceController,
} from "../controllers/resource.controller.js";

import { myUploadsController } from "../controllers/myuploads.controller.js";

import {
  authenticateUser,
  requireRole,
} from "../middleware/auth.middleware.js";

import {
  uploadPdfFiles,
  validatePdfFiles,
  handleUploadError,
} from "../middleware/upload.middleware.js";

const router = Router();

// Public browsing: only approved resources.
router.get("/notes", browseNotesController);
router.get("/pyqs", browsePYQsController);

router.get("/notes/:id", getNoteController);
router.get("/pyqs/:id", getPYQController);

// Authenticated user's uploads.
router.get("/resources/mine", authenticateUser, myUploadsController);

// Authenticated uploads.
router.post(
  "/notes",
  authenticateUser,
  uploadPdfFiles,
  handleUploadError,
  validatePdfFiles,
  createNoteController
);

router.post(
  "/pyqs",
  authenticateUser,
  uploadPdfFiles,
  handleUploadError,
  validatePdfFiles,
  createPYQController
);

// Authenticated downloads.
router.get(
  "/:type/:id/download/:partId",
  authenticateUser,
  downloadResourceController
);

// Admin moderation.
router.get(
  "/admin/resources/pending",
  authenticateUser,
  requireRole("admin"),
  pendingResourcesController
);

router.patch(
  "/admin/resources/:type/:id/approve",
  authenticateUser,
  requireRole("admin"),
  approveResourceController
);

router.patch(
  "/admin/resources/:type/:id/reject",
  authenticateUser,
  requireRole("admin"),
  rejectResourceController
);

export default router;
