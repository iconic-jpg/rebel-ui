
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthError {
  detail?: string;
  error?: string;
  message?: string;
}

const AUTH_API = (
  import.meta.env.VITE_AUTH_API_URL ||
  "https://r3bel-ue0h.onrender.com"
).replace(/\/+$/, "");

async function request(
  path: string,
  body: Record<string, string>
): Promise<AuthTokens> {
  const response = await fetch(`${AUTH_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data: AuthTokens & AuthError = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const message =
      data.detail ||
      data.error ||
      data.message ||
      "Authentication request failed.";

    throw new Error(message);
  }

  return data;
}

export function loginWithEmail(
  email: string,
  password: string
): Promise<AuthTokens> {
  return request("/api/token/", {
    username: email.trim().toLowerCase(),
    password,
  });
}

export function registerAccount(
  username: string,
  email: string,
  password: string
): Promise<AuthTokens> {
  return request("/api/signup/", {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
}

export function refreshSession(
  refresh: string
): Promise<AuthTokens> {
  return request("/api/token/refresh/", { refresh });
}

export { AUTH_API };
