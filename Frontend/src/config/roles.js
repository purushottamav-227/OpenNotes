// Role names, labels and UI permissions.
//
// IMPORTANT: these permissions only decide what the interface shows.
// The backend re-checks the real role on every request and is the only
// source of authorization.

export const ROLES = {
  GUEST: "guest",
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
};

export const roleLabels = {
  [ROLES.GUEST]: "Guest",
  [ROLES.STUDENT]: "Student",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.ADMIN]: "Administrator",
};

// Where each role lands after signing in. No role has a dashboard.
export const roleHome = {
  [ROLES.STUDENT]: "/home",
  [ROLES.TEACHER]: "/home",
  [ROLES.ADMIN]: "/admin/resources",
};

export const guestUser = {
  id: null,
  name: "Guest User",
  email: null,
  role: ROLES.GUEST,
  profileImage: "",
};

const signedIn = {
  viewHome: true,
  viewNotes: true,
  viewPYQs: true,
  downloadNotes: true,
  viewMyUploads: true,
  editProfile: true,
};

export const rolePermissions = {
  [ROLES.GUEST]: {
    viewHome: true,
    viewNotes: true,
  },
  [ROLES.STUDENT]: {
    ...signedIn,
    uploadNotes: true,
    uploadPYQs: true,
  },
  [ROLES.TEACHER]: {
    ...signedIn,
    uploadNotes: true,
    uploadPYQs: true,
    manageStudents: true,
  },
  // Admins moderate; the backend does not allow admin uploads.
  [ROLES.ADMIN]: {
    ...signedIn,
    approveUploads: true,
    manageTeachers: true,
    manageUsers: true,
  },
};

export function getRolePermissions(role) {
  return rolePermissions[role] || rolePermissions[ROLES.GUEST];
}