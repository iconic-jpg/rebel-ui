
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = (
  import.meta.env.VITE_AUTH_API_URL ||
  "https://r3bel-ue0h.onrender.com"
).replace(/\/+$/, "");

const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  @keyframes blink {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
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

  .cb-back:hover {
    color: #00c8ff;
  }
`;

interface GoogleAuthResponse {
  access?: string;
  refresh?: string;
  error?: string;
  detail?: string;
}

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const authenticate = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const saved = sessionStorage.getItem("google_oauth_state");

      // Remove the authorization code from the URL.
      window.history.replaceState(
        {},
        "",
        "/auth/google/callback"
      );

      if (!code) {
        setError("No authorisation code received from Google.");
        return;
      }

      // Verify OAuth state to protect against CSRF.
      if (saved && state !== saved) {
        sessionStorage.removeItem("google_oauth_state");
        setError("OAuth state mismatch — possible CSRF. Please try again.");
        return;
      }

      sessionStorage.removeItem("google_oauth_state");

      try {
        const response = await fetch(`${API}/api/auth/google/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code,
            redirect_uri: REDIRECT_URI,
          }),
        });

        const data: GoogleAuthResponse = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail ||
            data.error ||
            `Google authentication failed (${response.status}).`
          );
        }

        // Django must return a valid SimpleJWT access/refresh pair.
        if (
          typeof data.access !== "string" ||
          typeof data.refresh !== "string" ||
          data.access.split(".").length !== 3 ||
          data.refresh.split(".").length !== 3
        ) {
          throw new Error(
            "Google sign-in did not return a valid Rebel session. Please try again."
          );
        }

        if (cancelled) return;

        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);

        navigate("/splash", { replace: true });
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Network error — could not complete Google login."
        );
      }
    };

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <>
      <style>{styles}</style>

      <div className="cb-root">
        {error ? (
          <>
            <div className="cb-error">{error}</div>
            <a href="/login" className="cb-back">
              ← back to login
            </a>
          </>
        ) : (
          <span className="cb-text">
            // authenticating with google...
          </span>
        )}
      </div>
    </>
  );
}
