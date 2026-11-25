import User from "../models/User.js";
import College from "../models/College.js";

const PROFILE_FIELDS =
  "name email role collegeId collegeAffiliationStatus emailVerified teacherApprovalStatus profile authProvider createdAt";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Update the signed-in user's own profile.
 *
 *  - Everyone may change their name.
 *  - Only STUDENTS may change their college. The affiliation status is never
 *    chosen by the user: it becomes "verified" only when the (verified) email
 *    domain belongs to the new college, otherwise it is "pending" review.
 */
export async function updateOwnProfile(userId, { name, collegeId }) {
  const user = await User.findOne({ _id: userId, isActive: true });

  if (!user) {
    throw createError("Your account is unavailable. Please log in again.", 401);
  }

  if (name !== undefined) {
    user.name = name;
  }

  if (collegeId !== undefined) {
    if (user.role !== "student") {
      throw createError("Only students can change their college.", 403);
    }

    if (collegeId === null) {
      user.collegeId = null;
      user.collegeAffiliationStatus = "not_provided";
    } else if (String(user.collegeId) !== collegeId) {
      const college = await College.findOne({
        _id: collegeId,
        isActive: true,
        verificationStatus: "verified"
      })
        .select("_id domains")
        .lean();

      if (!college) {
        throw createError(
          "The selected college does not exist or is not verified.",
          400
        );
      }

      const emailDomain = user.email.split("@").pop().toLowerCase();

      user.collegeId = college._id;
      user.collegeAffiliationStatus =
        user.emailVerified && college.domains?.includes(emailDomain)
          ? "verified"
          : "pending";
    }
  }

  await user.save();

  return User.findById(user._id).select(PROFILE_FIELDS);
}
