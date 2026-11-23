
import "./Logo.css";

export default function Logo({ className = "" }) {
  return (
    <span
      className={`opennotes-logo ${className}`.trim()}
      role="img"
      aria-label="OpenNotes"
    >
      <span className="opennotes-logo-open">OPEN</span>
      <span className="opennotes-logo-notes">NOTE</span>
    </span>
  );
}
