import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerAccount } from "../api/auth";
import { apiErrorMessage } from "../api/client";
import "../styles/auth.css";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreedToTos) {
      setError("You must agree to the Terms of Service to create an account");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await registerAccount({ username, email, password, agreedToTos: true });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create account"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Account created!</h1>
          <p className="subtitle">Check your email for a verification link, then log in.</p>
          <button className="btn btn-primary" onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Create an account</h1>
        <p className="subtitle">Join XRA - chat with your friends and your VR crew.</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="username">Username</label>
            <input id="username" required minLength={2} maxLength={32} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="checkbox-row">
            <input
              id="agreed-to-tos"
              type="checkbox"
              checked={agreedToTos}
              onChange={(e) => setAgreedToTos(e.target.checked)}
            />
            <label htmlFor="agreed-to-tos">
              I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || !agreedToTos}>
            {loading ? "Creating account…" : "Continue"}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </div>
      </div>
    </div>
  );
}
