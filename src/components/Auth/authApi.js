const AUTH_API = (import.meta.env.VITE_AUTH_API_URL ||
    "https://r3bel-ue0h.onrender.com").replace(/\/+$/, "");
async function request(path, body) {
    const response = await fetch(`${AUTH_API}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
    });
    const data = await response
        .json()
        .catch(() => ({}));
    if (!response.ok) {
        const message = data.detail ||
            data.error ||
            data.message ||
            "Authentication request failed.";
        throw new Error(message);
    }
    return data;
}
export function loginWithEmail(email, password) {
    return request("/api/token/", {
        username: email.trim().toLowerCase(),
        password,
    });
}
export function registerAccount(username, email, password) {
    return request("/api/signup/", {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
    });
}
export function refreshSession(refresh) {
    return request("/api/token/refresh/", { refresh });
}
export { AUTH_API };
