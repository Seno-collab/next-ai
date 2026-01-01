import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";
import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const API_RESTAURANTS_PATH = "/api/restaurants/combobox";

type TokenRecord = Record<string, unknown>;
type RestaurantItem = { id: string | number; name: string };

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

function readRecord(value: unknown): TokenRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as TokenRecord;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readIdValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : trimmed;
  }
  return null;
}

function isNumericLike(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 && Number.isFinite(Number(trimmed));
  }
  return false;
}

function readRestaurantId(record: TokenRecord) {
  const idValue =
    record.id ?? record.restaurant_id ?? record.restaurantId ?? record.code;
  return readIdValue(idValue);
}

function mapRestaurant(record: TokenRecord): RestaurantItem | null {
  const textRaw = record.text;
  const valueRaw = record.value;
  const textLabel = readString(textRaw);
  const valueLabel = readString(valueRaw);
  const textNumeric = isNumericLike(textRaw);
  const valueNumeric = isNumericLike(valueRaw);
  let idCandidate = readRestaurantId(record);
  let nameCandidate: string | null = null;

  if (
    idCandidate === null &&
    (textRaw !== undefined || valueRaw !== undefined)
  ) {
    if (textNumeric && !valueNumeric) {
      idCandidate = readIdValue(textRaw);
      nameCandidate = valueLabel ?? textLabel;
    } else {
      idCandidate = readIdValue(valueRaw ?? textRaw);
      nameCandidate = textLabel ?? valueLabel;
    }
  }

  if (idCandidate === null) {
    return null;
  }

  const name =
    nameCandidate ??
    valueLabel ??
    textLabel ??
    readString(record.name ?? record.title ?? record.restaurant_name) ??
    String(idCandidate);
  return { id: idCandidate, name };
}

function extractRestaurantItems(payload: unknown): RestaurantItem[] {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload
      .map((item) => mapRestaurant(item as TokenRecord))
      .filter(Boolean) as RestaurantItem[];
  }
  if (typeof payload !== "object") {
    return [];
  }
  const record = payload as TokenRecord;
  const dataRecord = readRecord(record.data);
  const dataArray = Array.isArray(record.data)
    ? (record.data as TokenRecord[])
    : null;
  const candidates = [
    record.items,
    record.restaurants,
    dataRecord?.items,
    dataRecord?.restaurants,
    dataRecord?.list,
    dataArray,
  ].filter(Boolean);
  const list = candidates.find((item) => Array.isArray(item)) as
    | TokenRecord[]
    | undefined;
  if (!list) {
    return [];
  }
  return list
    .map((item) => mapRestaurant(item))
    .filter(Boolean) as RestaurantItem[];
}

function buildProxyUrl(request: NextRequest) {
  const targetUrl = new URL(`${API_BASE_URL}${API_RESTAURANTS_PATH}`);
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
    const response = await fetch(buildProxyUrl(request), {
      headers: {
        "x-locale": locale,
        ...(authHeader ? { authorization: authHeader } : {}),
      },
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
      return NextResponse.json({ message }, { status });
    }

    const items = extractRestaurantItems(data);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : t("menu.errors.loadFailed"),
      },
      { status: 502 }
    );
  }
});
