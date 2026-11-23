//	Store streams, branches, academic years, semesters, and subjects.
import mongoose from "mongoose";

const academicStructureSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: [true, "College reference is required."],
      index: true
    },

    stream: {
      type: String,
      required: [true, "Stream is required."],
      trim: true,
      maxlength: [100, "Stream cannot exceed 100 characters."]
    },

    branch: {
      type: String,
      required: [true, "Branch is required."],
      trim: true,
      maxlength: [150, "Branch cannot exceed 150 characters."]
    },

    programName: {
      type: String,
      required: [true, "Program name is required."],
      trim: true,
      maxlength: [150, "Program name cannot exceed 150 characters."]
    },

    programCode: {
      type: String,
      required: [true, "Program code is required."],
      trim: true,
      uppercase: true,
      maxlength: [30, "Program code cannot exceed 30 characters."]
    },

    academicYears: {
      type: [
        {
          type: String,
          trim: true,
          enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"]
        }
      ],
      required: true,
      validate: {
        validator(years) {
          return years.length > 0 &&
            years.length === new Set(years).size;
        },
        message: "Academic years must be non-empty and unique."
      }
    },

    semesters: {
      type: [
        {
          type: Number,
          min: 1,
          max: 12
        }
      ],
      required: true,
      validate: {
        validator(semesters) {
          return semesters.length > 0 &&
            semesters.length === new Set(semesters).size;
        },
        message: "Semesters must be non-empty and unique."
      }
    },

    subjects: {
      type: [
        {
          subjectName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
          },

          subjectCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 30
          },

          semester: {
            type: Number,
            required: true,
            min: 1,
            max: 12
          }
        }
      ],
      default: []
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Prevent duplicate programs for the same college and branch.
academicStructureSchema.index(
  { collegeId: 1, programCode: 1 },
  { unique: true }
);

// Optimize academic browsing and filtering.
academicStructureSchema.index({
  collegeId: 1,
  stream: 1,
  branch: 1,
  isActive: 1
});

academicStructureSchema.index({
  collegeId: 1,
  "subjects.subjectCode": 1
});

const AcademicStructure = mongoose.model(
  "AcademicStructure",
  academicStructureSchema
);

export default AcademicStructure;