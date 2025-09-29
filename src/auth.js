// Autenticación local mínima (sin backend, sin perfiles)
const SESSION_KEY = "auth.session";
const FIXED_PASSWORD = "alfayomega2025";

export async function verifyPassword(password) {
  return password === FIXED_PASSWORD;
}

export function startSession() {
  sessionStorage.setItem(SESSION_KEY, "true");
}

export function endSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}
