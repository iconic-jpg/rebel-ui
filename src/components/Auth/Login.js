import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
const API = "https://r3bel.onrender.com";
export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await fetch(`${API}/api/token/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: email,
                    password: password,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.detail || "Invalid credentials");
                setLoading(false);
                return;
            }
            // Store tokens (MVP approach)
            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);
            navigate("/");
        }
        catch (err) {
            setError("Unable to connect to server.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { style: { textAlign: "center", marginTop: "100px" }, children: [_jsx("h2", { children: "REBEL Login" }), _jsxs("form", { onSubmit: handleLogin, children: [_jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), required: true }), _jsx("br", {}), _jsx("br", {}), _jsx("input", { type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), required: true }), _jsx("br", {}), _jsx("br", {}), _jsx("button", { type: "submit", disabled: loading, children: loading ? "Logging in..." : "Login" })] }), error && (_jsx("p", { style: { color: "red", marginTop: "15px" }, children: error }))] }));
}
