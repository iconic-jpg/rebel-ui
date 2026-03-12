import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://r3bel.onrender.com";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600&display=swap');

  .login-root {
    min-height: 100vh;
    background: #020408;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Rajdhani', sans-serif;
    overflow: hidden;
    position: relative;
  }

  .login-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 60px,
        rgba(0, 255, 170, 0.015) 60px,
        rgba(0, 255, 170, 0.015) 61px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 60px,
        rgba(0, 255, 170, 0.015) 60px,
        rgba(0, 255, 170, 0.015) 61px
      );
    pointer-events: none;
  }

  .login-root::after {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(ellipse at 40% 60%, rgba(0, 255, 170, 0.04) 0%, transparent 60%);
    pointer-events: none;
  }

  .login-card {
    position: relative;
    width: 380px;
    padding: 48px 40px;
    animation: fadeUp 0.6s ease both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .corner {
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: rgba(0, 255, 170, 0.5);
    border-style: solid;
  }
  .corner-tl { top: 0; left: 0; border-width: 1px 0 0 1px; }
  .corner-tr { top: 0; right: 0; border-width: 1px 1px 0 0; }
  .corner-bl { bottom: 0; left: 0; border-width: 0 0 1px 1px; }
  .corner-br { bottom: 0; right: 0; border-width: 0 1px 1px 0; }

  .login-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.3em;
    color: rgba(0, 255, 170, 0.5);
    text-transform: uppercase;
    margin-bottom: 32px;
  }

  .login-title {
    font-size: 32px;
    font-weight: 600;
    letter-spacing: 0.15em;
    color: #e8f4f0;
    text-transform: uppercase;
    margin: 0 0 8px 0;
    line-height: 1;
  }

  .login-sub {
    font-size: 13px;
    font-weight: 300;
    color: rgba(255,255,255,0.25);
    letter-spacing: 0.1em;
    margin: 0 0 40px 0;
  }

  .field-group {
    margin-bottom: 20px;
    position: relative;
  }

  .field-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.25em;
    color: rgba(0, 255, 170, 0.4);
    text-transform: uppercase;
    display: block;
    margin-bottom: 8px;
  }

  .field-input {
    width: 100%;
    background: rgba(0, 255, 170, 0.03);
    border: none;
    border-bottom: 1px solid rgba(0, 255, 170, 0.2);
    color: #e8f4f0;
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: 0.05em;
    padding: 10px 0;
    outline: none;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  .field-input::placeholder {
    color: rgba(255,255,255,0.1);
  }

  .field-input:focus {
    border-bottom-color: rgba(0, 255, 170, 0.7);
  }

  .field-input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #020408 inset;
    -webkit-text-fill-color: #e8f4f0;
  }

  .submit-btn {
    width: 100%;
    margin-top: 36px;
    padding: 14px;
    background: transparent;
    border: 1px solid rgba(0, 255, 170, 0.4);
    color: rgba(0, 255, 170, 0.9);
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .submit-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 255, 170, 0.06);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .submit-btn:hover:not(:disabled)::before {
    transform: translateX(0);
  }

  .submit-btn:hover:not(:disabled) {
    border-color: rgba(0, 255, 170, 0.8);
    color: #00ffaa;
    box-shadow: 0 0 20px rgba(0, 255, 170, 0.1);
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .error-msg {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: rgba(255, 80, 80, 0.8);
    margin-top: 16px;
    padding: 10px 12px;
    border-left: 2px solid rgba(255, 80, 80, 0.4);
    background: rgba(255, 80, 80, 0.04);
  }

  .signup-link {
    margin-top: 28px;
    text-align: center;
    font-size: 12px;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.05em;
  }

  .signup-link a {
    color: rgba(0, 255, 170, 0.5);
    text-decoration: none;
    transition: color 0.2s;
  }

  .signup-link a:hover {
    color: rgba(0, 255, 170, 0.9);
  }

  .checking-root {
    min-height: 100vh;
    background: #020408;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .checking-text {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.3em;
    color: rgba(0, 255, 170, 0.4);
    animation: blink 1.2s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 1; }
  }
`;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);

  // ── Auto-login: silently restore session from stored refresh token ──────
  useEffect(() => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      setCheckingSession(false);
      return;
    }

    fetch(`${API}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("expired");
        return res.json();
      })
      .then((data) => {
        localStorage.setItem("access", data.access);
        // Some backends rotate the refresh token — store it if returned
        if (data.refresh) localStorage.setItem("refresh", data.refresh);
        navigate("/", { replace: true });
      })
      .catch(() => {
        // Token invalid or expired — clear and show login form
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setCheckingSession(false);
      });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Invalid credentials");
        return;
      }

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      navigate("/");
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // Blank screen while we silently check for an existing session
  if (checkingSession) {
    return (
      <>
        <style>{styles}</style>
        <div className="checking-root">
          <span className="checking-text">// verifying session...</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-card">
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />

          <div className="login-label">// auth required</div>
          <h1 className="login-title">Rebel</h1>
          <p className="login-sub">Enter your credentials to continue</p>

          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Email Address</label>
              <input
                className="field-input"
                type="email"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Authenticating..." : "Access System"}
            </button>
          </form>

          {error && <div className="error-msg">{error}</div>}

          <div className="signup-link">
            No access yet? <a href="#/signup">Create account</a>
          </div>
        </div>
      </div>
    </>
  );
}