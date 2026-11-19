import { createAuthClient } from "better-auth/react";

// Browser-side auth. Use it in "use client" components.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
