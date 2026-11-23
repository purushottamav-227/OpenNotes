import { Link } from "react-router-dom";
import { ClipboardCheck, ShieldCheck, UserRound } from "lucide-react";

import "../../css/teacher-approvals.css";

// The backend has no teacher-application endpoints yet (no way to register
// as a teacher, list applications, or approve/reject them). Until those
// exist this page must not invent data, so it explains the situation.
export default function TeacherApprovals() {
  return (
    <main className="teacher-approvals dashboard-page">
      <header className="ta-page-header">
        <div>
          <span className="ta-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATION
          </span>

          <h1>Teacher approvals</h1>

          <p>
            Review teacher applications before they can upload resources.
          </p>
        </div>
      </header>

      <section className="ta-requests-section">
        <div className="ta-section-heading">
          <div>
            <h2>Registration requests</h2>
            <p>Teacher applications will appear here.</p>
          </div>
        </div>

        <div className="ta-state">
          <div className="ta-empty-icon">
            <UserRound size={26} />
          </div>

          <h3>Teacher approvals are not available yet</h3>

          <p>
            The server does not provide teacher applications yet, so there is
            nothing to review. Resource moderation is fully available.
          </p>

          <Link
            to="/admin/resources"
            className="ta-secondary-button"
            style={{ textDecoration: "none" }}
          >
            <ClipboardCheck size={16} />
            Go to resource approvals
          </Link>
        </div>
      </section>
    </main>
  );
}