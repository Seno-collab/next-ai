export const AUTH_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * By default cookies are secure only in production. In some environments
 * (e.g. local testing with a production build running on http://localhost)
 * we need to allow overriding this so the auth cookie is sent.
 *
 * Set AUTH_COOKIE_SECURE=false in .env.local when running a prod build over HTTP.
 */
const AUTH_COOKIE_SECURE =
  process.env.AUTH_COOKIE_SECURE === "true"
    ? true
    : process.env.AUTH_COOKIE_SECURE === "false"
      ? false
      : process.env.NODE_ENV === "production";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: AUTH_COOKIE_SECURE,
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE,
};
