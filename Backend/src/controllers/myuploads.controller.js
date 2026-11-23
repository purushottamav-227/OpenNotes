
import { getMyUploads } from "../services/myuploads.service.js";

export async function myUploadsController(req, res, next) {
  try {
    const { type = "all", status, page = 1, limit = 10 } = req.query;

    if (!["all", "notes", "pyqs"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be all, notes, or pyqs.",
      });
    }

    if (
      status &&
      !["pending", "approved", "rejected"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid upload status.",
      });
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values.",
      });
    }

    const result = await getMyUploads(req.auth.userId, {
      type,
      status,
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
