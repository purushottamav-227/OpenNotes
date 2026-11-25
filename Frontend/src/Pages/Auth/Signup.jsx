import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Eye,
  EyeOff,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { authApi } from "../../services/api";
import "./Signup.css";
import Logo from "../../Components/common/Logo";
import OAuthButtons from "../../Components/auth/OAuthButtons";
import CollegePicker from "../../Components/auth/CollegePicker";

function Signup() {
  const [role, setRole] = useState("student");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [college, setCollege] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (name.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (name.length > 100) {
      setError("Your name cannot exceed 100 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 12) {
      setError("Your password must contain at least 12 characters.");
      return;
    }

    if (password.length > 128) {
      setError("Your password cannot exceed 128 characters.");
      return;
    }

    if (password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (role === "teacher" && !college) {
      setError("Select your college to register as a teacher.");
      return;
    }

    if (!form.acceptTerms) {
      setError("Please accept the terms to continue.");
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.register({
        name,
        email,
        password,
        role,
        ...(college ? { collegeId: college._id } : {}),
      });

      if (!result?.success) {
        throw new Error(
          result?.message || "Registration failed. Please try again."
        );
      }

      setSuccess(
        role === "teacher"
          ? "Registration successful. Verify your email, then wait for an administrator to approve your teacher account before you can upload."
          : result.message ||
              "Registration successful. Please check your email and verify your account before signing in."
      );

      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        acceptTerms: false,
      });
      setCollege(null);
      setRole("student");
    } catch (err) {
      console.error("OpenNotes registration error:", err);

      setError(
        err.message || "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="signup-page">
      <section className="signup-aside">
        <Link
          to="/home"
          className="signup-brand"
          aria-label="OpenNotes home"
        >
          <Logo className="signup-logo" />
        </Link>

        <div className="signup-aside-content">
          <span className="signup-eyebrow">JOIN THE COMMUNITY</span>

          <h1>
            Your next step
            <br />
            <span>starts here.</span>
          </h1>

          <p>
            Discover resources, organise your learning, and make every
            semester count.
          </p>

          <div className="signup-benefit">
            <CheckCircle2 size={19} />
            <span>Study resources organised in one place</span>
          </div>

          <div className="signup-benefit">
            <CheckCircle2 size={19} />
            <span>A profile that keeps your learning connected</span>
          </div>

          <div className="signup-benefit">
            <CheckCircle2 size={19} />
            <span>Access learning materials from your community</span>
          </div>
        </div>

        <p className="signup-aside-footer">
          Every semester, every subject, right at your fingertips.
        </p>
      </section>

      <section className="signup-main">
        <div className="signup-card">
          <div className="signup-mobile-brand">
            <Logo className="signup-logo" />
          </div>

          <header className="signup-heading">
            <span className="signup-eyebrow">CREATE YOUR ACCOUNT</span>
            <h2>Join OpenNotes</h2>
            <p>Fill in your details to get started.</p>
          </header>

          <form className="signup-form" onSubmit={handleSubmit}>
            <fieldset className="signup-role-fieldset">
              <legend>I am registering as</legend>

              <div className="signup-role-options">
                {[
                  {
                    value: "student",
                    label: "Student",
                    hint: "Browse and upload notes and PYQs.",
                    Icon: GraduationCap,
                  },
                  {
                    value: "teacher",
                    label: "Teacher",
                    hint: "Needs administrator approval.",
                    Icon: BookOpen,
                  },
                ].map(({ value, label, hint, Icon }) => (
                  <label
                    key={value}
                    className={`signup-role-option ${
                      role === value ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => {
                        setRole(value);
                        setError("");
                        setSuccess("");
                      }}
                    />
                    <Icon size={18} aria-hidden="true" />
                    <span>
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </span>
                  </label>
                ))}
              </div>

              {role === "teacher" && (
                <p className="signup-approval-note">
                  Teacher accounts can browse straight away, but can upload
                  only after an administrator approves them.
                </p>
              )}
            </fieldset>

            <div className="signup-field">
              <label htmlFor="signup-name">Full name</label>

              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={updateField}
                maxLength={100}
                required
              />
            </div>

            <div className="signup-field">
              <label htmlFor="signup-email">Email address</label>

              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField}
                required
              />
            </div>

            <div className="signup-field">
              <label htmlFor="signup-college">
                {role === "teacher" ? "College" : "College (optional)"}
              </label>

              <CollegePicker
                value={college}
                onChange={(selected) => {
                  setCollege(selected);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
              />

              <p className="signup-field-hint">
                {role === "teacher"
                  ? "Select the college you teach at. An administrator will review it when approving your account."
                  : "Select your college to upload resources later. Use your college email address so we can confirm your affiliation."}
              </p>
            </div>

            <div className="signup-field">
              <label htmlFor="signup-password">Password</label>

              <div className="signup-password-wrap">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  value={form.password}
                  onChange={updateField}
                  minLength={12}
                  maxLength={128}
                  required
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <small className="signup-field-hint">
                Use at least 12 characters.
              </small>
            </div>

            <div className="signup-field">
              <label htmlFor="signup-confirm-password">
                Confirm password
              </label>

              <div className="signup-password-wrap">
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  value={form.confirmPassword}
                  onChange={updateField}
                  required
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <label className="signup-terms">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={form.acceptTerms}
                onChange={updateField}
              />

              <span>
                I agree to the terms of use and privacy policy.
              </span>
            </label>

            {error && (
              <p className="signup-message signup-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="signup-message signup-success" role="status">
                {success}
              </p>
            )}

            <button
              className="signup-submit"
              type="submit"
              disabled={loading || Boolean(success)}
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <OAuthButtons />

          <p className="signup-login-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <p className="signup-security-note">
            Your account details are securely processed by OpenNotes.
            Email verification is required before signing in.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Signup;