import mongoose from "mongoose";

import User from "../models/User.js";
import Note from "../models/Note.js";
import PYQ from "../models/PYQ.js";
import OAuthIdentity from "../models/OAuthIdentity.js";

import {
  canManageUser,
  canListManagedUsers
} from "../utils/userPolicy.js";

const LIST_FIELDS =
  "name email role collegeId collegeAffiliationStatus teacherApprovalStatus teacherApprovalRejectionReason emailVerified isActive createdAt blockedAt blockReason";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchFilter(q) {
  if (!q) return null;

  const pattern = new RegExp(escapeRegex(q), "i");

  return { $or: [{ name: pattern }, { email: pattern }] };
}

async function loadActor(userId) {
  const actor = await User.findOne({ _id: userId, isActive: true }).select(
    "role collegeId teacherApprovalStatus"
  );

  if (!actor) {
    throw createError("Your account is unavailable. Please log in again.", 401);
  }

  return actor;
}

async function paginate(filter, { page, limit }) {
  const [users, total] = await Promise.all([
    User.find(filter)
      .select(LIST_FIELDS)
      .populate("collegeId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      college: user.collegeId?.name || "",
      collegeId: user.collegeId?._id || null
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}


/* =========================================================
   LIST ACCOUNTS (admin: students + teachers, teacher: own students)
========================================================= */

export async function listManagedUsers(auth, query) {
  const actor = await loadActor(auth.userId);

  if (!canListManagedUsers(actor)) {
    throw createError("You do not have permission to manage accounts.", 403);
  }

  const filter = { _id: { $ne: actor._id } };

  if (actor.role === "admin") {
    filter.role = query.role ? query.role : { $in: ["student", "teacher"] };
  } else {
    // Teachers only ever see students of their own college.
    filter.role = "student";
    filter.collegeId = actor.collegeId;
  }

  if (query.status === "active") filter.isActive = true;
  if (query.status === "blocked") filter.isActive = false;

  const search = searchFilter(query.q);

  if (search) Object.assign(filter, search);

  return paginate(filter, query);
}


/* =========================================================
   BLOCK / UNBLOCK / DELETE
========================================================= */

async function loadManageableTarget(auth, targetId) {
  if (!mongoose.isValidObjectId(targetId)) {
    throw createError("Account not found.", 404);
  }

  const actor = await loadActor(auth.userId);

  const target = await User.findById(targetId).select(
    "name email role collegeId isActive"
  );

  if (!target) {
    throw createError("Account not found.", 404);
  }

  if (!canManageUser(actor, target)) {
    throw createError("You do not have permission to manage this account.", 403);
  }

  return { actor, target };
}

export async function blockUser(auth, targetId, reason = "") {
  const { actor, target } = await loadManageableTarget(auth, targetId);

  await User.updateOne(
    { _id: target._id },
    {
      $set: {
        isActive: false,
        blockedAt: new Date(),
        blockedBy: actor._id,
        blockReason: reason
      },
      // Signs the user out everywhere immediately.
      $inc: { sessionVersion: 1 }
    }
  );

  console.info(`[accounts] ${actor.role} ${actor._id} blocked ${target._id}`);

  return { id: target._id, isActive: false };
}

export async function unblockUser(auth, targetId) {
  const { actor, target } = await loadManageableTarget(auth, targetId);

  await User.updateOne(
    { _id: target._id },
    {
      $set: {
        isActive: true,
        blockedAt: null,
        blockedBy: null,
        blockReason: ""
      }
    }
  );

  console.info(`[accounts] ${actor.role} ${actor._id} unblocked ${target._id}`);

  return { id: target._id, isActive: true };
}

export async function deleteUser(auth, targetId) {
  const { actor, target } = await loadManageableTarget(auth, targetId);

  // Their uploads are hidden everywhere (soft-deleted) before the account
  // is removed. The PDF files themselves stay in private storage.
  await Promise.all([
    Note.updateMany({ uploadedBy: target._id }, { $set: { isDeleted: true } }),
    PYQ.updateMany({ uploadedBy: target._id }, { $set: { isDeleted: true } }),
    OAuthIdentity.deleteMany({ userId: target._id })
  ]);

  await User.deleteOne({ _id: target._id });

  console.info(`[accounts] ${actor.role} ${actor._id} deleted ${target._id}`);

  return { id: target._id, deleted: true };
}


/* =========================================================
   TEACHER APPROVALS (admin only; routes enforce the role)
========================================================= */

export async function listTeacherApplications(query) {
  const filter = {
    role: "teacher",
    teacherApprovalStatus: query.status
  };

  const search = searchFilter(query.q);

  if (search) Object.assign(filter, search);

  return paginate(filter, query);
}

async function loadTeacher(teacherId) {
  if (!mongoose.isValidObjectId(teacherId)) {
    throw createError("Teacher application not found.", 404);
  }

  const teacher = await User.findOne({ _id: teacherId, role: "teacher" });

  if (!teacher) {
    throw createError("Teacher application not found.", 404);
  }

  return teacher;
}

export async function approveTeacher(adminId, teacherId) {
  const teacher = await loadTeacher(teacherId);

  teacher.teacherApprovalStatus = "approved";
  teacher.teacherApprovalRejectionReason = "";

  // The admin has reviewed this teacher, so their chosen college is
  // accepted as their affiliation (needed before they can upload).
  if (teacher.collegeId) {
    teacher.collegeAffiliationStatus = "verified";
  }

  await teacher.save();

  console.info(`[teachers] admin ${adminId} approved ${teacher._id}`);

  return { id: teacher._id, teacherApprovalStatus: "approved" };
}

export async function rejectTeacher(adminId, teacherId, reason) {
  const teacher = await loadTeacher(teacherId);

  teacher.teacherApprovalStatus = "rejected";
  teacher.teacherApprovalRejectionReason = reason;

  await teacher.save();

  console.info(`[teachers] admin ${adminId} rejected ${teacher._id}`);

  return { id: teacher._id, teacherApprovalStatus: "rejected" };
}
