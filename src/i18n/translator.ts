import { defaultLocale, messages, type Locale } from "@/i18n/messages";

export function resolveLocale(localeHeader?: string | null): Locale {
  if (!localeHeader) {
    return defaultLocale;
  }
  const normalized = localeHeader.trim().toLowerCase();
  if (normalized === "vi" || normalized === "en") {
    return normalized;
  }
  const primary = normalized.split(",")[0]?.trim();
  if (primary?.startsWith("vi")) {
    return "vi";
  }
  if (primary?.startsWith("en")) {
    return "en";
  }
  return defaultLocale;
}

export function getRequestLocale(request: Request): Locale {
  return resolveLocale(
    request.headers.get("x-locale") ?? request.headers.get("accept-language")
  );
}

export function createTranslator(locale: Locale) {
  return (key: string) => {
    const parts = key.split(".");
    let current: unknown = messages[locale];
    for (const part of parts) {
      if (typeof current !== "object" || current === null) {
        return key;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === "string" ? current : key;
  };
}
