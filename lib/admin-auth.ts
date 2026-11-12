import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

const MIN_PASSWORD_LENGTH = 12;

/**
 * The admin console is protected by one shared password kept in the ADMIN_PASSWORD
 * environment variable. If it is missing or shorter than 12 characters, nobody can
 * sign in (fail closed).
 */
function configuredPassword() {
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";

  return password.length >= MIN_PASSWORD_LENGTH ? password : "";
}

/** Value stored in the session cookie. Changing ADMIN_PASSWORD signs everyone out. */
export function adminSessionToken() {
  const password = configuredPassword();

  if (!password) {
    return "";
  }

  return crypto
    .createHmac("sha256", password)
    .update("fence-quote-admin-session-v1")
    .digest("hex");
}

export function adminPasswordMatches(input: string) {
  const password = configuredPassword();

  if (!password) {
    return false;
  }

  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(password).digest();

  return crypto.timingSafeEqual(a, b);
}

export async function isAdminAuthed() {
  const expected = adminSessionToken();

  if (!expected) {
    return false;
  }

  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value ?? "";

  if (value.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
