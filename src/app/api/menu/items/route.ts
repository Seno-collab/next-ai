import { createMenuItem, listMenuItems } from "@/features/menu/server/menuStore";
import { NextRequest, NextResponse } from "next/server";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

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

function mapCategoryToType(category: string) {
  switch (category) {
    case "coffee":
    case "tea":
      return "beverage";
    case "dessert":
    case "food":
      return "dish";
    case "combo":
      return "combo";
    default:
      return "extra";
  }
}

export const GET = withApiLogging(async () => {
  const items = listMenuItems();
  return NextResponse.json({ items });
});

export const POST = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  try {
    const payload = await request.json();
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) {
      return NextResponse.json({ message: t("menu.errors.nameRequired") }, { status: 400 });
    }
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ message: t("menu.errors.priceInvalid") }, { status: 400 });
    }
    const description = typeof payload.description === "string" ? payload.description.trim() : "";
    const category = typeof payload.category === "string" && payload.category ? payload.category : "other";
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
    const available = typeof payload.available === "boolean" ? payload.available : true;

    const origin = new URL(request.url).origin;
    const shouldProxy = API_BASE_URL && API_BASE_URL !== origin;

    if (shouldProxy) {
      const createPayload: Record<string, unknown> = {
        name,
        description: description || undefined,
        price,
        image_url: imageUrl || undefined,
        type: mapCategoryToType(category),
      };

      const topicIdRaw = payload.topicId ?? payload.topic_id;
      const topicId = Number(topicIdRaw);
      if (Number.isFinite(topicId)) {
        createPayload.topic_id = topicId;
      }

      const authHeader = resolveAuthHeader(request);
      const headers: HeadersInit = { "Content-Type": "application/json", "x-locale": locale };
      if (authHeader) {
        headers.authorization = authHeader;
      }

      const response = await fetch(`${API_BASE_URL}/api/menu/item`, {
        method: "POST",
        headers,
        body: JSON.stringify(createPayload),
      });

      const data = (await response.json().catch(() => ({}))) as TokenRecord;
      const responseCode = parseResponseCode(data.response_code);
      const responseCodeError = responseCode !== null && responseCode >= 400;

      if (!response.ok || responseCodeError) {
        const status = response.ok ? responseCode ?? 400 : response.status;
        const message =
          typeof data.message === "string" ? t(data.message) : response.statusText || t("menu.errors.createFailed");
        return NextResponse.json({ message }, { status });
      }
    }

    const item = createMenuItem({
      name,
      description,
      category,
      price,
      available,
      imageUrl,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("menu.errors.createFailed") },
      { status: 400 },
    );
  }
});
