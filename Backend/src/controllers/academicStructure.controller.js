
import mongoose from "mongoose";
import AcademicStructure from "../models/AcademicStructure.js";

export async function listAcademicStructuresController(req, res, next) {
  try {
    const { collegeId, stream, branch } = req.query;

    if (!collegeId || !mongoose.isValidObjectId(collegeId)) {
      return res.status(400).json({
        success: false,
        message: "A valid collegeId is required.",
      });
    }

    const query = {
      collegeId,
      isActive: true,
    };

    if (stream) query.stream = stream;
    if (branch) query.branch = branch;

    const structures = await AcademicStructure.find(query)
      .select(
        "collegeId stream branch programName programCode academicYears semesters subjects"
      )
      .sort({ stream: 1, branch: 1, programName: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: structures.length,
      data: structures,
    });
  } catch (error) {
    next(error);
  }
}
