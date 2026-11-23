import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import { authApi } from "../../services/api";
import { roleHome } from "../../config/roles";
import "./Login.css";
import Logo from "../../Components/common/Logo";
import OAuthButtons from "../../Components/auth/OAuthButtons";

const roleOptions = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
];

const destinationByRole = roleHome;

function getSafeDestination(requestedPath, role) {
  const defaultPath = destinationByRole[role] || "/home";

  if (!requestedPath || !requestedPath.startsWith("/")) {
    return defaultPath;
  }

  // Never allow a login redirect to another role's dashboard.
  if (
    requestedPath.startsWith("/teacher/") &&
    role !== "teacher"
  ) {
    return defaultPath;
  }

  if (
    requestedPath.startsWith("/admin/") &&
    role !== "admin"
  ) {
    return defaultPath;
  }

  if (
    ["/login", "/signup", "/splash"].includes(requestedPath)
  ) {
    return defaultPath;
  }

  return requestedPath;
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [resending, setResending] = useState(false);
  // UI hint only. The backend decides the real role; this never grants access.
  const [selectedRole, setSelectedRole] = useState("student");

  if (isAuthenticated) {
    return (
      <main className="login-redirect">
        <p>You are already signed in.</p>
        <button
          type="button"
          onClick={() =>
            navigate(destinationByRole[role] || "/home", {
              replace: true,
            })
          }
        >
          Continue to OpenNotes
        </button>
      </main>
    );
  }

  const needsVerification = /verif/i.test(error);

  const handleResend = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your email address first, then request a new link.");
      return;
    }

    setResending(true);

    try {
      const result = await authApi.resendVerification(cleanEmail);
      setError("");
      setNotice(
        result?.message ||
          "If an eligible account exists, a verification email will be sent."
      );
    } catch (err) {
      setError(err.message || "Unable to send the verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(cleanEmail, password);

      if (!result?.success) {
        setError(
          result?.message || "Unable to sign in. Please try again."
        );
        return;
      }

      const requestedPath = location.state?.from?.pathname;
      const destination = getSafeDestination(
        requestedPath,
        result.user?.role
      );

      navigate(destination, { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <Link
            to="/home"
            className="login-brand"
            aria-label="OpenNotes home"
            >
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
            Your notes, previous-year questions, and study resources
            — together in one place.
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

      <section className="login-form-panel">
        <div className="login-form-wrapper">
          <Link to="/home" className="login-mobile-brand">
            <Logo className="login-logo" />
          </Link>

          <div className="login-heading">
            <span className="login-eyebrow">WELCOME BACK</span>
            <h2>Sign in to OpenNotes</h2>
            <p>Enter your account details to continue.</p>
          </div>

          <div
            className="login-demo-buttons"
            role="group"
            aria-label="Sign in as"
            style={{ marginBottom: 18 }}
          >
            {roleOptions.map((option) => {
              const active = selectedRole === option.value;

              return (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={active}
                  onClick={() => setSelectedRole(option.value)}
                  style={
                    active
                      ? {
                          borderColor: "var(--login-gold)",
                          color: "var(--login-gold)",
                        }
                      : undefined
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>

              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  required
                />

                <button
                  className="login-password-toggle"
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </div>
            )}

            {needsVerification && (
              <button
                type="button"
                className="login-password-toggle"
                onClick={handleResend}
                disabled={resending}
                style={{ alignSelf: "flex-start" }}
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
            )}

            {notice && (
              <div className="login-error" role="status">
                <span aria-hidden="true">i</span>
                {notice}
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <OAuthButtons />

          <p className="login-register-link">
            New to OpenNotes? <Link to="/signup">Create an account</Link>
          </p>

          <p className="login-register-link">
            Want to explore first? <Link to="/home">Browse OpenNotes</Link>
          </p>

          <p className="login-security-note">
            Your account is secured by OpenNotes. Your role and
            permissions are always verified by our servers.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;