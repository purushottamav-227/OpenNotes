import { Router } from "express";

import {
  authenticateUser,
  requireRole
} from "../middleware/auth.middleware.js";

import {
  listUsersController,
  blockUserController,
  unblockUserController,
  deleteUserController,
  listTeachersController,
  approveTeacherController,
  rejectTeacherController
} from "../controllers/userManagement.controller.js";

const router = Router();

// Authentication is applied per route (not router-wide) because this router
// shares the /api/v1 prefix with public routes.

/* Account management: admins (students + teachers) and approved teachers
   (students of their own college). Fine-grained rules live in userPolicy. */
router.get(
  "/users",
  authenticateUser,
  requireRole("admin", "teacher"),
  listUsersController
);

router.patch(
  "/users/:id/block",
  authenticateUser,
  requireRole("admin", "teacher"),
  blockUserController
);

router.patch(
  "/users/:id/unblock",
  authenticateUser,
  requireRole("admin", "teacher"),
  unblockUserController
);

router.delete(
  "/users/:id",
  authenticateUser,
  requireRole("admin", "teacher"),
  deleteUserController
);

/* Teacher approvals: admins only. */
router.get(
  "/admin/teachers",
  authenticateUser,
  requireRole("admin"),
  listTeachersController
);

router.patch(
  "/admin/teachers/:id/approve",
  authenticateUser,
  requireRole("admin"),
  approveTeacherController
);

router.patch(
  "/admin/teachers/:id/reject",
  authenticateUser,
  requireRole("admin"),
  rejectTeacherController
);

export default router;
