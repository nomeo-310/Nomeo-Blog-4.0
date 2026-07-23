// lib/axios.ts  (admin dashboard)
import axios from "axios";

/**
 * Shared Axios instance for the admin dashboard.
 * Automatically sends credentials (session cookie) with every request.
 * Base URL defaults to the current origin so relative paths work in both
 * development and production without any configuration.
 */
const api = axios.create({
  baseURL:         "/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export { api };