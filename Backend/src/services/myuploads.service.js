
import Note from "../models/Note.js";
import PYQ from "../models/PYQ.js";

const MODELS = {
  notes: Note,
  pyqs: PYQ,
};

export async function getMyUploads(userId, filters = {}) {
  const { type = "all", status, page = 1, limit = 10 } = filters;

  const types = type === "all" ? ["notes", "pyqs"] : [type];

  if (!types.every((item) => MODELS[item])) {
    const error = new Error("Invalid resource type.");
    error.statusCode = 400;
    throw error;
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  const results = await Promise.all(
    types.map(async (resourceType) => {
      const Model = MODELS[resourceType];

      const query = {
        uploadedBy: userId,
        isDeleted: false,
      };

      if (status && ["pending", "approved", "rejected"].includes(status)) {
        query.approvalStatus = status;
      }

      const [resources, total] = await Promise.all([
        Model.find(query)
          .select("-parts.storageKey")
          .sort({ createdAt: -1 })
          .lean(),
        Model.countDocuments(query),
      ]);

      return resources.map((resource) => ({
        ...resource,
        resourceType,
      }));
    })
  );

  const combined = results
    .flat()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

  const total = combined.length;
  const start = (safePage - 1) * safeLimit;

  return {
    resources: combined.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}
