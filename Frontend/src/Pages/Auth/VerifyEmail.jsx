import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AuthBrandPanel from "../../Components/auth/AuthBrandPanel";
import Logo from "../../Components/common/Logo";
import { authApi } from "../../services/api";
import "./Login.css";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState(
    TOKEN_PATTERN.test(token) ? "verifying" : "invalid"
  );
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);

  // Verification tokens are single-use, so make sure we only submit once
  // (React StrictMode runs effects twice in development).
  const submitted = useRef(false);

  useEffect(() => {
    if (!TOKEN_PATTERN.test(token) || submitted.current) return;

    submitted.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((error) => {
        setMessage(error.message || "Unable to verify your email.");
        setStatus("error");
      });
  }, [token]);

  async function handleResend(event) {
    event.preventDefault();
    setResendMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setResendMessage("Enter your email address.");
      return;
    }

    setResending(true);

    try {
      const result = await authApi.resendVerification(cleanEmail);
      setResendMessage(
        result?.message ||
          "If an eligible account exists, a verification email will be sent."
      );
    } catch (error) {
      setResendMessage(error.message || "Unable to send the email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="login-page">
      <AuthBrandPanel />

      <section className="login-form-panel">
        <div className="login-form-wrapper">
          <Link to="/home" className="login-mobile-brand">
            <Logo className="login-logo" />
          </Link>

          <div className="login-heading">
            <span className="login-eyebrow">EMAIL VERIFICATION</span>

            {status === "verifying" && (
              <>
                <h2>Verifying your email...</h2>
                <p>Please wait a moment.</p>
              </>
            )}

            {status === "success" && (
              <>
                <h2>Email verified</h2>
                <p>Your account is ready. You can now sign in.</p>
              </>
            )}

            {(status === "error" || status === "invalid") && (
              <>
                <h2>Verification link problem</h2>
                <p>
                  This link is invalid or has expired. Request a new one
                  below.
                </p>
              </>
            )}
          </div>

          {status === "success" && (
            <Link
              to="/login"
              className="login-submit"
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              Continue to sign in <span aria-hidden="true">→</span>
            </Link>
          )}

          {status === "error" && message && (
            <div className="login-error" role="alert">
              <span aria-hidden="true">!</span>
              {message}
            </div>
          )}

          {(status === "error" || status === "invalid") && (
            <form className="login-form" onSubmit={handleResend}>
              <div className="login-field">
                <label htmlFor="verify-email-address">Email address</label>
                <input
                  id="verify-email-address"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setResendMessage("");
                  }}
                  required
                />
              </div>

              {resendMessage && (
                <div className="login-error" role="status">
                  <span aria-hidden="true">i</span>
                  {resendMessage}
                </div>
              )}

              <button
                className="login-submit"
                type="submit"
                disabled={resending}
              >
                {resending ? "Sending..." : "Send a new verification email"}
              </button>
            </form>
          )}

          <p className="login-register-link">
            Back to <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}