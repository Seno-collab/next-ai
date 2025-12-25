import { toast } from "react-toastify";

const isBrowser = typeof globalThis.window !== "undefined";
const toastCooldownMs = 1200;
const lastToastByMessage = new Map<string, number>();
const LOCALE_STORAGE_KEY = "next-ai-locale";
const AUTH_TOKENS_STORAGE_KEY = "next-ai-auth-tokens";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const AUTH_REFRESH_PATH = "/api/auth/refresh-token";
let refreshPromise: Promise<StoredAuthTokens | null> | null = null;

type ToastKind = "error" | "success" | "warning";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
};

type TokenRecord = Record<string, unknown>;

async function getErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) {
        return payload.message;
      }
      return JSON.stringify(payload);
    } catch {
      return response.statusText;
    }
  }

  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

function notify(kind: ToastKind, message: string) {
  if (isBrowser) {
    const now = Date.now();
    const key = `${kind}:${message}`;
    const lastShown = lastToastByMessage.get(key) ?? 0;
    if (now - lastShown < toastCooldownMs) {
      return;
    }
    lastToastByMessage.set(key, now);
    if (lastToastByMessage.size > 50) {
      lastToastByMessage.clear();
    }
    const toastId = `${kind}:${message}`;
    if (kind === "success") {
      toast.success(message, { toastId });
      return;
    }
    if (kind === "warning") {
      toast.warning(message, { toastId });
      return;
    }
    toast.error(message, { toastId });
  }
}

export function getStoredAuthTokens(): StoredAuthTokens | null {
  if (!isBrowser) {
    return null;
  }
  const raw = globalThis.window.localStorage.getItem(AUTH_TOKENS_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthTokens>;
    if (typeof parsed?.accessToken !== "string" || typeof parsed?.refreshToken !== "string") {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresIn: typeof parsed.expiresIn === "number" ? parsed.expiresIn : undefined,
    };
  } catch {
    return null;
  }
}

export function setStoredAuthTokens(tokens: StoredAuthTokens | null) {
  if (!isBrowser) {
    return;
  }
  if (!tokens) {
    globalThis.window.localStorage.removeItem(AUTH_TOKENS_STORAGE_KEY);
    return;
  }
  globalThis.window.localStorage.setItem(AUTH_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
}

function extractStoredTokens(payload: unknown): StoredAuthTokens | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as TokenRecord;
  const sources: TokenRecord[] = [];
  if (record.data && typeof record.data === "object") {
    sources.push(record.data as TokenRecord);
  }
  if (record.tokens && typeof record.tokens === "object") {
    sources.push(record.tokens as TokenRecord);
  }
  sources.push(record);

  const readString = (value: unknown) => (typeof value === "string" ? value : undefined);
  const readNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

  for (const source of sources) {
    const accessToken = readString(source.accessToken ?? source.access_token);
    const refreshToken = readString(source.refreshToken ?? source.refresh_token);
    if (accessToken && refreshToken) {
      return {
        accessToken,
        refreshToken,
        expiresIn: readNumber(source.expiresIn ?? source.expires_in),
      };
    }
  }

  return null;
}

function withAuthHeader(init: RequestInit | undefined, accessToken: string) {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  return { ...init, headers };
}

function withLocaleHeader(init?: RequestInit) {
  if (!isBrowser) {
    return init;
  }
  const headers = new Headers(init?.headers);
  const storedLocale = globalThis.window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (storedLocale === "vi" || storedLocale === "en") {
    headers.set("x-locale", storedLocale);
  }
  const tokens = getStoredAuthTokens();
  if (tokens?.accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${tokens.accessToken}`);
  }
  return { ...init, headers };
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function isRefreshRequest(input: RequestInfo | URL) {
  const url = resolveRequestUrl(input);
  return url.includes(AUTH_REFRESH_PATH);
}

async function refreshAuthTokens(): Promise<StoredAuthTokens | null> {
  if (!isBrowser) {
    return null;
  }
  const stored = getStoredAuthTokens();
  if (!stored?.refreshToken) {
    return null;
  }
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    try {
      const initWithLocale = withLocaleHeader({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });
      const headers = new Headers(initWithLocale?.headers);
      headers.delete("authorization");
      const response = await fetch(AUTH_REFRESH_PATH, { ...initWithLocale, headers });
      if (!response.ok) {
        setStoredAuthTokens(null);
        return null;
      }
      const data = (await response.json().catch(() => ({}))) as TokenRecord;
      const tokens = extractStoredTokens(data);
      if (!tokens) {
        setStoredAuthTokens(null);
        return null;
      }
      setStoredAuthTokens(tokens);
      return tokens;
    } catch {
      setStoredAuthTokens(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export function notifySuccess(message: string) {
  notify("success", message);
}

export function notifyWarning(message: string) {
  notify("warning", message);
}

export function notifyError(message: string) {
  notify("error", message);
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(input, withLocaleHeader(init));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    notifyError(message);
    throw new Error(message);
  }

  if (!response.ok) {
    const canRefresh =
      isBrowser &&
      (response.status === 401 || response.status === 403) &&
      !isRefreshRequest(input) &&
      Boolean(getStoredAuthTokens()?.refreshToken);
    if (canRefresh) {
      const refreshed = await refreshAuthTokens();
      if (refreshed?.accessToken) {
        const retryResponse = await fetch(input, withLocaleHeader(withAuthHeader(init, refreshed.accessToken)));
        if (retryResponse.ok) {
          return (await retryResponse.json()) as T;
        }
        const retryMessage = await getErrorMessage(retryResponse);
        notifyError(retryMessage);
        throw new Error(retryMessage);
      }
    }
    const message = await getErrorMessage(response);
    notifyError(message);
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function resolveApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!API_BASE_URL) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function fetchApiJson<T>(path: string, init?: RequestInit) {
  return fetchJson<T>(resolveApiUrl(path), init);
}
