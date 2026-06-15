// Sesioni i adminit verifikohet në server. Tokeni ruhet në sessionStorage.
import { adminLogin } from "./admin.functions";

const KEY = "flladituks_admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function isAdmin() {
  return !!getAdminToken();
}

export async function loginAdmin(password: string): Promise<boolean> {
  try {
    const res = await adminLogin({ data: { password } });
    sessionStorage.setItem(KEY, res.token);
    return true;
  } catch {
    return false;
  }
}

export function logoutAdmin() {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}

export function requireToken(): string {
  const t = getAdminToken();
  if (!t) throw new Error("Sesioni ka skaduar. Hyni përsëri.");
  return t;
}
