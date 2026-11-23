import {
  createResource,
  browseResources,
  getResource,
  getDownloadLink,
  getPendingResources,
  moderateResource
} from "../services/resource.service.js";

import {
  createNoteSchema,
  browseNoteSchema,
  resourceIdSchema
} from "../validators/note.validator.js";

import {
  createPYQSchema,
  browsePYQSchema
} from "../validators/pyq.validator.js";

function sendValidationError(res, validation, message) {
  return res.status(400).json({
    success: false,
    message,
    errors: validation.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }))
  });
}

export async function createNoteController(req, res, next) {
  try {
    const validation = createNoteSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(
        res,
        validation,
        "Invalid note details."
      );
    }

    const note = await createResource({
      type: "notes",
      userId: req.auth.userId,
      data: validation.data,
      files: req.files
    });

    return res.status(201).json({
      success: true,
      message: "Note uploaded successfully and is awaiting approval.",
      data: note
    });
  } catch (error) {
    next(error);
  }
}

export async function createPYQController(req, res, next) {
  try {
    const validation = createPYQSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(
        res,
        validation,
        "Invalid PYQ details."
      );
    }

    const pyq = await createResource({
      type: "pyqs",
      userId: req.auth.userId,
      data: validation.data,
      files: req.files
    });

    return res.status(201).json({
      success: true,
      message: "Question paper uploaded successfully and is awaiting approval.",
      data: pyq
    });
  } catch (error) {
    next(error);
  }
}

export async function browseNotesController(req, res, next) {
  try {
    const validation = browseNoteSchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(
        res,
        validation,
        "Invalid note filters."
      );
    }

    const result = await browseResources("notes", validation.data);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function browsePYQsController(req, res, next) {
  try {
    const validation = browsePYQSchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(
        res,
        validation,
        "Invalid PYQ filters."
      );
    }

    const result = await browseResources("pyqs", validation.data);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function getNoteController(req, res, next) {
  try {
    const validation = resourceIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID."
      });
    }

    const note = await getResource("notes", validation.data);

    return res.status(200).json({
      success: true,
      data: note
    });
  } catch (error) {
    next(error);
  }
}

export async function getPYQController(req, res, next) {
  try {
    const validation = resourceIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid PYQ ID."
      });
    }

    const pyq = await getResource("pyqs", validation.data);

    return res.status(200).json({
      success: true,
      data: pyq
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadResourceController(req, res, next) {
  try {
    const { type, id, partId } = req.params;

    if (!["notes", "pyqs"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type."
      });
    }

    const idValidation = resourceIdSchema.safeParse(id);
    const partValidation = resourceIdSchema.safeParse(partId);

    if (!idValidation.success || !partValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource or PDF part ID."
      });
    }

    const result = await getDownloadLink({
      type,
      resourceId: id,
      partId
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function pendingResourcesController(req, res, next) {
  try {
    const type = req.query.type;

    if (!["notes", "pyqs"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Resource type must be notes or pyqs."
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const result = await getPendingResources(type, page, limit);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function approveResourceController(req, res, next) {
  try {
    const idValidation = resourceIdSchema.safeParse(req.params.id);
    const { type } = req.params;

    if (!idValidation.success || !["notes", "pyqs"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type or ID."
      });
    }

    const resource = await moderateResource({
      type,
      resourceId: req.params.id,
      adminId: req.auth.userId,
      action: "approve"
    });

    return res.status(200).json({
      success: true,
      message: "Resource approved successfully.",
      data: resource
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectResourceController(req, res, next) {
  try {
    const idValidation = resourceIdSchema.safeParse(req.params.id);
    const { type } = req.params;
    const reason = req.body?.rejectionReason;

    if (!idValidation.success || !["notes", "pyqs"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type or ID."
      });
    }

    if (
      typeof reason !== "string" ||
      !reason.trim() ||
      reason.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason between 1 and 1000 characters is required."
      });
    }

    const resource = await moderateResource({
      type,
      resourceId: req.params.id,
      adminId: req.auth.userId,
      action: "reject",
      rejectionReason: reason
    });

    return res.status(200).json({
      success: true,
      message: "Resource rejected successfully.",
      data: resource
    });
  } catch (error) {
    next(error);
  }
}