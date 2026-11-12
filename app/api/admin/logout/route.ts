import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "../../../../lib/admin-auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", req.url), 303);

  response.cookies.set({
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
