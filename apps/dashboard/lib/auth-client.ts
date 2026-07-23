import { createAuthClient } from "better-auth/react";
import { customSessionClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { createAuth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL!,
  cookiePrefix: "admin",
  plugins: [
    inferAdditionalFields<ReturnType<typeof createAuth>>(),
    customSessionClient<ReturnType<typeof createAuth>>(),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;