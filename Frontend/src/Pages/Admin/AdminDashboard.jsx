
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileQuestion,
  FileText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { resourceApi } from "../../services/api";
import "../../css/admin-dashboard.css";

export default function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [stats, setStats] = useState({
    pendingNotes: 0,
    pendingPYQs: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load real pending counts from the backend.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      resourceApi.pending("notes", { page: 1, limit: 1 }),
      resourceApi.pending("pyqs", { page: 1, limit: 1 }),
    ])
      .then(([notesResult, pyqsResult]) => {
        if (cancelled) return;

        setStats({
          pendingNotes:
            notesResult?.pagination?.total ??
            notesResult?.resources?.length ??
            0,

          pendingPYQs:
            pyqsResult?.pagination?.total ??
            pyqsResult?.resources?.length ??
            0,
        });

        setError("");
      })
      .catch((err) => {
        if (cancelled) return;

        setError(
          err.message || "Unable to load the admin overview."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleRefresh() {
    setLoading(true);
    setError("");
    setRefreshKey((previous) => previous + 1);
  }

  const totalPending =
    stats.pendingNotes + stats.pendingPYQs;

  const cards = [
    {
      label: "Pending Notes",
      value: stats.pendingNotes,
      description: "Notes waiting for review",
      icon: FileText,
    },
    {
      label: "Pending PYQs",
      value: stats.pendingPYQs,
      description: "Question papers waiting for review",
      icon: FileQuestion,
    },
    {
      label: "Total Pending",
      value: totalPending,
      description: "Resources requiring moderation",
      icon: Clock3,
    },
  ];

  const actions = [
    {
      title: "Resource Approvals",
      description:
        "Review, approve or reject submitted notes and PYQs.",
      path: "/admin/resources",
      label: "Review resources",
      icon: ShieldCheck,
    },
    {
      title: "Browse Notes",
      description:
        "View approved study notes available on OpenNotes.",
      path: "/browse-notes",
      label: "Browse notes",
      icon: FileText,
    },
    {
      title: "Browse PYQs",
      description:
        "Explore available previous-year question papers.",
      path: "/browse-pyqs",
      label: "Browse PYQs",
      icon: FileQuestion,
    },
    {
      title: "Home",
      description:
        "Return to the main OpenNotes application.",
      path: "/home",
      label: "Go to home",
      icon: BookOpen,
    },
  ];

  return (
    <main className="admin-dashboard dashboard-page">
      <section className="admin-welcome dashboard-welcome">
        <div>
          <span className="admin-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATION
          </span>

          <h1>Admin Dashboard</h1>

          <p>
            Manage resource submissions and keep OpenNotes organised.
          </p>
        </div>

        <div
          className="admin-welcome-icon"
          aria-hidden="true"
        >
          <ShieldCheck size={34} />
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2>Resource moderation overview</h2>
            <p>
              Live pending counts from the OpenNotes database.
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {error && (
          <p className="admin-data-note" role="alert">
            {error}
          </p>
        )}

        <div className="admin-stats-grid">
          {cards.map(
            ({ label, value, description, icon: Icon }) => (
              <article
                className="admin-stat-card"
                key={label}
              >
                <div className="admin-stat-top">
                  <span>{label}</span>

                  <span className="admin-stat-icon">
                    <Icon size={20} />
                  </span>
                </div>

                <strong>{loading ? "—" : value}</strong>

                <p>{description}</p>
              </article>
            )
          )}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2>Administration tools</h2>
            <p>Choose an area to manage or explore.</p>
          </div>
        </div>

        <div className="admin-actions-grid">
          {actions.map(
            ({
              title,
              description,
              path,
              label,
              icon: Icon,
            }) => (
              <article
                className="admin-action-card"
                key={title}
              >
                <span className="admin-action-icon">
                  <Icon size={22} />
                </span>

                <h3>{title}</h3>

                <p>{description}</p>

                <Link
                  to={path}
                  className="admin-action-link"
                >
                  {label}
                  <ArrowRight size={16} />
                </Link>
              </article>
            )
          )}
        </div>
      </section>

      <section className="admin-notice">
        <Clock3 size={21} />

        <div>
          <h3>Resources awaiting review</h3>

          <p>
            {loading
              ? "Checking pending submissions..."
              : totalPending === 0
                ? "There are no pending resource submissions right now."
                : `${totalPending} resource(s) are waiting for your review.`}
          </p>

          <Link
            to="/admin/resources"
            className="admin-action-link"
          >
            Open resource approvals
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
