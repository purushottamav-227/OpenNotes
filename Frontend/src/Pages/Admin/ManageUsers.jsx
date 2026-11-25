import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, Search, Trash2, Users } from "lucide-react";

import useAuth from "../../context/useAuth";
import { userApi } from "../../services/api";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Pagination from "../../Components/common/Pagination";
import "../../css/user-management.css";

const PAGE_SIZE = 15;

function initialsOf(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U"
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

/**
 * Account management.
 *  - Admin: students and teachers (block / unblock / delete).
 *  - Approved teacher: students of their own college.
 * The backend enforces these rules; this page only reflects them.
 */
export default function ManageUsers() {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // { id, action: "block" | "delete" } while a row is awaiting confirmation.
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let cancelled = false;

    userApi
      .list({
        page,
        limit: PAGE_SIZE,
        q: search || undefined,
        role: isAdmin ? roleFilter || undefined : undefined,
        status: statusFilter || undefined,
      })
      .then((result) => {
        if (cancelled) return;

        setUsers(Array.isArray(result?.users) ? result.users : []);
        setPagination({
          total: result?.pagination?.total ?? 0,
          totalPages: result?.pagination?.totalPages || 1,
        });
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setUsers([]);
          setError(err.message || "Unable to load accounts.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, roleFilter, statusFilter, isAdmin, refreshKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  function changeFilter(setter, value) {
    setLoading(true);
    setPage(1);
    setter(value);
  }

  function startAction(id, action) {
    setPending({ id, action });
    setReason("");
    setNotice("");
    setError("");
  }

  async function runAction(user, action) {
    setBusyId(user._id);
    setError("");
    setNotice("");

    try {
      if (action === "block") {
        await userApi.block(user._id, reason.trim());
        setNotice(`${user.name} has been blocked.`);
      } else if (action === "unblock") {
        await userApi.unblock(user._id);
        setNotice(`${user.name} has been unblocked.`);
      } else {
        await userApi.remove(user._id);
        setNotice(`${user.name}'s account has been deleted.`);
      }

      setPending(null);
      reload();
    } catch (err) {
      setError(err.message || "The action failed. Please try again.");
    } finally {
      setBusyId("");
    }
  }

  const title = isAdmin ? "Manage accounts" : "Students";

  return (
    <main className="um-page">
      <header className="um-header">
        <span className="um-eyebrow">
          <Users size={15} />
          {isAdmin ? "ADMINISTRATION" : "YOUR COLLEGE"}
        </span>

        <h1>{title}</h1>

        <p>
          {isAdmin
            ? "Block or delete student and teacher accounts. A blocked person is signed out immediately and cannot sign in until you unblock them."
            : "Block or delete student accounts from your college. A blocked student is signed out immediately and cannot sign in until you unblock them."}
        </p>
      </header>

      <div className="um-toolbar">
        <div className="um-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name or email"
            aria-label="Search accounts"
            value={searchInput}
            onChange={(event) => {
              setLoading(true);
              setPage(1);
              setSearchInput(event.target.value);
            }}
          />
        </div>

        {isAdmin && (
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(event) => changeFilter(setRoleFilter, event.target.value)}
          >
            <option value="">All roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
          </select>
        )}

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => changeFilter(setStatusFilter, event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
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
        <div className="um-empty">Loading accounts...</div>
      ) : users.length === 0 ? (
        <div className="um-empty">No accounts match your filters.</div>
      ) : (
        <div className="um-list">
          {users.map((user) => {
            const blocked = user.isActive === false;
            const confirming = pending?.id === user._id ? pending.action : "";
            const busy = busyId === user._id;

            return (
              <article
                key={user._id}
                className={`um-card ${blocked ? "um-card-blocked" : ""}`}
              >
                <div className="um-avatar" aria-hidden="true">
                  {initialsOf(user.name)}
                </div>

                <div className="um-info">
                  <h2 className="um-name">{user.name}</h2>

                  <p className="um-meta">
                    {user.email}
                    {user.college ? ` · ${user.college}` : ""}
                    {user.createdAt ? ` · Joined ${formatDate(user.createdAt)}` : ""}
                  </p>

                  <div className="um-badges">
                    <span className="um-badge">
                      {user.role === "teacher" ? "Teacher" : "Student"}
                    </span>

                    {blocked && (
                      <span className="um-badge um-badge-bad">Blocked</span>
                    )}

                    {!user.emailVerified && (
                      <span className="um-badge um-badge-warn">
                        Email not verified
                      </span>
                    )}

                    {user.role === "teacher" && (
                      <span
                        className={`um-badge ${
                          user.teacherApprovalStatus === "approved"
                            ? "um-badge-ok"
                            : user.teacherApprovalStatus === "rejected"
                              ? "um-badge-bad"
                              : "um-badge-warn"
                        }`}
                      >
                        Teacher: {user.teacherApprovalStatus}
                      </span>
                    )}
                  </div>

                  {blocked && user.blockReason && (
                    <p className="um-reason">Reason: {user.blockReason}</p>
                  )}
                </div>

                <div className="um-actions">
                  {blocked ? (
                    <button
                      type="button"
                      className="um-button"
                      disabled={busy}
                      onClick={() => runAction(user, "unblock")}
                    >
                      <CheckCircle2 size={16} />
                      Unblock
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="um-button"
                      disabled={busy}
                      onClick={() => startAction(user._id, "block")}
                    >
                      <Ban size={16} />
                      Block
                    </button>
                  )}

                  <button
                    type="button"
                    className="um-button um-button-danger"
                    disabled={busy}
                    onClick={() => startAction(user._id, "delete")}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>

                {confirming === "block" && (
                  <div className="um-confirm">
                    <p>
                      Block {user.name}? They will be signed out right away.
                    </p>

                    <input
                      type="text"
                      maxLength={500}
                      placeholder="Reason (optional)"
                      aria-label="Reason for blocking"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />

                    <button
                      type="button"
                      className="um-button um-button-danger-solid"
                      disabled={busy}
                      onClick={() => runAction(user, "block")}
                    >
                      {busy ? "Blocking..." : "Confirm block"}
                    </button>

                    <button
                      type="button"
                      className="um-button"
                      disabled={busy}
                      onClick={() => setPending(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {confirming === "delete" && (
                  <div className="um-confirm">
                    <p>
                      Permanently delete {user.name}&apos;s account? Their
                      uploads will be removed from the site. This cannot be
                      undone.
                    </p>

                    <button
                      type="button"
                      className="um-button um-button-danger-solid"
                      disabled={busy}
                      onClick={() => runAction(user, "delete")}
                    >
                      {busy ? "Deleting..." : "Yes, delete account"}
                    </button>

                    <button
                      type="button"
                      className="um-button"
                      disabled={busy}
                      onClick={() => setPending(null)}
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
