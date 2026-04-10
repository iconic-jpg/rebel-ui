import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://r3bel.onrender.com";

export default function GoogleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const saved = sessionStorage.getItem("google_oauth_state");

    if (!code) return;

    if (state !== saved) {
      console.error("State mismatch");
      return;
    }

    sessionStorage.removeItem("google_oauth_state");

    const redirect_uri = window.location.origin + "/auth/google/callback";

    fetch(`${API}/api/auth/google/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, redirect_uri }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.access) {
          localStorage.setItem("access", data.access);
          localStorage.setItem("refresh", data.refresh);
          navigate("/splash");
        } else {
          console.error("Login failed", data);
        }
      })
      .catch(err => console.error(err));

  }, [navigate]);

  return <div>Signing you in...</div>;
}