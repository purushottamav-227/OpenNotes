import {
  listUsersQuerySchema,
  listTeachersQuerySchema,
  blockBodySchema,
  rejectTeacherBodySchema
} from "../validators/userManagement.validator.js";

import {
  listManagedUsers,
  blockUser,
  unblockUser,
  deleteUser,
  listTeacherApplications,
  approveTeacher,
  rejectTeacher
} from "../services/userManagement.service.js";

function invalid(res, message, issues) {
  return res.status(400).json({
    success: false,
    message,
    errors: issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }))
  });
}

export async function listUsersController(req, res, next) {
  try {
    const query = listUsersQuerySchema.safeParse(req.query);

    if (!query.success) {
      return invalid(res, "Invalid filters.", query.error.issues);
    }

    const result = await listManagedUsers(req.auth, query.data);

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function blockUserController(req, res, next) {
  try {
    const body = blockBodySchema.safeParse(req.body ?? {});

    if (!body.success) {
      return invalid(res, "Invalid request.", body.error.issues);
    }

    const data = await blockUser(req.auth, req.params.id, body.data.reason);

    return res.status(200).json({
      success: true,
      message: "Account blocked.",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function unblockUserController(req, res, next) {
  try {
    const data = await unblockUser(req.auth, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Account unblocked.",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteUserController(req, res, next) {
  try {
    const data = await deleteUser(req.auth, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Account deleted.",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function listTeachersController(req, res, next) {
  try {
    const query = listTeachersQuerySchema.safeParse(req.query);

    if (!query.success) {
      return invalid(res, "Invalid filters.", query.error.issues);
    }

    const result = await listTeacherApplications(query.data);

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function approveTeacherController(req, res, next) {
  try {
    const data = await approveTeacher(req.auth.userId, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Teacher approved.",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function rejectTeacherController(req, res, next) {
  try {
    const body = rejectTeacherBodySchema.safeParse(req.body ?? {});

    if (!body.success) {
      return invalid(res, "Invalid request.", body.error.issues);
    }

    const data = await rejectTeacher(
      req.auth.userId,
      req.params.id,
      body.data.reason
    );

    return res.status(200).json({
      success: true,
      message: "Teacher application rejected.",
      data
    });
  } catch (error) {
    return next(error);
  }
}
