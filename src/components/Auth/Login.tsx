import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://r3bel.onrender.com";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  @keyframes rebel-scan {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(110vh); }
  }
  @keyframes rebel-fadeup {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rebel-flicker {
    0%, 90%, 94%, 98%, 100% { opacity: 1; }
    92% { opacity: 0.7; }
    96% { opacity: 0.8; }
  }
  @keyframes blink {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  *, *::before, *::after { box-sizing: border-box; }

  .login-root {
    min-height: 100vh;
    background: #020b18;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Orbitron', monospace;
    overflow: hidden;
    position: relative;
    padding: 24px 16px;
  }

  .rebel-grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,180,255,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,180,255,.04) 1px, transparent 1px);
    background-size: 36px 36px;
    pointer-events: none;
    z-index: 0;
  }

  .rebel-scan {
    position: fixed;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(transparent, rgba(0,200,255,.18), transparent);
    animation: rebel-scan 4s linear infinite;
    pointer-events: none;
    z-index: 0;
  }

  .rebel-corner {
    position: absolute;
    width: 20px;
    height: 20px;
    z-index: 2;
  }
  .rebel-corner::before,
  .rebel-corner::after {
    content: '';
    position: absolute;
    background: rgba(0,200,255,.5);
  }
  .rebel-corner::before { width: 100%; height: 1.5px; top: 0; }
  .rebel-corner::after  { width: 1.5px; height: 100%; top: 0; }
  .rebel-corner-tl { top: 16px; left: 16px; }
  .rebel-corner-tr { top: 16px; right: 16px; transform: scaleX(-1); }
  .rebel-corner-bl { bottom: 16px; left: 16px; transform: scaleY(-1); }
  .rebel-corner-br { bottom: 16px; right: 16px; transform: scale(-1); }

  .login-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    padding: 48px 40px;
    z-index: 1;
    animation: rebel-fadeup 0.8s ease both;
  }

  @media (max-width: 480px) {
    .login-card { padding: 36px 24px; }
    .rebel-corner-tl { top: 12px; left: 12px; }
    .rebel-corner-tr { top: 12px; right: 12px; }
    .rebel-corner-bl { bottom: 12px; left: 12px; }
    .rebel-corner-br { bottom: 12px; right: 12px; }
  }

  .card-corner { position: absolute; width: 18px; height: 18px; }
  .card-corner::before, .card-corner::after { content: ''; position: absolute; background: rgba(0,200,255,.4); }
  .card-corner::before { width: 100%; height: 1.5px; top: 0; }
  .card-corner::after  { width: 1.5px; height: 100%; top: 0; }
  .card-corner-tl { top: 0; left: 0; }
  .card-corner-tr { top: 0; right: 0; transform: scaleX(-1); }
  .card-corner-bl { bottom: 0; left: 0; transform: scaleY(-1); }
  .card-corner-br { bottom: 0; right: 0; transform: scale(-1); }

  .login-label {
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 4px;
    color: rgba(0,200,255,.4);
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  .login-title {
    font-size: clamp(28px, 8vw, 40px);
    font-weight: 900;
    letter-spacing: clamp(6px, 2vw, 12px);
    color: #00c8ff;
    text-transform: uppercase;
    margin: 0 0 8px;
    animation: rebel-flicker 6s ease-in-out infinite;
    text-shadow: 0 0 30px rgba(0,200,255,.5), 0 0 60px rgba(0,180,255,.2);
  }

  .login-sub {
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 3px;
    color: rgba(0,200,255,.3);
    text-transform: uppercase;
    margin: 0 0 32px;
  }

  .rebel-divider-line {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0,200,255,.2), transparent);
    margin-bottom: 32px;
  }

  .field-group { margin-bottom: 24px; position: relative; }

  .field-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    color: rgba(0,200,255,.4);
    text-transform: uppercase;
    display: block;
    margin-bottom: 10px;
  }

  .field-input {
    width: 100%;
    background: rgba(0,200,255,.03);
    border: none;
    border-bottom: 1px solid rgba(0,200,255,.2);
    color: #c8eeff;
    font-family: 'Share Tech Mono', monospace;
    font-size: 14px;
    letter-spacing: 2px;
    padding: 10px 0;
    outline: none;
    transition: border-color 0.2s ease;
  }
  .field-input::placeholder { color: rgba(0,200,255,.15); }
  .field-input:focus { border-bottom-color: rgba(0,200,255,.7); }
  .field-input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #020b18 inset;
    -webkit-text-fill-color: #c8eeff;
  }

  .submit-btn {
    width: 100%;
    margin-top: 32px;
    padding: 14px;
    background: transparent;
    border: 1px solid rgba(0,200,255,.35);
    color: rgba(0,200,255,.85);
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 4px;
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
    background: rgba(0,200,255,.06);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .submit-btn:hover:not(:disabled)::before { transform: translateX(0); }
  .submit-btn:hover:not(:disabled) {
    border-color: rgba(0,200,255,.8);
    color: #00c8ff;
    box-shadow: 0 0 20px rgba(0,200,255,.15);
  }
  .submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .rebel-or {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0 0;
    font-family: 'Share Tech Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    color: rgba(0,200,255,.2);
  }
  .rebel-or::before, .rebel-or::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(0,200,255,.1);
  }

  .google-btn {
    width: 100%;
    margin-top: 14px;
    padding: 13px;
    background: transparent;
    border: 1px solid rgba(0,200,255,.15);
    color: rgba(0,200,255,.45);
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .google-btn:hover {
    border-color: rgba(0,200,255,.4);
    color: rgba(0,200,255,.8);
  }
  .google-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .error-msg {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: rgba(255,80,80,.8);
    margin-top: 16px;
    padding: 10px 12px;
    border-left: 2px solid rgba(255,80,80,.4);
    background: rgba(255,80,80,.04);
  }

  .signup-link {
    margin-top: 28px;
    text-align: center;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(0,200,255,.2);
    font-family: 'Share Tech Mono', monospace;
  }
  .signup-link a {
    color: rgba(0,200,255,.5);
    text-decoration: none;
    transition: color 0.2s;
  }
  .signup-link a:hover { color: #00c8ff; }

  .checking-root {
    min-height: 100vh;
    background: #020b18;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Share Tech Mono', monospace;
  }
  .checking-text {
    font-size: 10px;
    letter-spacing: 4px;
    color: rgba(0,200,255,.35);
    animation: blink 1.2s ease-in-out infinite;
  }
`;

declare global {
  interface Window { google?: any; }
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const googleInitialized = useRef(false);

  useEffect(() => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) { setCheckingSession(false); return; }
    fetch(`${API}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(res => { if (!res.ok) throw new Error("expired"); return res.json(); })
      .then(data => {
        localStorage.setItem("access", data.access);
        if (data.refresh) localStorage.setItem("refresh", data.refresh);
        navigate("/", { replace: true });
      })
      .catch(() => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setCheckingSession(false);
      });
  }, [navigate]);

  const handleGoogleResponse = async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/google/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || data.error || "Google login failed"); return; }
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      navigate("/splash");
    } catch {
      setError("Google login failed. Try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (googleInitialized.current) return;
    const initGoogle = () => {
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return;
      window.google?.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        use_fedcm_for_prompt: false,
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      googleInitialized.current = true;
    };
    const existing = document.getElementById("gsi-script");
    if (existing) { initGoogle(); return; }
    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    return () => { window.google?.accounts.id.cancel(); };
  }, []);

  const triggerGoogle = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) { setError("Google login is not configured."); return; }
    if (!googleInitialized.current) { setError("Google not loaded yet, please wait..."); return; }
    window.google?.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError("Google sign-in blocked by browser. Please allow popups and try again.");
      }
    });
  };

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
      if (!response.ok) { setError(data.detail || data.error || "Invalid credentials"); return; }
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      navigate("/splash");
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

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
        <div className="rebel-grid" />
        <div className="rebel-scan" />
        <div className="rebel-corner rebel-corner-tl" />
        <div className="rebel-corner rebel-corner-tr" />
        <div className="rebel-corner rebel-corner-bl" />
        <div className="rebel-corner rebel-corner-br" />

        <div className="login-card">
          <div className="card-corner card-corner-tl" />
          <div className="card-corner card-corner-tr" />
          <div className="card-corner card-corner-bl" />
          <div className="card-corner card-corner-br" />

          <div className="login-label">// auth required</div>
          <h1 className="login-title">Rebel</h1>
          <p className="login-sub">Enter credentials to continue</p>
          <div className="rebel-divider-line" />

          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Email Address</label>
              <input className="field-input" type="email" placeholder="user@domain.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" />
            </div>
            <div className="field-group">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password" />
            </div>
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Authenticating..." : "Access System"}
            </button>
          </form>

          <div className="rebel-or">or</div>

          <button className="google-btn" type="button" onClick={triggerGoogle} disabled={googleLoading}>
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "Authenticating..." : "Continue with Google"}
          </button>

          {error && <div className="error-msg">{error}</div>}

          <div className="signup-link">
            No access yet?&nbsp;<a href="#/signup">Create account</a>
          </div>
        </div>
      </div>
    </>
  );
}