//Store question-paper metadata, CIE/SEE type, examination year, PDF parts, uploader, and approval status.
import mongoose from "mongoose";

const pdfPartSchema = new mongoose.Schema(
  {
    partNumber: {
      type: Number,
      required: true,
      min: 1
    },

    originalFileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },

    storageKey: {
      type: String,
      required: true,
      trim: true
    },

    contentType: {
      type: String,
      enum: ["application/pdf"],
      default: "application/pdf",
      required: true
    },

    sizeBytes: {
      type: Number,
      required: true,
      min: 1
    },

    checksum: {
      type: String,
      default: ""
    }
  },
  {
    _id: true,
    versionKey: false
  }
);

const pyqSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true
    },

    academicStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicStructure",
      required: true,
      index: true
    },

    stream: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    branch: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    academicYear: {
      type: String,
      required: true,
      enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"]
    },

    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },

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

    examType: {
      type: String,
      required: true,
      enum: ["CIE", "SEE"]
    },

    examinationYear: {
      type: Number,
      required: true,
      min: 1950,
      max: 2200
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },

    hasMultipleParts: {
      type: Boolean,
      default: false,
      required: true
    },

    parts: {
      type: [pdfPartSchema],
      required: true,
      validate: {
        validator(parts) {
          if (parts.length === 0) return false;

          const numbers = parts.map((part) => part.partNumber);

          return (
            new Set(numbers).size === numbers.length &&
            numbers.every(
              (number) => Number.isInteger(number) && number > 0
            )
          );
        },
        message:
          "At least one PDF part with unique positive part numbers is required."
      }
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
      index: true
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    reviewedAt: {
      type: Date,
      default: null
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    isDeleted: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Optimize Browse PYQs filters.
pyqSchema.index({
  collegeId: 1,
  branch: 1,
  academicYear: 1,
  semester: 1,
  subjectCode: 1,
  examType: 1,
  examinationYear: -1,
  approvalStatus: 1
});

// Optimize My Uploads queries.
pyqSchema.index({
  uploadedBy: 1,
  createdAt: -1
});

const PYQ = mongoose.model("PYQ", pyqSchema);

export default PYQ;