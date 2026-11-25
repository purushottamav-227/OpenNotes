import { describe, it, expect, vi, beforeEach } from "vitest";

const ID = (n) => String(n).repeat(24).slice(0, 24);

const m = vi.hoisted(() => {
  const chain = (result) => {
    const q = {
      select: () => q, populate: () => q, sort: () => q, skip: () => q, limit: () => q,
      lean: () => Promise.resolve(result),
      then: (res, rej) => Promise.resolve(result).then(res, rej)
    };
    return q;
  };
  return {
    chain,
    User: { findOne: vi.fn(), findById: vi.fn(), updateOne: vi.fn(), deleteOne: vi.fn(), find: vi.fn(), countDocuments: vi.fn() },
    Note: { updateMany: vi.fn() },
    PYQ: { updateMany: vi.fn() },
    OAuthIdentity: { deleteMany: vi.fn() },
    College: { findOne: vi.fn() }
  };
});

vi.mock("../src/models/User.js", () => ({ default: m.User }));
vi.mock("../src/models/Note.js", () => ({ default: m.Note }));
vi.mock("../src/models/PYQ.js", () => ({ default: m.PYQ }));
vi.mock("../src/models/OAuthIdentity.js", () => ({ default: m.OAuthIdentity }));
vi.mock("../src/models/College.js", () => ({ default: m.College }));

import { blockUser, unblockUser, deleteUser, listManagedUsers, approveTeacher, rejectTeacher } from "../src/services/userManagement.service.js";
import { updateOwnProfile } from "../src/services/profile.service.js";

const admin = { _id: ID(1), role: "admin" };
const approvedTeacher = { _id: ID(2), role: "teacher", teacherApprovalStatus: "approved", collegeId: ID(7) };
const student = { _id: ID(3), role: "student", collegeId: ID(7), name: "S", email: "s@x.com", isActive: true };

beforeEach(() => {
  vi.clearAllMocks();
  console.info = vi.fn();
});

const asActor = (actor, target) => {
  m.User.findOne.mockReturnValue(m.chain(actor));
  m.User.findById.mockReturnValue(m.chain(target));
};

