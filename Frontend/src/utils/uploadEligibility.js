// Mirrors the backend upload rules so the UI can explain why uploading is
// unavailable. The backend still enforces every rule on each request.
export function getUploadBlocker(user) {
  if (!user) return "Sign in to upload resources.";

  if (user.role === "admin") {
    return "Administrator accounts review resources and cannot upload.";
  }

  if (!user.emailVerified) {
    return "Verify your email address before uploading.";
  }

  if (user.role === "teacher" && user.teacherApprovalStatus !== "approved") {
    return "Your teacher account must be approved by an administrator before you can upload.";
  }

  if (!user.collegeId) {
    return "Your account is not linked to a college, so uploads are unavailable.";
  }

  if (user.collegeAffiliationStatus !== "verified") {
    return "Your college affiliation is still pending verification, so uploads are unavailable.";
  }

  return "";
}