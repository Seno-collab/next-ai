import { listMenuItems } from "@/features/menu/server/menuStore";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";
import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      ["true", "1", "yes", "y", "on", "active", "enabled"].includes(normalized)
    ) {
      return true;
    }
    if (
      ["false", "0", "no", "n", "off", "inactive", "disabled"].includes(
        normalized
      )
    ) {
      return false;
    }
  }
  return null;
}

export const POST = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  let payload: TokenRecord = {};
  try {
    payload = (await request.json()) as TokenRecord;
  } catch {
    return NextResponse.json(
      { message: t("menu.errors.loadFailed") },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const shouldProxy = API_BASE_URL && API_BASE_URL !== origin;

  if (shouldProxy) {
    const authHeader = resolveAuthHeader(request);
    const restaurantHeader = resolveRestaurantHeader(request);
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "x-locale": locale,
    };
    if (authHeader) {
      headers.authorization = authHeader;
    }
    if (restaurantHeader) {
      headers["X-Restaurant-ID"] = restaurantHeader;
    }
    const response = await fetch(`${API_BASE_URL}/api/menu/items/search`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as TokenRecord;
    const responseCode = parseResponseCode(data.response_code);
    const responseCodeError = responseCode !== null && responseCode >= 400;
    if (!response.ok || responseCodeError) {
      const status = response.ok ? responseCode ?? 400 : response.status;
      const message =
        typeof data.message === "string"
          ? t(data.message)
          : response.statusText || t("menu.errors.loadFailed");
      return NextResponse.json(
        { message, response_code: responseCode ?? response.status },
        { status }
      );
    }

    return NextResponse.json(data);
  }

  const category =
    typeof payload.category === "string" ? payload.category.trim() : "";
  const filter =
    typeof payload.filter === "string"
      ? payload.filter.trim().toLowerCase()
      : "";
  const isActive = readBoolean(payload.is_active);
  const limit = readNumber(payload.limit);
  const page = readNumber(payload.page);

  let data = listMenuItems();
  if (category) {
    data = data.filter((item) => item.category === category);
  }
  if (typeof isActive === "boolean") {
    data = data.filter((item) => item.available === isActive);
  }
  if (filter) {
    data = data.filter((item) => {
      const name = t(item.name).toLowerCase();
      const description = item.description
        ? t(item.description).toLowerCase()
        : "";
      const sku = item.sku ? item.sku.toLowerCase() : "";
      return (
        name.includes(filter) ||
        description.includes(filter) ||
        sku.includes(filter)
      );
    });
  }

  const totalItems = data.length;
  const safeLimit =
    limit && limit > 0 ? limit : totalItems > 0 ? totalItems : 1;
  const pageIndex = page !== null && page >= 0 ? page : 0;
  const totalPages =
    safeLimit > 0 ? Math.max(1, Math.ceil(totalItems / safeLimit)) : 1;
  const start = pageIndex * safeLimit;
  const items = data.slice(start, start + safeLimit);

  return NextResponse.json({
    data: {
      items,
      limit: safeLimit,
      page: pageIndex + 1,
      total_items: totalItems,
      total_pages: totalPages,
    },
    message: "OK",
    response_code: 200,
  });
});
