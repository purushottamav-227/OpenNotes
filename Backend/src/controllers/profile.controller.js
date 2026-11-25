import { updateProfileSchema } from "../validators/auth.validator.js";
import { updateOwnProfile } from "../services/profile.service.js";

export async function updateProfileController(req, res, next) {
  try {
    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const user = await updateOwnProfile(req.auth.userId, validation.data);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: user
    });
  } catch (error) {
    return next(error);
  }
}
