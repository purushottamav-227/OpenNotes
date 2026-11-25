import { useCallback, useEffect, useState } from "react";
import { Check, Search, ShieldCheck, X } from "lucide-react";

import { teacherApprovalApi } from "../../services/api";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Pagination from "../../Components/common/Pagination";
import "../../css/user-management.css";

const PAGE_SIZE = 15;

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function initialsOf(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "T"
  );
}

function formatDate(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TeacherApprovals() {
  const [status, setStatus] = useState("pending");
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [rejecting, setRejecting] = useState("");
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let cancelled = false;

    teacherApprovalApi
      .list({ status, page, limit: PAGE_SIZE, q: search || undefined })
      .then((result) => {
        if (cancelled) return;

        setTeachers(Array.isArray(result?.users) ? result.users : []);
        setPagination({
          total: result?.pagination?.total ?? 0,
          totalPages: result?.pagination?.totalPages || 1,
        });
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setTeachers([]);
          setError(err.message || "Unable to load teacher applications.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, page, search, refreshKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  async function approve(teacher) {
    setBusyId(teacher._id);
    setError("");
    setNotice("");

    try {
      await teacherApprovalApi.approve(teacher._id);
      setNotice(`${teacher.name} has been approved.`);
      reload();
    } catch (err) {
      setError(err.message || "Unable to approve this teacher.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(teacher) {
    if (reason.trim().length < 3) {
      setError("Enter a reason of at least 3 characters.");
      return;
    }

    setBusyId(teacher._id);
    setError("");
    setNotice("");

    try {
      await teacherApprovalApi.reject(teacher._id, reason.trim());
      setNotice(`${teacher.name}'s application was rejected.`);
      setRejecting("");
      setReason("");
      reload();
    } catch (err) {
      setError(err.message || "Unable to reject this teacher.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="um-page">
      <header className="um-header">
        <span className="um-eyebrow">
          <ShieldCheck size={15} />
          ADMINISTRATION
        </span>

        <h1>Teacher approvals</h1>

        <p>
          Teachers can browse straight after verifying their email, but can
          upload only once you approve them. Approving also confirms their
          chosen college.
        </p>
      </header>

      <div className="um-tabs" role="group" aria-label="Application status">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className="um-tab"
            aria-pressed={status === tab.value}
            onClick={() => {
              setLoading(true);
              setPage(1);
              setRejecting("");
              setStatus(tab.value);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="um-toolbar">
        <div className="um-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name or email"
            aria-label="Search teachers"
            value={searchInput}
            onChange={(event) => {
              setLoading(true);
              setPage(1);
              setSearchInput(event.target.value);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="um-banner um-banner-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="um-banner um-banner-ok" role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="um-empty">Loading applications...</div>
      ) : teachers.length === 0 ? (
        <div className="um-empty">
          No {status} teacher applications.
        </div>
      ) : (
        <div className="um-list">
          {teachers.map((teacher) => {
            const busy = busyId === teacher._id;

            return (
              <article key={teacher._id} className="um-card">
                <div className="um-avatar" aria-hidden="true">
                  {initialsOf(teacher.name)}
                </div>

                <div className="um-info">
                  <h2 className="um-name">{teacher.name}</h2>

                  <p className="um-meta">
                    {teacher.email}
                    {teacher.college ? ` · ${teacher.college}` : ""}
                    {teacher.createdAt
                      ? ` · Applied ${formatDate(teacher.createdAt)}`
                      : ""}
                  </p>

                  <div className="um-badges">
                    <span
                      className={`um-badge ${
                        teacher.emailVerified ? "um-badge-ok" : "um-badge-warn"
                      }`}
                    >
                      {teacher.emailVerified
                        ? "Email verified"
                        : "Email not verified"}
                    </span>

                    {!teacher.college && (
                      <span className="um-badge um-badge-warn">
                        No college selected
                      </span>
                    )}

                    {teacher.isActive === false && (
                      <span className="um-badge um-badge-bad">Blocked</span>
                    )}
                  </div>

                  {teacher.teacherApprovalStatus === "rejected" &&
                    teacher.teacherApprovalRejectionReason && (
                      <p className="um-reason">
                        Reason: {teacher.teacherApprovalRejectionReason}
                      </p>
                    )}
                </div>

                <div className="um-actions">
                  {teacher.teacherApprovalStatus !== "approved" && (
                    <button
                      type="button"
                      className="um-button um-button-primary"
                      disabled={busy}
                      onClick={() => approve(teacher)}
                    >
                      <Check size={16} />
                      {busy ? "Approving..." : "Approve"}
                    </button>
                  )}

                  {teacher.teacherApprovalStatus !== "rejected" && (
                    <button
                      type="button"
                      className="um-button um-button-danger"
                      disabled={busy}
                      onClick={() => {
                        setRejecting(teacher._id);
                        setReason("");
                        setError("");
                        setNotice("");
                      }}
                    >
                      <X size={16} />
                      {teacher.teacherApprovalStatus === "approved"
                        ? "Revoke"
                        : "Reject"}
                    </button>
                  )}
                </div>

                {rejecting === teacher._id && (
                  <div className="um-confirm">
                    <p>
                      Tell {teacher.name} why. They will not be able to upload
                      until approved.
                    </p>

                    <input
                      type="text"
                      maxLength={500}
                      placeholder="Reason (required)"
                      aria-label="Reason for rejecting"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />

                    <button
                      type="button"
                      className="um-button um-button-danger-solid"
                      disabled={busy}
                      onClick={() => reject(teacher)}
                    >
                      {busy ? "Saving..." : "Confirm"}
                    </button>

                    <button
                      type="button"
                      className="um-button"
                      disabled={busy}
                      onClick={() => setRejecting("")}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        onChange={(next) => {
          setLoading(true);
          setPage(next);
        }}
        disabled={loading}
      />
    </main>
  );
}
