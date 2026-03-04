import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
const API = import.meta.env.VITE_API_URL;
export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const handleSignup = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await fetch(`${API}/api/signup/`, {
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
                setError(data.error || "Signup failed");
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
    return (_jsxs("div", { style: { textAlign: "center", marginTop: "100px" }, children: [_jsx("h2", { children: "Create REBEL Account" }), _jsxs("form", { onSubmit: handleSignup, children: [_jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), required: true }), _jsx("br", {}), _jsx("br", {}), _jsx("input", { type: "password", placeholder: "Password", value: password, minLength: 8, onChange: (e) => setPassword(e.target.value), required: true }), _jsx("br", {}), _jsx("br", {}), _jsx("button", { type: "submit", disabled: loading, children: loading ? "Creating..." : "Signup" })] }), error && (_jsx("p", { style: { color: "red", marginTop: "15px" }, children: error }))] }));
}
