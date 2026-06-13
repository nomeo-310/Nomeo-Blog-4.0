import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { createAuth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL!,
  cookiePrefix: "client",
  plugins: [
    emailOTPClient(),
    inferAdditionalFields<ReturnType<typeof createAuth>>(),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;