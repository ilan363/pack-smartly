import type { AuthErrorCode } from "@/lib/i18n/translations-dynamic";

export function mapFirebaseAuthError(error: unknown): AuthErrorCode {
  const code =
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (
    code === "auth/invalid-email" ||
    code === "auth/missing-email" ||
    code === "auth/missing-password"
  ) {
    if (code === "auth/missing-password") return "auth.err.missing_credentials";
    return "auth.err.invalid_email";
  }
  if (code === "auth/user-not-found") return "auth.err.user_not_found";
  if (code === "auth/wrong-password") return "auth.err.wrong_password";
  if (code === "auth/email-already-in-use") {
    return "auth.err.email_already_registered";
  }
  if (code === "auth/weak-password") return "auth.err.password_too_short";
  return "auth.err.invalid_credentials";
}
