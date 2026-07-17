import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login } from "../api/auth";
import { useAuthStore } from "../store/auth";
import { apiErrorMessage } from "../api/client";
import "../styles/auth.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, token } = await login({ email, password });
      setToken(token);
      setUser(user);
      navigate(location.state?.from ?? "/app/friends", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not log in"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Welcome back!</h1>
        <p className="subtitle">We're so excited to see you again on XRA.</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>
        <div className="auth-footer">
          Need an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
