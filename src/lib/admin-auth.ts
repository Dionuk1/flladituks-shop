// Mbrojtje e thjeshtë e adminit. ⚠️ Ky fjalëkalim ruhet në kod —
// për një projekt personal është i mjaftueshëm. Ndryshoje këtu kur dëshiron.
export const ADMIN_PASSWORD = "flladitu2026";
const KEY = "flladituks_admin";

export function isAdmin() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function loginAdmin(password: string) {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function logoutAdmin() {
  localStorage.removeItem(KEY);
}
