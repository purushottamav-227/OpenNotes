import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  BadgeCheck,
  GraduationCap,
  Mail,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import useAuth from "../../context/useAuth";
import CollegePicker from "../../Components/auth/CollegePicker";
import { collegeApi } from "../../services/api";
import { roleLabels, ROLES } from "../../config/roles";
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

/**
 * Everyone can change their name. Students can also change their college;
 * the affiliation status is then decided by the server (it becomes
 * "Verified" only when the account's email matches the college's domain).
 * Teachers and admins cannot change their college.
 */
function Profile() {
  const { user, role, isGuest, updateProfile } = useAuth();

  const isStudent = role === ROLES.STUDENT;
  const isTeacher = role === ROLES.TEACHER;

  const [name, setName] = useState(user?.name || "");
  // undefined = college not edited yet; null = removed; object = chosen.
  const [collegeChoice, setCollegeChoice] = useState(undefined);
  const [currentCollege, setCurrentCollege] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const collegeId = user?.collegeId;

  useEffect(() => {
    if (!collegeId) return undefined;

    let active = true;

    collegeApi
      .get(collegeId)
      .then((result) => {
        if (active && result?.data) {
          setCurrentCollege({ _id: result.data._id, name: result.data.name });
        }
      })
      .catch(() => {
        if (active) setCurrentCollege(null);
      });

    return () => {
      active = false;
    };
  }, [collegeId]);

  // Show the saved college unless the student has picked a different one.
  const shownCollege =
    collegeChoice !== undefined
      ? collegeChoice
      : collegeId
        ? currentCollege
        : null;

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

  if (isGuest || !user) {
    return <Navigate to="/home" replace />;
  }

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== user.name;

  const collegeChanged =
    isStudent &&
    collegeChoice !== undefined &&
    (collegeChoice?._id || null) !== (collegeId || null);

  const dirty = nameChanged || collegeChanged;

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    if (trimmedName.length < 2) {
      setMessage({ type: "error", text: "Your name must have at least 2 characters." });
      return;
    }

    if (trimmedName.length > 100) {
      setMessage({ type: "error", text: "Your name cannot exceed 100 characters." });
      return;
    }

    const changes = {};

    if (nameChanged) changes.name = trimmedName;
    if (collegeChanged) changes.collegeId = collegeChoice?._id || null;

    if (Object.keys(changes).length === 0) return;

    setSaving(true);

    try {
      const updated = await updateProfile(changes);

      setCollegeChoice(undefined);
      setName(updated?.name || trimmedName);
      setMessage({
        type: "success",
        text: collegeChanged
          ? "Profile updated. Your college affiliation is now " +
            (AFFILIATION_LABELS[updated?.collegeAffiliationStatus] ||
              "updated").toLowerCase() +
            "."
          : "Profile updated.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Unable to update your profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-page">
      <header className="profile-header">
        <div className="profile-header-content">
          <div className="profile-header-text">
            <span className="profile-section-label">YOUR ACCOUNT</span>
            <h1>
              Your <span>profile.</span>
            </h1>
            <p>View and update your OpenNotes account details.</p>
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
        </aside>

        <main className="profile-main">
          <section className="profile-resource-section">
            <div className="profile-content-header">
              <div>
                <span className="profile-section-label">PROFILE DETAILS</span>
                <h2>Personal details</h2>
                <p>Update your name{isStudent ? " and college" : ""}.</p>
              </div>
            </div>

            {message.text && (
              <div
                className={`profile-message ${
                  message.type === "success" ? "profile-success" : "profile-error"
                }`}
                role={message.type === "error" ? "alert" : "status"}
              >
                <span>{message.text}</span>
                <button
                  type="button"
                  aria-label="Dismiss message"
                  onClick={() => setMessage({ type: "", text: "" })}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <form className="profile-form" onSubmit={handleSubmit} noValidate>
              <div className="profile-form-section">
                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label htmlFor="profile-name">
                      Full name<span>*</span>
                    </label>
                    <div className="profile-input-wrapper">
                      <User size={16} aria-hidden="true" />
                      <input
                        id="profile-name"
                        type="text"
                        value={name}
                        maxLength={100}
                        autoComplete="name"
                        onChange={(event) => {
                          setName(event.target.value);
                          setMessage({ type: "", text: "" });
                        }}
                      />
                    </div>
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="profile-email">Email address</label>
                    <div className="profile-input-wrapper">
                      <Mail size={16} aria-hidden="true" />
                      <input id="profile-email" value={user.email} readOnly />
                    </div>
                  </div>

                  <div className="profile-form-group">
                    <label id="profile-college-label" htmlFor="profile-college">
                      College
                    </label>

                    {isStudent ? (
                      <CollegePicker
                        value={shownCollege}
                        onChange={(selected) => {
                          setCollegeChoice(selected);
                          setMessage({ type: "", text: "" });
                        }}
                        disabled={saving}
                      />
                    ) : (
                      <div className="profile-input-wrapper">
                        <GraduationCap size={16} aria-hidden="true" />
                        <input
                          id="profile-college"
                          readOnly
                          value={
                            shownCollege?.name ||
                            (collegeId ? "Loading..." : "Not provided")
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="profile-affiliation">
                      College affiliation
                    </label>
                    <div className="profile-input-wrapper">
                      <BadgeCheck size={16} aria-hidden="true" />
                      <input
                        id="profile-affiliation"
                        readOnly
                        value={
                          collegeChanged
                            ? "Will be checked when you save"
                            : AFFILIATION_LABELS[user.collegeAffiliationStatus] ||
                              "Not provided"
                        }
                      />
                    </div>
                  </div>

                  {isTeacher && (
                    <div className="profile-form-group">
                      <label htmlFor="profile-teacher-status">
                        Teacher approval
                      </label>
                      <div className="profile-input-wrapper">
                        <ShieldCheck size={16} aria-hidden="true" />
                        <input
                          id="profile-teacher-status"
                          readOnly
                          value={
                            TEACHER_LABELS[user.teacherApprovalStatus] ||
                            "Pending approval"
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {isStudent && (
                  <p
                    style={{
                      margin: "16px 0 0",
                      color: "var(--color-text-muted)",
                      fontSize: 12.5,
                      lineHeight: 1.6,
                    }}
                  >
                    Your affiliation is confirmed automatically when your
                    email address belongs to the college you select. If it
                    does not match, it stays pending.
                  </p>
                )}

                {!isStudent && (
                  <p
                    style={{
                      margin: "16px 0 0",
                      color: "var(--color-text-muted)",
                      fontSize: 12.5,
                      lineHeight: 1.6,
                    }}
                  >
                    {isTeacher
                      ? "Your college is set when your teacher account is approved and cannot be changed here."
                      : "Administrator accounts are not linked to a college."}
                  </p>
                )}
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-cancel-button"
                  disabled={!dirty || saving}
                  onClick={() => {
                    setName(user.name);
                    setCollegeChoice(undefined);
                    setMessage({ type: "", text: "" });
                  }}
                >
                  Discard changes
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={!dirty || saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </section>
  );
}

export default Profile;
