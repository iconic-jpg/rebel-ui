import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const API = "https://r3bel.onrender.com";
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
  @keyframes blink {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 1;   }
  }
  .cb-root {
    min-height: 100vh;
    background: #020b18;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Share Tech Mono', monospace;
    gap: 16px;
  }
  .cb-text {
    font-size: 10px;
    letter-spacing: 4px;
    color: rgba(0,200,255,.35);
    animation: blink 1.2s ease-in-out infinite;
  }
  .cb-error {
    font-size: 10px;
    letter-spacing: 2px;
    color: rgba(255,80,80,.8);
    padding: 10px 16px;
    border-left: 2px solid rgba(255,80,80,.4);
    background: rgba(255,80,80,.04);
    max-width: 420px;
    text-align: center;
  }
  .cb-back {
    font-size: 9px;
    letter-spacing: 3px;
    color: rgba(0,200,255,.4);
    text-decoration: none;
    border-bottom: 1px solid rgba(0,200,255,.2);
    padding-bottom: 2px;
    transition: color 0.2s;
  }
  .cb-back:hover { color: #00c8ff; }
`;
export default function GoogleCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const saved = sessionStorage.getItem("google_oauth_state");
        // Clear the code from the URL bar immediately
        window.history.replaceState({}, "", "/auth/google/callback");
        if (!code) {
            setError("No authorisation code received from Google.");
            return;
        }
        // CSRF check — only enforce if we actually stored a state value
        if (saved && state !== saved) {
            setError("OAuth state mismatch — possible CSRF. Please try again.");
            return;
        }
        sessionStorage.removeItem("google_oauth_state");
        // Exchange code → tokens via backend
        fetch(`${API}/api/auth/google/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
        })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
            if (!ok) {
                setError(data.detail || data.error || "Google login failed.");
                return;
            }
            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);
            navigate("/splash", { replace: true });
        })
            .catch(() => setError("Network error — could not complete Google login."));
    }, [navigate]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: styles }), _jsx("div", { className: "cb-root", children: error ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "cb-error", children: error }), _jsx("a", { href: "/login", className: "cb-back", children: "\u2190 back to login" })] })) : (_jsx("span", { className: "cb-text", children: "// authenticating with google..." })) })] }));
}
