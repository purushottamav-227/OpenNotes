import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  FileQuestion,
  FileText,
  FolderOpen,
  UploadCloud,
  UserRound,
} from "lucide-react";
import useAuth from "../../context/useAuth";
import useMyUploadStats from "../../hooks/useMyUploadStats";
import { getUploadBlocker } from "../../utils/uploadEligibility";
import "../../css/dashboards.css";

export default function TeacherDashboard() {
  const { user, currentUser } = useAuth();
  const { stats, loading, error } = useMyUploadStats();
  const uploadBlocker = getUploadBlocker(user);

  const shortcuts = [
    {
      title: "Browse Notes",
      description: "Explore available notes and learning resources.",
      path: "/browse-notes",
      icon: BookOpen,
    },
    {
      title: "Browse PYQs",
      description: "Review previous-year question papers.",
      path: "/browse-pyqs",
      icon: FileQuestion,
    },
    {
      title: "Upload Resources",
      description: "Share teaching notes and question papers.",
      path: "/upload",
      icon: UploadCloud,
    },
    {
      title: "My Uploads",
      description: "Review your submitted resources.",
      path: "/my-uploads",
      icon: FolderOpen,
    },
    {
      title: "My Profile",
      description: "Keep your account information up to date.",
      path: "/profile",
      icon: UserRound,
    },
  ];

  return (
    <main className="dashboard-page">
      <section className="dashboard-welcome">
        <span className="dashboard-eyebrow">TEACHER SPACE</span>
        <h1>Welcome back, {currentUser?.name || "Teacher"}!</h1>
        <p>Manage your teaching resources and share useful study material.</p>
      </section>

      <section className="dashboard-metrics">
        <article className="dashboard-metric">
          <FileText size={22} />
          <span>Notes uploaded</span>
          <strong>{loading ? "—" : stats.notes}</strong>
        </article>
        <article className="dashboard-metric">
          <FileQuestion size={22} />
          <span>PYQs uploaded</span>
          <strong>{loading ? "—" : stats.pyqs}</strong>
        </article>
        <article className="dashboard-metric">
          <UploadCloud size={22} />
          <span>Pending uploads</span>
          <strong>{loading ? "—" : stats.pending}</strong>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Teaching tools</h2>
            <p>Access your resources and profile.</p>
          </div>
        </div>

        <div className="dashboard-shortcuts">
          {shortcuts.map(({ title, description, path, icon: Icon }) => (
            <article className="dashboard-shortcut" key={title}>
              <span className="dashboard-shortcut-icon">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to={path}>
                Open section <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {error && (
        <p className="dashboard-data-note" role="alert">
          {error}
        </p>
      )}

      {uploadBlocker && (
        <p className="dashboard-data-note">{uploadBlocker}</p>
      )}
    </main>
  );
}