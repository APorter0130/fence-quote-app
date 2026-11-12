import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminPasswordMatches,
  adminSessionToken,
} from "../../../../lib/admin-auth";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";

export async function POST(req: NextRequest) {
  const backToLogin = (reason: string) =>
    NextResponse.redirect(new URL(`/admin/login?error=${reason}`, req.url), 303);

  if (!rateLimit(`admin-login:${clientIp(req)}`, 6, 10 * 60 * 1000)) {
    return backToLogin("rate");
  }

  let password: FormDataEntryValue | null = null;

  try {
    const form = await req.formData();
    password = form.get("password");
  } catch {
    return backToLogin("1");
  }

  if (typeof password !== "string" || !adminPasswordMatches(password)) {
    return backToLogin("1");
  }

  const response = NextResponse.redirect(new URL("/admin", req.url), 303);

  response.cookies.set({
    name: ADMIN_COOKIE,
    value: adminSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
