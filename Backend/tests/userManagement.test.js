import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

import { canManageUser, canListManagedUsers } from "../src/utils/userPolicy.js";
import { registerSchema, updateProfileSchema } from "../src/validators/auth.validator.js";

const ID = (n) => String(n).repeat(24).slice(0, 24);

const mocks = vi.hoisted(() => ({
  listManagedUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  deleteUser: vi.fn(),
  listTeacherApplications: vi.fn(),
  approveTeacher: vi.fn(),
  rejectTeacher: vi.fn(),
  updateOwnProfile: vi.fn()
}));

// Replace real JWT auth with a header-driven stand-in (the real middleware
// has its own tests); roles are still enforced by a faithful requireRole.
vi.mock("../src/middleware/auth.middleware.js", () => ({
  authenticateUser: (req, res, next) => {
    const role = req.headers["x-test-role"];
    if (!role) return res.status(401).json({ success: false });
    req.auth = { userId: "a".repeat(24), role };
    return next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.auth.role)
        ? next()
        : res.status(403).json({ success: false })
}));

vi.mock("../src/services/userManagement.service.js", () => mocks);
vi.mock("../src/services/profile.service.js", () => ({
  updateOwnProfile: mocks.updateOwnProfile
}));

import app from "../src/app.js";

/* ---------------------------------------------------------- */

describe("userPolicy", () => {
  const admin = { _id: ID(1), role: "admin" };
  const teacher = { _id: ID(2), role: "teacher", teacherApprovalStatus: "approved", collegeId: ID(7) };
  const student = { _id: ID(3), role: "student", collegeId: ID(7) };
  const otherCollegeStudent = { _id: ID(4), role: "student", collegeId: ID(8) };

  it("admin manages students and teachers, never admins or self", () => {
    expect(canManageUser(admin, student)).toBe(true);
    expect(canManageUser(admin, teacher)).toBe(true);
    expect(canManageUser(admin, { _id: ID(9), role: "admin" })).toBe(false);
    expect(canManageUser(admin, admin)).toBe(false);
  });

  it("approved teacher manages only students of their own college", () => {
    expect(canManageUser(teacher, student)).toBe(true);
    expect(canManageUser(teacher, otherCollegeStudent)).toBe(false);
    expect(canManageUser(teacher, admin)).toBe(false);
    expect(canManageUser(teacher, { _id: ID(5), role: "teacher", collegeId: ID(7) })).toBe(false);
  });

  it("unapproved or college-less teachers and students manage nobody", () => {
    expect(canManageUser({ ...teacher, teacherApprovalStatus: "pending" }, student)).toBe(false);
    expect(canManageUser({ ...teacher, collegeId: null }, student)).toBe(false);
    expect(canManageUser(student, otherCollegeStudent)).toBe(false);
    expect(canListManagedUsers(student)).toBe(false);
    expect(canListManagedUsers({ ...teacher, teacherApprovalStatus: "rejected" })).toBe(false);
  });
});

describe("registration validation", () => {
  const base = { name: "Asha Rao", email: "a@b.com", password: "SecurePassword123!" };

  it("accepts student (default) and teacher with a college", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, role: "student" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, role: "teacher", collegeId: ID(1) }).success).toBe(true);
  });

  it("requires a college for teachers and never allows admin", () => {
    expect(registerSchema.safeParse({ ...base, role: "teacher" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, role: "admin" }).success).toBe(false);
  });

  it("does not inject a role when none is sent", () => {
    expect(registerSchema.parse(base)).toEqual(base);
  });
});

describe("profile validation", () => {
  it("accepts name/college, rejects empty and unknown fields", () => {
    expect(updateProfileSchema.safeParse({ name: "New Name" }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ collegeId: null }).success).toBe(true);
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
    expect(updateProfileSchema.safeParse({ role: "admin" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ collegeAffiliationStatus: "verified" }).success).toBe(false);
  });
});

