import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react";

import useAuth from "../../context/useAuth";
import useMyUploadStats from "../../hooks/useMyUploadStats";
import { collegeApi } from "../../services/api";
import { roleHome, roleLabels, ROLES } from "../../config/roles";
import "./Profile.css";

const AFFILIATION_LABELS = {
  verified: "Verified",
  pending: "Pending verification",
  not_provided: "Not provided",
  rejected: "Rejected",
};

const TEACHER_LABELS = {
  approved: "Approved",
  pending: "Pending approval",
  rejected: "Rejected",
  not_applicable: "Not applicable",
};

function formatDate(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Profile details come from the backend (GET /auth/me). The backend has no
// profile-update endpoint yet, so this page is read-only.
function Profile() {
  const { user, role, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const { stats } = useMyUploadStats();

  const [section, setSection] = useState("workspace");
  const [collegeName, setCollegeName] = useState("");

  const collegeId = user?.collegeId;

  useEffect(() => {
    if (!collegeId) return undefined;

    let active = true;

    collegeApi
      .get(collegeId)
      .then((result) => {
        if (active) setCollegeName(result?.data?.name || "");
      })
      .catch(() => {
        if (active) setCollegeName("");
      });

    return () => {
      active = false;
    };
  }, [collegeId]);

  const initials = useMemo(
    () =>
      (user?.name || "U")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(""),
    [user?.name]
  );

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;

    await logout();
    navigate("/home", { replace: true });
  };

  if (isGuest || !user) {
    return <Navigate to="/home" replace />;
  }

  const isAdmin = role === ROLES.ADMIN;
  const isTeacher = role === ROLES.TEACHER;

  const shortcuts = [
    {
      label: "Browse Notes",
      description: "Explore study materials",
      path: "/browse-notes",
      icon: BookOpen,
    },
    {
      label: "Browse PYQs",
      description: "Explore previous-year questions",
      path: "/browse-pyqs",
      icon: FileText,
    },
    ...(isAdmin
      ? [
          {
            label: "Resource Approvals",
            description: "Review submitted resources",
            path: "/admin/resources",
            icon: ShieldCheck,
          },
        ]
      : [
          {
            label: "Upload Resource",
            description: "Share your learning materials",
            path: "/upload",
            icon: Upload,
          },
          {
            label: "My Uploads",
            description: "View your uploaded resources",
            path: "/my-uploads",
            icon: Download,
          },
        ]),
  ];

  const details = [
    ["Full name", user.name, User],
    ["Email", user.email, Mail],
    [
      "Email status",
      user.emailVerified ? "Verified" : "Not verified",
      BadgeCheck,
    ],
    [
      "College",
      collegeName || (collegeId ? "Loading..." : "Not provided"),
      GraduationCap,
    ],
    [
      "College affiliation",
      AFFILIATION_LABELS[user.collegeAffiliationStatus] || "Not provided",
      BadgeCheck,
    ],
    ...(isTeacher
      ? [
          [
            "Teacher approval",
            TEACHER_LABELS[user.teacherApprovalStatus] || "Pending approval",
            ShieldCheck,
          ],
        ]
      : []),
    ["Member since", formatDate(user.createdAt), CalendarDays],
  ];

  return (
    <section className="profile-page">
      <header className="profile-header">
        <div className="profile-header-content">
          <div className="profile-header-text">
            <span className="profile-section-label">YOUR ACCOUNT</span>
            <h1>
              Your <span>profile.</span>
            </h1>
            <p>Your account details and role-specific OpenNotes workspace.</p>
          </div>
          <div className="profile-header-icon">
            <User size={32} />
          </div>
        </div>
      </header>

      <div className="profile-layout">
        <aside className="profile-sidebar-card">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-placeholder">{initials}</div>
          </div>

          <h2>{user.name}</h2>
          <p className="profile-sidebar-email">{user.email}</p>

          <div className="profile-role-badge">
            <User size={14} />
            {roleLabels[role] || role}
          </div>

          <div className="profile-sidebar-divider" />

          <nav className="profile-section-nav">
            <button
              type="button"
              className={section === "workspace" ? "active" : ""}
              onClick={() => setSection("workspace")}
            >
              <LayoutDashboard size={17} />
              <span className="profile-nav-label">My Workspace</span>
            </button>

            <button
              type="button"
              className={section === "overview" ? "active" : ""}
              onClick={() => setSection("overview")}
            >
              <User size={17} />
              <span className="profile-nav-label">Profile Overview</span>
            </button>
          </nav>

          <button
            type="button"
            className="profile-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </aside>

        <main className="profile-main">
          {section === "workspace" && (
            <section className="profile-resource-section">
              <div className="profile-content-header">
                <div>
                  <span className="profile-section-label">YOUR WORKSPACE</span>
                  <h2>
                    {isAdmin
                      ? "Admin Workspace"
                      : isTeacher
                        ? "Teacher Workspace"
                        : "Student Workspace"}
                  </h2>
                  <p>Your account overview and quick actions.</p>
                </div>
                {isAdmin ? (
                  <ShieldCheck size={28} />
                ) : (
                  <LayoutDashboard size={28} />
                )}
              </div>

              <div className="profile-resource-grid">
                {!isAdmin && (
                  <>
                    <article className="profile-resource-card">
                      <div className="profile-resource-icon">
                        <Upload size={21} />
                      </div>
                      <div className="profile-resource-content">
                        <span className="profile-resource-type">
                          MY UPLOADS
                        </span>
                        <h3>{stats.total}</h3>
                        <p>{stats.pending} pending review</p>
                      </div>
                    </article>

                    <article className="profile-resource-card">
                      <div className="profile-resource-icon">
                        <BadgeCheck size={21} />
                      </div>
                      <div className="profile-resource-content">
                        <span className="profile-resource-type">APPROVED</span>
                        <h3>{stats.approved}</h3>
                        <p>Published for everyone</p>
                      </div>
                    </article>
                  </>
                )}

                {isTeacher && (
                  <article className="profile-resource-card">
                    <div className="profile-resource-icon">
                      <GraduationCap size={21} />
                    </div>
                    <div className="profile-resource-content">
                      <span className="profile-resource-type">
                        TEACHER ACCOUNT
                      </span>
                      <h3>
                        {TEACHER_LABELS[user.teacherApprovalStatus] ||
                          "Pending approval"}
                      </h3>
                      <p>Account approval status</p>
                    </div>
                  </article>
                )}

                {isAdmin && (
                  <article className="profile-resource-card">
                    <div className="profile-resource-icon">
                      <ShieldCheck size={21} />
                    </div>
                    <div className="profile-resource-content">
                      <span className="profile-resource-type">ADMIN TOOLS</span>
                      <h3>Manage</h3>
                      <p>Open the administration workspace</p>
                      <Link to="/admin/dashboard">Open admin tools</Link>
                    </div>
                  </article>
                )}
              </div>

              <div className="profile-content-header" style={{ marginTop: 28 }}>
                <div>
                  <span className="profile-section-label">QUICK ACCESS</span>
                  <h2>Continue learning</h2>
                  <p>Open the sections available to your account.</p>
                </div>
              </div>

              <div className="profile-resource-grid">
                {shortcuts.map(({ label, description, path, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className="profile-resource-card"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="profile-resource-icon">
                      <Icon size={21} />
                    </div>
                    <div className="profile-resource-content">
                      <h3>{label}</h3>
                      <p>{description}</p>
                    </div>
                  </Link>
                ))}

                {role !== ROLES.STUDENT && (
                  <Link
                    to={roleHome[role] || "/home"}
                    className="profile-resource-card"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="profile-resource-icon">
                      <LayoutDashboard size={21} />
                    </div>
                    <div className="profile-resource-content">
                      <h3>Dashboard</h3>
                      <p>Go to your dashboard</p>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          )}

          {section === "overview" && (
            <section className="profile-resource-section">
              <div className="profile-content-header">
                <div>
                  <span className="profile-section-label">PROFILE OVERVIEW</span>
                  <h2>Personal details</h2>
                  <p>These details come from your OpenNotes account.</p>
                </div>
              </div>

              <section className="profile-details-card">
                {details.map(([label, value, Icon]) => (
                  <div className="profile-detail-row" key={label}>
                    <div className="profile-detail-icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <span>{label}</span>
                      <strong>{value || "Not available"}</strong>
                    </div>
                  </div>
                ))}
              </section>
            </section>
          )}
        </main>
      </div>
    </section>
  );
}

export default Profile;