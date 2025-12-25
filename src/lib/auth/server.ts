export const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE,
};
