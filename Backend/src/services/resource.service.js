import Note from "../models/Note.js";
import PYQ from "../models/PYQ.js";
import User from "../models/User.js";
import AcademicStructure from "../models/AcademicStructure.js";
import env from "../config/env.js";

import {
  uploadPdfParts,
  deleteStoredFiles,
  createDownloadUrl
} from "./storage.service.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getModel(type) {
  if (type === "notes") return Note;
  if (type === "pyqs") return PYQ;

  throw createError("Invalid resource type.", 400);
}

async function getUploader(userId) {
  const user = await User.findById(userId)
    .select("role collegeId collegeAffiliationStatus emailVerified isActive teacherApprovalStatus");

  if (!user || !user.isActive || !user.emailVerified) {
    throw createError("An active verified account is required.", 403);
  }

  if (!user.collegeId || user.collegeAffiliationStatus !== "verified") {
    throw createError("Your college affiliation must be verified before uploading.", 403);
  }

  if (
    user.role === "teacher" &&
    user.teacherApprovalStatus !== "approved"
  ) {
    throw createError("Your teacher account must be approved before uploading.", 403);
  }

  if (!["student", "teacher"].includes(user.role)) {
    throw createError("Your account cannot upload resources.", 403);
  }

  return user;
}

async function validateAcademicStructure(data, collegeId) {
  const structure = await AcademicStructure.findOne({
    _id: data.academicStructureId,
    collegeId,
    isActive: true
  }).lean();

  if (!structure) {
    throw createError("The selected academic structure is invalid.", 400);
  }

  if (
    structure.stream !== data.stream ||
    structure.branch !== data.branch ||
    !structure.academicYears.includes(data.academicYear) ||
    !structure.semesters.includes(Number(data.semester))
  ) {
    throw createError(
      "The academic details do not match the selected academic structure.",
      400
    );
  }

  const subject = structure.subjects.find(
    (item) =>
      item.subjectCode === data.subjectCode &&
      item.subjectName === data.subjectName &&
      item.semester === Number(data.semester)
  );

  if (!subject) {
    throw createError(
      "The selected subject does not belong to this academic structure and semester.",
      400
    );
  }
}

function validatePartCount(data, files) {
  if (data.hasMultipleParts && files.length < 2) {
    throw createError(
      "Multiple parts were selected, but fewer than two PDF files were uploaded."
    );
  }

  if (!data.hasMultipleParts && files.length !== 1) {
    throw createError(
      "Upload one PDF file or enable multiple parts."
    );
  }
}

export async function createResource({
  type,
  userId,
  data,
  files
}) {
  const Model = getModel(type);

  const uploader = await getUploader(userId);

  validatePartCount(data, files);

  await validateAcademicStructure(data, uploader.collegeId);

  const parts = await uploadPdfParts(files);

  try {
    const resourceData = {
      ...data,
      collegeId: uploader.collegeId,
      academicStructureId: data.academicStructureId,
      semester: Number(data.semester),
      subjectCode: data.subjectCode.toUpperCase(),
      hasMultipleParts: Boolean(data.hasMultipleParts),
      parts,
      uploadedBy: uploader._id,
      approvalStatus: "pending",
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: "",
      isDeleted: false
    };

    const resource = await Model.create(resourceData);

    return resource;
  } catch (error) {
    await deleteStoredFiles(parts);
    throw error;
  }
}

export async function browseResources(type, filters) {
  const Model = getModel(type);

  const {
    page,
    limit,
    q,
    ...academicFilters
  } = filters;

  const query = {
    ...academicFilters,
    approvalStatus: "approved",
    isDeleted: false
  };

  if (q) {
    query.$or = [
      { title: { $regex: escapeRegex(q), $options: "i" } },
      { subjectName: { $regex: escapeRegex(q), $options: "i" } },
      { subjectCode: { $regex: escapeRegex(q), $options: "i" } }
    ];
  }

  const [resources, total] = await Promise.all([
    Model.find(query)
      .select("-parts.storageKey")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Model.countDocuments(query)
  ]);

  return {
    resources,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getResource(type, resourceId) {
  const Model = getModel(type);

  const resource = await Model.findOne({
    _id: resourceId,
    approvalStatus: "approved",
    isDeleted: false
  })
    .select("-parts.storageKey")
    .populate("uploadedBy", "name")
    .lean();

  if (!resource) {
    throw createError("Resource not found.", 404);
  }

  return resource;
}

export async function getDownloadLink({
  type,
  resourceId,
  partId
}) {
  const Model = getModel(type);

  const resource = await Model.findOne({
    _id: resourceId,
    approvalStatus: "approved",
    isDeleted: false
  }).lean();

  if (!resource) {
    throw createError("Resource not found or not approved.", 404);
  }

  const part = resource.parts.find(
    (item) => item._id.toString() === partId
  );

  if (!part) {
    throw createError("PDF part not found.", 404);
  }

  const url = await createDownloadUrl(part.storageKey);

  return {
    url,
    expiresIn: env.SIGNED_URL_EXPIRY_SECONDS,
    fileName: part.originalFileName
  };
}

export async function getPendingResources(type, page = 1, limit = 20) {
  const Model = getModel(type);

  const query = {
    approvalStatus: "pending",
    isDeleted: false
  };

  const [resources, total] = await Promise.all([
    Model.find(query)
      .select("-parts.storageKey")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Model.countDocuments(query)
  ]);

  return {
    resources,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function moderateResource({
  type,
  resourceId,
  adminId,
  action,
  rejectionReason = ""
}) {
  const Model = getModel(type);

  const resource = await Model.findOne({
    _id: resourceId,
    isDeleted: false
  });

  if (!resource) {
    throw createError("Resource not found.", 404);
  }

  if (resource.approvalStatus !== "pending") {
    throw createError("Only pending resources can be reviewed.", 409);
  }

  if (resource.uploadedBy.toString() === adminId.toString()) {
    throw createError("You cannot review your own upload.", 403);
  }

  resource.approvalStatus = action === "approve" ? "approved" : "rejected";
  resource.reviewedBy = adminId;
  resource.reviewedAt = new Date();
  resource.rejectionReason =
    action === "reject" ? rejectionReason.trim() : "";

  await resource.save();

  return resource;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}