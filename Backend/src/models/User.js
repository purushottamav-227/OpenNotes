import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters."],
      maxlength: [100, "Name cannot exceed 100 characters."]
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      lowercase: true,
      trim: true,
      maxlength: [254, "Email cannot exceed 254 characters."],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address."
      ]
    },

    // Never returned by default. Always select explicitly with "+passwordHash".
    passwordHash: {
      type: String,
      default: undefined,
      select: false
    },

    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      required: true,
      default: "student"
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null,
      index: true
    },

    collegeAffiliationStatus: {
      type: String,
      enum: [
        "not_provided",
        "pending",
        "verified",
        "rejected"
      ],
      default: "not_provided",
      required: true
    },

    emailVerified: {
      type: Boolean,
      default: false,
      required: true
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false
    },

    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false
    },

    teacherApprovalStatus: {
      type: String,
      enum: [
        "not_applicable",
        "pending",
        "approved",
        "rejected"
      ],
      default: "not_applicable",
      required: true
    },

    // Reason stored when an admin rejects a teacher application.
    teacherApprovalRejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters."],
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true
    },

    // Set when an admin (or a teacher, for students) blocks the account.
    blockedAt: {
      type: Date,
      default: null
    },

    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    blockReason: {
      type: String,
      trim: true,
      maxlength: [500, "Block reason cannot exceed 500 characters."],
      default: ""
    },

    /*
     * Increment this counter to invalidate all previously issued JWTs.
     * Any JWT that carries a sessionVersion lower than the current value
     * is treated as revoked. This enables:
     *   - Logout from all devices
     *   - Forced sign-out after a password change or security event
     */
    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
      select: false
    },

    profile: {
      phone: {
        type: String,
        trim: true,
        default: ""
      },

      academicYear: {
        type: String,
        enum: [
          "",
          "1st Year",
          "2nd Year",
          "3rd Year",
          "4th Year",
          "5th Year"
        ],
        default: ""
      },

      about: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "About section cannot exceed 1000 characters."
        ],
        default: ""
      }
    },

    /*
     * Retained for backward-compatibility with existing code.
     * This is NOT the authoritative list of linked login providers.
     * Use OAuthIdentity documents for multi-provider identity management.
     */
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
      required: true
    },

    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Each normalized email must belong to only one account.
userSchema.index(
  { email: 1 },
  { unique: true, name: "user_email_unique" }
);

userSchema.index(
  { role: 1, isActive: 1 },
  { name: "user_role_active" }
);

userSchema.index(
  { role: 1, teacherApprovalStatus: 1 },
  { name: "teacher_approval_queue" }
);

const User = mongoose.model("User", userSchema);

export default User;
