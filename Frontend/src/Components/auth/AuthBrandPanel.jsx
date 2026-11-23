import { Link } from "react-router-dom";
import Logo from "../common/Logo";

// Left-hand branding panel shared by auth pages (uses Login.css classes).
export default function AuthBrandPanel() {
  return (
    <section className="login-brand-panel">
      <Link to="/home" className="login-brand" aria-label="OpenNotes home">
        <Logo className="login-logo" />
      </Link>

      <div className="login-brand-content">
        <span className="login-eyebrow">YOUR LEARNING SPACE</span>

        <h1>
          Learn smarter.
          <br />
          <span>Move forward.</span>
        </h1>

        <p>
          Your notes, previous-year questions, and study resources — together
          in one place.
        </p>

        <div className="login-feature">
          <span className="login-feature-icon">01</span>
          <div>
            <strong>Organised resources</strong>
            <p>Find study material by stream, semester, and subject.</p>
          </div>
        </div>

        <div className="login-feature">
          <span className="login-feature-icon">02</span>
          <div>
            <strong>Built for students</strong>
            <p>Spend less time searching and more time learning.</p>
          </div>
        </div>
      </div>

      <p className="login-brand-footer">
        Every semester, every subject, right at your fingertips.
      </p>
    </section>
  );
}