describe("account management routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires login and a manager role", async () => {
    expect((await request(app).get("/api/v1/users")).status).toBe(401);
    expect((await request(app).get("/api/v1/users").set("x-test-role", "student")).status).toBe(403);
  });

  it("lists with validated filters and rejects unknown ones", async () => {
    mocks.listManagedUsers.mockResolvedValue({ users: [], pagination: { page: 1 } });

    const ok = await request(app).get("/api/v1/users?role=teacher&status=blocked&q=asha").set("x-test-role", "admin");
    expect(ok.status).toBe(200);
    expect(mocks.listManagedUsers).toHaveBeenCalledWith(
      { userId: "a".repeat(24), role: "admin" },
      expect.objectContaining({ role: "teacher", status: "blocked", q: "asha", page: 1, limit: 20 })
    );

    const bad = await request(app).get("/api/v1/users?role=admin").set("x-test-role", "admin");
    expect(bad.status).toBe(400);
    const unknown = await request(app).get("/api/v1/users?foo=1").set("x-test-role", "admin");
    expect(unknown.status).toBe(400);
  });

  it("block / unblock / delete reach the service with the actor", async () => {
    mocks.blockUser.mockResolvedValue({ id: ID(3), isActive: false });
    mocks.unblockUser.mockResolvedValue({ id: ID(3), isActive: true });
    mocks.deleteUser.mockResolvedValue({ id: ID(3), deleted: true });

    const b = await request(app).patch(`/api/v1/users/${ID(3)}/block`).set("x-test-role", "teacher").send({ reason: "spam" });
    expect(b.status).toBe(200);
    expect(mocks.blockUser).toHaveBeenCalledWith({ userId: "a".repeat(24), role: "teacher" }, ID(3), "spam");

    expect((await request(app).patch(`/api/v1/users/${ID(3)}/unblock`).set("x-test-role", "admin")).status).toBe(200);
    expect((await request(app).delete(`/api/v1/users/${ID(3)}`).set("x-test-role", "admin")).status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenCalledTimes(1);
    expect((await request(app).delete(`/api/v1/users/${ID(3)}`).set("x-test-role", "student")).status).toBe(403);
  });

  it("service errors keep their status code (e.g. 403 from policy)", async () => {
    const err = new Error("You do not have permission to manage this account.");
    err.statusCode = 403;
    mocks.deleteUser.mockRejectedValue(err);
    const res = await request(app).delete(`/api/v1/users/${ID(3)}`).set("x-test-role", "teacher");
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permission/);
  });
});

describe("teacher approval routes (admin only)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks non-admins", async () => {
    for (const role of ["student", "teacher"]) {
      expect((await request(app).get("/api/v1/admin/teachers").set("x-test-role", role)).status).toBe(403);
      expect((await request(app).patch(`/api/v1/admin/teachers/${ID(2)}/approve`).set("x-test-role", role)).status).toBe(403);
    }
  });

  it("lists pending by default, approves, and requires a reason to reject", async () => {
    mocks.listTeacherApplications.mockResolvedValue({ users: [], pagination: {} });
    mocks.approveTeacher.mockResolvedValue({ id: ID(2) });
    mocks.rejectTeacher.mockResolvedValue({ id: ID(2) });

    expect((await request(app).get("/api/v1/admin/teachers").set("x-test-role", "admin")).status).toBe(200);
    expect(mocks.listTeacherApplications).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));

    expect((await request(app).patch(`/api/v1/admin/teachers/${ID(2)}/approve`).set("x-test-role", "admin")).status).toBe(200);
    expect(mocks.approveTeacher).toHaveBeenCalledWith("a".repeat(24), ID(2));

    expect((await request(app).patch(`/api/v1/admin/teachers/${ID(2)}/reject`).set("x-test-role", "admin").send({})).status).toBe(400);
    expect((await request(app).patch(`/api/v1/admin/teachers/${ID(2)}/reject`).set("x-test-role", "admin").send({ reason: "Not a teacher" })).status).toBe(200);
  });
});

describe("PATCH /auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires login, validates, and updates", async () => {
    mocks.updateOwnProfile.mockResolvedValue({ name: "New Name" });

    expect((await request(app).patch("/api/v1/auth/me").send({ name: "New Name" })).status).toBe(401);
    expect((await request(app).patch("/api/v1/auth/me").set("x-test-role", "student").send({ role: "admin" })).status).toBe(400);

    const res = await request(app).patch("/api/v1/auth/me").set("x-test-role", "student").send({ name: "New Name" });
    expect(res.status).toBe(200);
    expect(mocks.updateOwnProfile).toHaveBeenCalledWith("a".repeat(24), { name: "New Name" });
  });
});
