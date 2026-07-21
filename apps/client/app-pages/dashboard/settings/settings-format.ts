import { api } from "@/lib/axios";

/** Fetches the signed-in user's full profile (used by the Profile and Account tabs). */
export async function fetchProfile() {
  const { data } = await api.get("/api/profile/me");
  return data;
}

/** Fetches the signed-in user's settings blob (used by the Notifications and Appearance tabs). */
export async function fetchSettings() {
  const { data } = await api.get("/api/settings");
  return data.settings ?? {};
}