describe("blockUser", () => {
  it("blocks, records who, and signs the user out everywhere", async () => {
    asActor(approvedTeacher, student);
    await blockUser({ userId: ID(2) }, ID(3), "spam");
    const [filter, update] = m.User.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: ID(3) });
    expect(update.$set).toMatchObject({ isActive: false, blockedBy: ID(2), blockReason: "spam" });
    expect(update.$inc).toEqual({ sessionVersion: 1 });
  });

  it("a teacher cannot block a student from another college, a teacher, or an admin", async () => {
    for (const target of [
      { ...student, collegeId: ID(8) },
      { ...student, role: "teacher" },
      { ...student, role: "admin" }
    ]) {
      asActor(approvedTeacher, target);
      await expect(blockUser({ userId: ID(2) }, ID(3), "")).rejects.toMatchObject({ statusCode: 403 });
    }
    expect(m.User.updateOne).not.toHaveBeenCalled();
  });

  it("nobody can block themselves; admin cannot block another admin", async () => {
    asActor(admin, { ...student, _id: ID(1), role: "student" });
    await expect(blockUser({ userId: ID(1) }, ID(1), "")).rejects.toMatchObject({ statusCode: 403 });
    asActor(admin, { ...student, role: "admin" });
    await expect(blockUser({ userId: ID(1) }, ID(3), "")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("invalid id and missing account give 404", async () => {
    await expect(blockUser({ userId: ID(1) }, "nope", "")).rejects.toMatchObject({ statusCode: 404 });
    asActor(admin, null);
    await expect(blockUser({ userId: ID(1) }, ID(3), "")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("unblockUser / deleteUser", () => {
  it("unblock restores access", async () => {
    asActor(admin, { ...student, isActive: false });
    await unblockUser({ userId: ID(1) }, ID(3));
    expect(m.User.updateOne.mock.calls[0][1].$set).toMatchObject({ isActive: true, blockedAt: null });
  });

  it("delete hides their uploads, removes OAuth links, then the account", async () => {
    asActor(admin, student);
    await deleteUser({ userId: ID(1) }, ID(3));
    expect(m.Note.updateMany).toHaveBeenCalledWith({ uploadedBy: ID(3) }, { $set: { isDeleted: true } });
    expect(m.PYQ.updateMany).toHaveBeenCalledWith({ uploadedBy: ID(3) }, { $set: { isDeleted: true } });
    expect(m.OAuthIdentity.deleteMany).toHaveBeenCalled();
    expect(m.User.deleteOne).toHaveBeenCalledWith({ _id: ID(3) });
  });

  it("a teacher cannot delete a student of another college", async () => {
    asActor(approvedTeacher, { ...student, collegeId: ID(8) });
    await expect(deleteUser({ userId: ID(2) }, ID(3))).rejects.toMatchObject({ statusCode: 403 });
    expect(m.User.deleteOne).not.toHaveBeenCalled();
  });
});

describe("listManagedUsers scoping", () => {
  const run = async (actor, query) => {
    m.User.findOne.mockReturnValue(m.chain(actor));
    m.User.find.mockReturnValue(m.chain([]));
    m.User.countDocuments.mockResolvedValue(0);
    await listManagedUsers({ userId: actor._id }, { page: 1, limit: 20, ...query });
    return m.User.find.mock.calls[0][0];
  };

  it("teacher: forced to students of their own college, excluding self", async () => {
    const filter = await run(approvedTeacher, { role: "teacher" }); // role param is ignored
    expect(filter.role).toBe("student");
    expect(filter.collegeId).toBe(ID(7));
    expect(filter._id).toEqual({ $ne: ID(2) });
  });

  it("admin: students and teachers, with status and search", async () => {
    const filter = await run(admin, { status: "blocked", q: "a.b" });
    expect(filter.role).toEqual({ $in: ["student", "teacher"] });
    expect(filter.isActive).toBe(false);
    expect(filter.$or[0].name.source).toBe("a\\.b"); // regex-escaped
  });

  it("unapproved teacher and student are refused", async () => {
    for (const actor of [{ ...approvedTeacher, teacherApprovalStatus: "pending" }, { _id: ID(4), role: "student" }]) {
      m.User.findOne.mockReturnValue(m.chain(actor));
      await expect(listManagedUsers({ userId: actor._id }, { page: 1, limit: 20 })).rejects.toMatchObject({ statusCode: 403 });
    }
  });
});

describe("teacher approval", () => {
  const teacher = () => ({ _id: ID(2), role: "teacher", collegeId: ID(7), teacherApprovalStatus: "pending", collegeAffiliationStatus: "pending", save: vi.fn() });

  it("approve also confirms the college affiliation", async () => {
    const t = teacher();
    m.User.findOne.mockResolvedValue(t);
    await approveTeacher(ID(1), ID(2));
    expect(t.teacherApprovalStatus).toBe("approved");
    expect(t.collegeAffiliationStatus).toBe("verified");
    expect(t.save).toHaveBeenCalled();
  });

  it("reject stores the reason and does not verify affiliation", async () => {
    const t = teacher();
    m.User.findOne.mockResolvedValue(t);
    await rejectTeacher(ID(1), ID(2), "Not a faculty member");
    expect(t.teacherApprovalStatus).toBe("rejected");
    expect(t.teacherApprovalRejectionReason).toBe("Not a faculty member");
    expect(t.collegeAffiliationStatus).toBe("pending");
  });

  it("unknown teacher gives 404", async () => {
    m.User.findOne.mockResolvedValue(null);
    await expect(approveTeacher(ID(1), ID(2))).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("updateOwnProfile", () => {
  const user = (over = {}) => ({ _id: ID(3), role: "student", email: "s@bmsce.ac.in", emailVerified: true, collegeId: null, collegeAffiliationStatus: "not_provided", save: vi.fn(), ...over });
  const withUser = (u) => { m.User.findOne.mockResolvedValue(u); m.User.findById.mockReturnValue(m.chain({ ok: true })); };

  it("anyone can change their name", async () => {
    for (const role of ["student", "teacher", "admin"]) {
      const u = user({ role }); withUser(u);
      await updateOwnProfile(ID(3), { name: "New Name" });
      expect(u.name).toBe("New Name");
    }
  });

  it("student college with matching email domain becomes verified", async () => {
    const u = user(); withUser(u);
    m.College.findOne.mockReturnValue(m.chain({ _id: ID(7), domains: ["bmsce.ac.in"] }));
    await updateOwnProfile(ID(3), { collegeId: ID(7) });
    expect(u.collegeId).toBe(ID(7));
    expect(u.collegeAffiliationStatus).toBe("verified");
  });

  it("student college with a non-matching email domain stays pending (cannot self-verify)", async () => {
    const u = user({ email: "s@gmail.com" }); withUser(u);
    m.College.findOne.mockReturnValue(m.chain({ _id: ID(7), domains: ["bmsce.ac.in"] }));
    await updateOwnProfile(ID(3), { collegeId: ID(7) });
    expect(u.collegeAffiliationStatus).toBe("pending");
  });

  it("removing the college resets affiliation", async () => {
    const u = user({ collegeId: ID(7), collegeAffiliationStatus: "verified" }); withUser(u);
    await updateOwnProfile(ID(3), { collegeId: null });
    expect(u.collegeId).toBeNull();
    expect(u.collegeAffiliationStatus).toBe("not_provided");
  });

  it("teachers and admins cannot change their college", async () => {
    for (const role of ["teacher", "admin"]) {
      withUser(user({ role }));
      await expect(updateOwnProfile(ID(3), { collegeId: ID(7) })).rejects.toMatchObject({ statusCode: 403 });
    }
  });

  it("unknown or unverified college is rejected", async () => {
    withUser(user());
    m.College.findOne.mockReturnValue(m.chain(null));
    await expect(updateOwnProfile(ID(3), { collegeId: ID(7) })).rejects.toMatchObject({ statusCode: 400 });
  });
});
