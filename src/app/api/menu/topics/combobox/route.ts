import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";
import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const API_TOPICS_COMBOBOX_PATH = "/api/menu/topics/combobox";

type TokenRecord = Record<string, unknown>;

function resolveAuthHeader(request: NextRequest) {
  const headerToken = request.headers.get("authorization");
  if (headerToken) {
    return headerToken;
  }
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return null;
  }
  return `Bearer ${cookieToken}`;
}

function resolveRestaurantHeader(request: NextRequest) {
  const headerValue = request.headers.get("x-restaurant-id");
  if (!headerValue) {
    return null;
  }
  const trimmed = headerValue.trim();
  return trimmed ? trimmed : null;
}

function parseResponseCode(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildProxyUrl(request: NextRequest) {
  const targetUrl = new URL(`${API_BASE_URL}${API_TOPICS_COMBOBOX_PATH}`);
  targetUrl.search = new URL(request.url).search;
  return targetUrl.toString();
}

export const GET = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  const origin = new URL(request.url).origin;

  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ items: [] });
  }

  try {
    const authHeader = resolveAuthHeader(request);
    const restaurantHeader = resolveRestaurantHeader(request);
    const headers: HeadersInit = { "x-locale": locale };
    if (authHeader) {
      headers.authorization = authHeader;
    }
    if (restaurantHeader) {
      headers["X-Restaurant-ID"] = restaurantHeader;
    }

    const response = await fetch(buildProxyUrl(request), { headers });
    const data = (await response.json().catch(() => ({}))) as TokenRecord;
    const responseCode = parseResponseCode(data.response_code);
    const responseCodeError = responseCode !== null && responseCode >= 400;

    if (!response.ok || responseCodeError) {
      const status = response.ok ? responseCode ?? 400 : response.status;
      const message =
        typeof data.message === "string"
          ? t(data.message)
          : response.statusText || t("topics.errors.loadFailed");
      return NextResponse.json(
        { message, response_code: responseCode ?? response.status },
        { status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : t("topics.errors.loadFailed"),
      },
      { status: 502 }
    );
  }
});
