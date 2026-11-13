/**
 * Local email/password for Better Auth.
 * Reset links are issued by our own hashed-token flow, not Better Auth's
 * plaintext verification rows. See src/lib/auth/account-store.ts.
 */
import { emailAndPasswordEnabled } from "./email-password";
import { hashPassword, verifyStoredPassword } from "./password-crypto";

export const emailAndPassword = emailAndPasswordEnabled
  ? {
      enabled: true as const,
      revokeSessionsOnPasswordReset: true,
      minPasswordLength: 8,
      password: {
        hash: (password: string) => hashPassword(password),
        verify: ({ hash, password }: { hash: string; password: string }) => verifyStoredPassword(hash, password),
      },
    }
  : null;
