import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://r3bel.onrender.com";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

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

  *, *::before, *::after { box-sizing: border-box; }

  .signup-root {
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
    width: 20px; height: 20px;
    z-index: 2;
  }
  .rebel-corner::before, .rebel-corner::after {
    content: ''; position: absolute;
    background: rgba(0,200,255,.5);
  }
  .rebel-corner::before { width: 100%; height: 1.5px; top: 0; }
  .rebel-corner::after  { width: 1.5px; height: 100%; top: 0; }
  .rebel-corner-tl { top: 16px; left: 16px; }
  .rebel-corner-tr { top: 16px; right: 16px; transform: scaleX(-1); }
  .rebel-corner-bl { bottom: 16px; left: 16px; transform: scaleY(-1); }
  .rebel-corner-br { bottom: 16px; right: 16px; transform: scale(-1); }

  .signup-card {
    position: relative;
    width: 100%; max-width: 420px;
    padding: 48px 40px;
    z-index: 1;
    animation: rebel-fadeup 0.8s ease both;
  }

  @media (max-width: 480px) {
    .signup-card { padding: 36px 24px; }
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

  .signup-label {
    font-size: 9px; font-weight: 400; letter-spacing: 4px;
    color: rgba(0,200,255,.4); text-transform: uppercase; margin-bottom: 20px;
  }

  .signup-title {
    font-size: clamp(28px, 8vw, 40px); font-weight: 900;
    letter-spacing: clamp(6px, 2vw, 12px); color: #00c8ff;
    text-transform: uppercase; margin: 0 0 8px;
    animation: rebel-flicker 6s ease-in-out infinite;
    text-shadow: 0 0 30px rgba(0,200,255,.5), 0 0 60px rgba(0,180,255,.2);
  }

  .signup-sub {
    font-size: 9px; font-weight: 400; letter-spacing: 3px;
    color: rgba(0,200,255,.3); text-transform: uppercase; margin: 0 0 32px;
  }

  .rebel-divider-line {
    width: 100%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0,200,255,.2), transparent);
    margin-bottom: 32px;
  }

  .field-group { margin-bottom: 24px; position: relative; }

  .field-label {
    font-family: 'Share Tech Mono', monospace; font-size: 9px; letter-spacing: 3px;
    color: rgba(0,200,255,.4); text-transform: uppercase; display: block; margin-bottom: 10px;
  }

  .field-input {
    width: 100%; background: rgba(0,200,255,.03); border: none;
    border-bottom: 1px solid rgba(0,200,255,.2); color: #c8eeff;
    font-family: 'Share Tech Mono', monospace; font-size: 14px;
    letter-spacing: 2px; padding: 10px 0; outline: none;
    transition: border-color 0.2s ease;
  }
  .field-input::placeholder { color: rgba(0,200,255,.15); }
  .field-input:focus { border-bottom-color: rgba(0,200,255,.7); }
  .field-input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #020b18 inset;
    -webkit-text-fill-color: #c8eeff;
  }

  .submit-btn {
    width: 100%; margin-top: 32px; padding: 14px;
    background: transparent; border: 1px solid rgba(0,200,255,.35);
    color: rgba(0,200,255,.85); font-family: 'Orbitron', monospace;
    font-size: 10px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;
    cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden;
  }
  .submit-btn::before {
    content: ''; position: absolute; inset: 0;
    background: rgba(0,200,255,.06); transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .submit-btn:hover:not(:disabled)::before { transform: translateX(0); }
  .submit-btn:hover:not(:disabled) {
    border-color: rgba(0,200,255,.8); color: #00c8ff;
    box-shadow: 0 0 20px rgba(0,200,255,.15);
  }
  .submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .rebel-or {
    display: flex; align-items: center; gap: 12px; margin: 20px 0 0;
    font-family: 'Share Tech Mono', monospace; font-size: 9px;
    letter-spacing: 3px; color: rgba(0,200,255,.2);
  }
  .rebel-or::before, .rebel-or::after {
    content: ''; flex: 1; height: 1px; background: rgba(0,200,255,.1);
  }

  .google-btn {
    width: 100%; margin-top: 14px; padding: 13px;
    background: transparent; border: 1px solid rgba(0,200,255,.15);
    color: rgba(0,200,255,.45); font-family: 'Share Tech Mono', monospace;
    font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    gap: 10px; transition: all 0.2s ease;
  }
  .google-btn:hover { border-color: rgba(0,200,255,.4); color: rgba(0,200,255,.8); }
  .google-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .error-msg {
    font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 2px;
    color: rgba(255,80,80,.8); margin-top: 16px; padding: 10px 12px;
    border-left: 2px solid rgba(255,80,80,.4); background: rgba(255,80,80,.04);
  }

  .signin-link {
    margin-top: 28px; text-align: center; font-size: 9px; letter-spacing: 2px;
    color: rgba(0,200,255,.2); font-family: 'Share Tech Mono', monospace;
  }
  .signin-link a { color: rgba(0,200,255,.5); text-decoration: none; transition: color 0.2s; }
  .signin-link a:hover { color: #00c8ff; }
`;

function buildGoogleOAuthURL(): string {
  const state = crypto.randomUUID();
  sessionStorage.setItem("google_oauth_state", state);
  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export default function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const triggerGoogle = () => {
    if (!GOOGLE_CLIENT_ID) { setError("Google login is not configured."); return; }
    window.location.href = buildGoogleOAuthURL();
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); return; }
      localStorage.setItem("access",  data.access);
      localStorage.setItem("refresh", data.refresh);
      navigate("/splash");
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="signup-root">
        <div className="rebel-grid" />
        <div className="rebel-scan" />
        <div className="rebel-corner rebel-corner-tl" />
        <div className="rebel-corner rebel-corner-tr" />
        <div className="rebel-corner rebel-corner-bl" />
        <div className="rebel-corner rebel-corner-br" />

        <div className="signup-card">
          <div className="card-corner card-corner-tl" />
          <div className="card-corner card-corner-tr" />
          <div className="card-corner card-corner-bl" />
          <div className="card-corner card-corner-br" />

          <div className="signup-label">// init sequence</div>
          <h1 className="signup-title">Rebel</h1>
          <p className="signup-sub">Create your access credentials</p>
          <div className="rebel-divider-line" />

          <form onSubmit={handleSignup}>
            <div className="field-group">
              <label className="field-label">Username</label>
              <input className="field-input" type="text" placeholder="your_handle"
                value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="field-group">
              <label className="field-label">Email Address</label>
              <input className="field-input" type="email" placeholder="user@domain.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="min. 8 characters"
                value={password} minLength={8} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Initializing..." : "Create Account"}
            </button>
          </form>

          <div className="rebel-or">or</div>

          <button className="google-btn" type="button" onClick={triggerGoogle}>
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {error && <div className="error-msg">{error}</div>}

          <div className="signin-link">
            Already have access?&nbsp;<a href="/login">Sign in</a>
          </div>
        </div>
      </div>
    </>
  );
}