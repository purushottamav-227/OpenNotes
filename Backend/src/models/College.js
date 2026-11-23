import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "College name is required."],
      trim: true,
      minlength: [2, "College name must contain at least 2 characters."],
      maxlength: [200, "College name cannot exceed 200 characters."]
    },

    nameKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    domains: {
      type: [
        {
          type: String,
          lowercase: true,
          trim: true
        }
      ],
      default: [],
      validate: {
        validator(domains) {
          return (
            domains.length ===
            new Set(domains.map((domain) => domain.toLowerCase())).size
          );
        },
        message: "Duplicate email domains are not allowed."
      }
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      required: true
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true
    },

    address: {
      type: String,
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters."],
      default: ""
    },

    website: {
      type: String,
      trim: true,
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Efficient college name searches.
collegeSchema.index({ name: 1 });

// Efficient lookup of colleges by institutional email domain.
collegeSchema.index({ domains: 1 });

// Keep the normalized name synchronized with the display name.
collegeSchema.pre("validate", function () {
  if (this.name) {
    this.nameKey = this.name.trim().toLowerCase();
  }
});

const College = mongoose.model("College", collegeSchema);

export default College;