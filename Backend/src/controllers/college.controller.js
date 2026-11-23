
import {
  searchColleges,
  getCollegeById
} from "../services/college.service.js";

import {
  collegeSearchSchema,
  collegeIdSchema
} from "../validators/college.validator.js";

export async function searchCollegesController(req, res, next) {
  try {
    const validation = collegeSearchSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid college search parameters.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const { q, limit } = validation.data;
    const colleges = await searchColleges(q, limit);

    return res.status(200).json({
      success: true,
      count: colleges.length,
      data: colleges
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCollegeController(req, res, next) {
  try {
    const validation = collegeIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid college ID."
      });
    }

    const college = await getCollegeById(validation.data);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: college
    });
  } catch (error) {
    return next(error);
  }
}
