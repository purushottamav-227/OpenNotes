/**
 * Who may manage (block, unblock, delete) which account.
 *
 *  - Nobody can manage their own account here.
 *  - Admins can manage students and teachers (never other admins).
 *  - Approved teachers can manage students of their OWN college only.
 *  - Students can manage nobody.
 *
 * `actor` needs: _id, role, teacherApprovalStatus, collegeId
 * `target` needs: _id, role, collegeId
 */
export function canManageUser(actor, target) {
  if (!actor || !target) return false;

  if (String(actor._id) === String(target._id)) return false;

  if (actor.role === "admin") {
    return target.role === "student" || target.role === "teacher";
  }

  if (actor.role === "teacher") {
    return (
      actor.teacherApprovalStatus === "approved" &&
      Boolean(actor.collegeId) &&
      target.role === "student" &&
      String(target.collegeId) === String(actor.collegeId)
    );
  }

  return false;
}

/** Can this user open the user-management list at all? */
export function canListManagedUsers(actor) {
  if (!actor) return false;

  if (actor.role === "admin") return true;

  return (
    actor.role === "teacher" &&
    actor.teacherApprovalStatus === "approved" &&
    Boolean(actor.collegeId)
  );
}
