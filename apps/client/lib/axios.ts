import axios from "axios";

/**
 * Shared axios instance. Same-origin by default (Next API routes), with the
 * base URL overridable via env for other environments. Credentials are sent so
 * the Better Auth session cookie rides along on authenticated endpoints.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});