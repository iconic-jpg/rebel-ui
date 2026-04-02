import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
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
      repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(0, 255, 170, 0.015) 60px, rgba(0, 255, 170, 0.015) 61px),
      repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0, 255, 170, 0.015) 60px, rgba(0, 255, 170, 0.015) 61px);
    pointer-events: none;
  }

  .login-root::after {
    content: '';
    position: fixed;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
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

  .corner { position: absolute; width: 16px; height: 16px; border-color: rgba(0, 255, 170, 0.5); border-style: solid; }
  .corner-tl { top: 0; left: 0; border-width: 1px 0 0 1px; }
  .corner-tr { top: 0; right: 0; border-width: 1px 1px 0 0; }
  .corner-bl { bottom: 0; left: 0; border-width: 0 0 1px 1px; }
  .corner-br { bottom: 0; right: 0; border-width: 0 1px 1px 0; }

  .login-label { font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 0.3em; color: rgba(0, 255, 170, 0.5); text-transform: uppercase; margin-bottom: 32px; }
  .login-title { font-size: 32px; font-weight: 600; letter-spacing: 0.15em; color: #e8f4f0; text-transform: uppercase; margin: 0 0 8px 0; line-height: 1; }
  .login-sub { font-size: 13px; font-weight: 300; color: rgba(255,255,255,0.25); letter-spacing: 0.1em; margin: 0 0 40px 0; }

  .field-group { margin-bottom: 20px; position: relative; }
  .field-label { font-family: 'Share Tech Mono', monospace; font-size: 9px; letter-spacing: 0.25em; color: rgba(0, 255, 170, 0.4); text-transform: uppercase; display: block; margin-bottom: 8px; }
  .field-input { width: 100%; background: rgba(0, 255, 170, 0.03); border: none; border-bottom: 1px solid rgba(0, 255, 170, 0.2); color: #e8f4f0; font-family: 'Rajdhani', sans-serif; font-size: 15px; font-weight: 400; letter-spacing: 0.05em; padding: 10px 0; outline: none; transition: border-color 0.2s ease; box-sizing: border-box; }
  .field-input::placeholder { color: rgba(255,255,255,0.1); }
  .field-input:focus { border-bottom-color: rgba(0, 255, 170, 0.7); }
  .field-input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #020408 inset; -webkit-text-fill-color: #e8f4f0; }

  .submit-btn { width: 100%; margin-top: 36px; padding: 14px; background: transparent; border: 1px solid rgba(0, 255, 170, 0.4); color: rgba(0, 255, 170, 0.9); font-family: 'Share Tech Mono', monospace; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; }
  .submit-btn::before { content: ''; position: absolute; inset: 0; background: rgba(0, 255, 170, 0.06); transform: translateX(-100%); transition: transform 0.3s ease; }
  .submit-btn:hover:not(:disabled)::before { transform: translateX(0); }
  .submit-btn:hover:not(:disabled) { border-color: rgba(0, 255, 170, 0.8); color: #00ffaa; box-shadow: 0 0 20px rgba(0, 255, 170, 0.1); }
  .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0 0; font-family: 'Share Tech Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: rgba(255,255,255,0.12); }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07); }

  .google-btn { width: 100%; margin-top: 12px; padding: 13px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); font-family: 'Share Tech Mono', monospace; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s ease; position: relative; overflow: hidden; }
  .google-btn::before { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.03); transform: translateX(-100%); transition: transform 0.3s ease; }
  .google-btn:hover::before { transform: translateX(0); }
  .google-btn:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.75); }
  .google-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .error-msg { font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: rgba(255, 80, 80, 0.8); margin-top: 16px; padding: 10px 12px; border-left: 2px solid rgba(255, 80, 80, 0.4); background: rgba(255, 80, 80, 0.04); }

  .signup-link { margin-top: 28px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.2); letter-spacing: 0.05em; }
  .signup-link a { color: rgba(0, 255, 170, 0.5); text-decoration: none; transition: color 0.2s; }
  .signup-link a:hover { color: rgba(0, 255, 170, 0.9); }

  .checking-root { min-height: 100vh; background: #020408; display: flex; align-items: center; justify-content: center; }
  .checking-text { font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 0.3em; color: rgba(0, 255, 170, 0.4); animation: blink 1.2s ease-in-out infinite; }
  @keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
`;
export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const googleInitialized = useRef(false);
    // ── Auto-login from refresh token ─────────────────────────────────────────
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
            .then(res => { if (!res.ok)
            throw new Error("expired"); return res.json(); })
            .then(data => {
            localStorage.setItem("access", data.access);
            if (data.refresh)
                localStorage.setItem("refresh", data.refresh);
            navigate("/", { replace: true });
        })
            .catch(() => {
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            setCheckingSession(false);
        });
    }, [navigate]);
    // ── Google response handler ───────────────────────────────────────────────
    const handleGoogleResponse = async (response) => {
        setGoogleLoading(true);
        setError("");
        try {
            const res = await fetch(`${API}/api/auth/google/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: response.credential }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.detail || data.error || "Google login failed");
                return;
            }
            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);
            navigate("/");
        }
        catch {
            setError("Google login failed. Try again.");
        }
        finally {
            setGoogleLoading(false);
        }
    };
    // ── Google SDK init ───────────────────────────────────────────────────────
    useEffect(() => {
        if (googleInitialized.current)
            return;
        const initGoogle = () => {
            if (!import.meta.env.VITE_GOOGLE_CLIENT_ID)
                return; // skip if not configured
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
        if (existing) {
            initGoogle();
            return;
        }
        const script = document.createElement("script");
        script.id = "gsi-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = initGoogle;
        document.head.appendChild(script);
        return () => { window.google?.accounts.id.cancel(); };
    }, []);
    // ── Trigger Google One Tap ────────────────────────────────────────────────
    const triggerGoogle = () => {
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            setError("Google login is not configured.");
            return;
        }
        if (!googleInitialized.current) {
            setError("Google not loaded yet, please wait...");
            return;
        }
        window.google?.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                setError("Google sign-in blocked by browser. Please allow popups and try again.");
            }
        });
    };
    // ── Email / password login ────────────────────────────────────────────────
    // Django SimpleJWT expects { username, password } — we use email as username
    const handleLogin = async (e) => {
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
                // SimpleJWT returns { detail: "No active account found..." } on failure
                setError(data.detail || data.error || "Invalid credentials");
                return;
            }
            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);
            navigate("/");
        }
        catch {
            setError("Unable to connect to server.");
        }
        finally {
            setLoading(false);
        }
    };
    if (checkingSession) {
        return (_jsxs(_Fragment, { children: [_jsx("style", { children: styles }), _jsx("div", { className: "checking-root", children: _jsx("span", { className: "checking-text", children: "// verifying session..." }) })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: styles }), _jsx("div", { className: "login-root", children: _jsxs("div", { className: "login-card", children: [_jsx("div", { className: "corner corner-tl" }), _jsx("div", { className: "corner corner-tr" }), _jsx("div", { className: "corner corner-bl" }), _jsx("div", { className: "corner corner-br" }), _jsx("div", { className: "login-label", children: "// auth required" }), _jsx("h1", { className: "login-title", children: "Rebel" }), _jsx("p", { className: "login-sub", children: "Enter your credentials to continue" }), _jsxs("form", { onSubmit: handleLogin, children: [_jsxs("div", { className: "field-group", children: [_jsx("label", { className: "field-label", children: "Email Address" }), _jsx("input", { className: "field-input", type: "email", placeholder: "user@domain.com", value: email, onChange: e => setEmail(e.target.value), required: true, autoComplete: "email" })] }), _jsxs("div", { className: "field-group", children: [_jsx("label", { className: "field-label", children: "Password" }), _jsx("input", { className: "field-input", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: e => setPassword(e.target.value), required: true, autoComplete: "current-password" })] }), _jsx("button", { className: "submit-btn", type: "submit", disabled: loading, children: loading ? "Authenticating..." : "Access System" })] }), _jsx("div", { className: "divider", children: "or" }), _jsxs("button", { className: "google-btn", type: "button", onClick: triggerGoogle, disabled: googleLoading, children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", children: [_jsx("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), _jsx("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), _jsx("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" }), _jsx("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })] }), googleLoading ? "Authenticating..." : "Continue with Google"] }), error && _jsx("div", { className: "error-msg", children: error }), _jsxs("div", { className: "signup-link", children: ["No access yet? ", _jsx("a", { href: "#/signup", children: "Create account" })] })] }) })] }));
}
