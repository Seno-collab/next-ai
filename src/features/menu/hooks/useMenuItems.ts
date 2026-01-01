"use client";

import type {
  MenuItem,
  MenuItemInput,
  MenuItemUpdate,
} from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { fetchApiJson, fetchJson, notifyError } from "@/lib/api/client";
import { useCallback, useEffect, useState } from "react";

type MenuItemsResponse = { items: MenuItem[] };

type MenuItemResponse = { item: MenuItem };

type MenuAction =
  | "fetch"
  | "search"
  | "create"
  | "update"
  | "delete"
  | "toggle";

type MenuItemsRefreshPayload =
  | MenuItemsResponse
  | MenuItem[]
  | { data?: unknown }
  | Record<string, unknown>;

type MenuSearchParams = {
  category?: string;
  filter?: string;
  isActive?: boolean;
  limit?: number;
  page?: number;
};

type MenuSearchResponse = {
  items?: unknown[];
  data?: {
    items?: unknown[];
    limit?: number;
    page?: number;
    total_items?: number;
    total_pages?: number;
    totalItems?: number;
    totalPages?: number;
    data?: unknown;
  } | null;
  message?: string;
  response_code?: string | number;
};

type MenuSearchMeta = {
  limit: number | null;
  page: number | null;
  totalItems: number | null;
  totalPages: number | null;
};

type MenuItemRecord = Record<string, unknown>;

const MENU_ITEM_SEARCH_PATH = "/api/menu/items/search";

type UseMenuItemsOptions = {
  autoFetch?: boolean;
};

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

function readRecord(value: unknown): MenuItemRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as MenuItemRecord;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
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

function mapTypeToCategory(type: string) {
  switch (type) {
    case "beverage":
      return "coffee";
    case "dish":
      return "food";
    case "combo":
      return "combo";
    case "extra":
      return "other";
    default:
      return "other";
  }
}

function readMenuItemId(record: MenuItemRecord) {
  const idValue =
    record.id ?? record.menu_item_id ?? record.item_id ?? record.menuItemId;
  if (typeof idValue === "string" && idValue.trim()) {
    return idValue;
  }
  if (typeof idValue === "number" && Number.isFinite(idValue)) {
    return String(idValue);
  }
  return null;
}

function mapMenuItemRecord(record: MenuItemRecord): MenuItem | null {
  const id = readMenuItemId(record);
  if (!id) {
    return null;
  }
  const name = readString(record.name ?? record.title) ?? "";
  const description =
    readString(record.description ?? record.desc ?? record.detail) ?? "";
  const typeValue = readString(record.type);
  const category =
    readString(record.category ?? record.category_code) ??
    (typeValue ? mapTypeToCategory(typeValue) : "other");
  const price =
    readNumber(
      record.price ??
        record.price_value ??
        record.price_vnd ??
        record.priceValue
    ) ?? 0;
  const sku = readString(record.sku ?? record.sku_code ?? record.code) ?? "";
  const topicId = readNumber(
    record.topic_id ?? record.topicId ?? record.menu_topic_id
  );
  const available =
    readBoolean(
      record.available ??
        record.is_available ??
        record.is_active ??
        record.active ??
        record.status
    ) ?? true;
  const imageUrl =
    readString(
      record.image_url ??
        record.imageUrl ??
        record.image ??
        record.thumbnail_url
    ) ?? "";
  const createdAt =
    readString(record.created_at ?? record.createdAt) ??
    new Date().toISOString();
  const updatedAt =
    readString(record.updated_at ?? record.updatedAt) ?? createdAt;

  return {
    id,
    name,
    description: description || undefined,
    category,
    price,
    sku: sku || undefined,
    topicId: topicId ?? undefined,
    available,
    imageUrl: imageUrl || undefined,
    createdAt,
    updatedAt,
  };
}

function extractMenuItems(payload: unknown): MenuItem[] | null {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return payload
      .map((item) => mapMenuItemRecord(item as MenuItemRecord))
      .filter(Boolean) as MenuItem[];
  }
  if (typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) {
    return record.items
      .map((item) => mapMenuItemRecord(item as MenuItemRecord))
      .filter(Boolean) as MenuItem[];
  }
  if (Array.isArray(record.data)) {
    return record.data
      .map((item) => mapMenuItemRecord(item as MenuItemRecord))
      .filter(Boolean) as MenuItem[];
  }
  if (record.data && typeof record.data === "object") {
    const dataRecord = record.data as Record<string, unknown>;
    if (Array.isArray(dataRecord.items)) {
      return dataRecord.items
        .map((item) => mapMenuItemRecord(item as MenuItemRecord))
        .filter(Boolean) as MenuItem[];
    }
    if (Array.isArray(dataRecord.data)) {
      return dataRecord.data
        .map((item) => mapMenuItemRecord(item as MenuItemRecord))
        .filter(Boolean) as MenuItem[];
    }
    if (dataRecord.data && typeof dataRecord.data === "object") {
      const nestedRecord = dataRecord.data as Record<string, unknown>;
      if (Array.isArray(nestedRecord.items)) {
        return nestedRecord.items
          .map((item) => mapMenuItemRecord(item as MenuItemRecord))
          .filter(Boolean) as MenuItem[];
      }
    }
  }
  return null;
}

function extractMenuSearchItems(payload: MenuSearchResponse) {
  const direct = extractMenuItems(payload);
  if (direct !== null) {
    return direct;
  }
  const nested = extractMenuItems(payload.data);
  if (nested !== null) {
    return nested;
  }
  const dataRecord = readRecord(payload.data);
  const deepNested = extractMenuItems(dataRecord?.data);
  return deepNested ?? [];
}

export function useMenuItems(options: UseMenuItemsOptions = {}) {
  const { t } = useLocale();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<MenuAction | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchMeta, setSearchMeta] = useState<MenuSearchMeta | null>(null);

  const fetchItems = useCallback(async () => {
    setAction("fetch");
    setLoading(true);
    setError(null);
    try {
      const response = await fetchJson<MenuItemsResponse>("/api/menu/items", {
        cache: "no-store",
      });
      setItems(response.items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("menu.errors.loadFailed");
      setError(message);
    } finally {
      setLoading(false);
      setAction(null);
    }
  }, [t]);

  const createItem = useCallback(
    async (payload: MenuItemInput) => {
      setAction("create");
      setError(null);
      try {
        const response = await fetchJson<MenuItemResponse>("/api/menu/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        let refreshed = false;
        try {
          const refreshedPayload = await fetchApiJson<MenuItemsRefreshPayload>(
            "/menu/restaurant/items",
            { cache: "no-store" }
          );
          const refreshedItems = extractMenuItems(refreshedPayload);
          if (refreshedItems !== null) {
            setItems(refreshedItems);
            refreshed = true;
          }
        } catch {
          // Ignore refresh errors; fallback to local optimistic update.
        }
        if (!refreshed) {
          setItems((prev) => [response.item, ...prev]);
        }
        return response.item;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.createFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [t]
  );

  const searchItems = useCallback(
    async (params: MenuSearchParams = {}) => {
      setAction("search");
      setLoading(true);
      setError(null);
      const payload: Record<string, unknown> = {};
      const filter = params.filter?.trim();
      if (filter) {
        payload.filter = filter;
      }
      if (params.category) {
        payload.category = params.category;
      }
      if (typeof params.isActive === "boolean") {
        payload.is_active = params.isActive;
      }
      if (typeof params.limit === "number") {
        payload.limit = params.limit;
      }
      if (typeof params.page === "number") {
        payload.page = params.page;
      }
      try {
        const response = await fetchJson<MenuSearchResponse>(
          MENU_ITEM_SEARCH_PATH,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const responseCode = parseResponseCode(response.response_code);
        if (responseCode !== null && responseCode !== 200) {
          const message =
            typeof response.message === "string"
              ? response.message
              : t("menu.errors.loadFailed");
          notifyError(message);
          setError(message);
          return;
        }
        const nextItems = extractMenuSearchItems(response);
        setItems(nextItems);
        const dataRecord = readRecord(response.data);
        const nestedDataRecord = readRecord(dataRecord?.data);
        const metaSource = nestedDataRecord ?? dataRecord;
        setSearchMeta({
          limit: readNumber(metaSource?.limit) ?? null,
          page: readNumber(metaSource?.page) ?? null,
          totalItems:
            readNumber(metaSource?.total_items ?? metaSource?.totalItems) ??
            null,
          totalPages:
            readNumber(metaSource?.total_pages ?? metaSource?.totalPages) ??
            null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.loadFailed");
        setError(message);
      } finally {
        setLoading(false);
        setAction(null);
      }
    },
    [t]
  );

  const updateItem = useCallback(
    async (id: string, payload: MenuItemUpdate) => {
      setAction("update");
      setPendingId(id);
      setError(null);
      try {
        const response = await fetchJson<MenuItemResponse>(
          `/api/menu/items/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        setItems((prev) =>
          prev.map((item) => (item.id === id ? response.item : item))
        );
        return response.item;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.updateFailed");
        setError(message);
        throw err;
      } finally {
        setPendingId(null);
        setAction(null);
      }
    },
    [t]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      setAction("delete");
      setPendingId(id);
      setError(null);
      try {
        await fetchJson<{ message: string }>(`/api/menu/items/${id}`, {
          method: "DELETE",
        });
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.deleteFailed");
        setError(message);
        throw err;
      } finally {
        setPendingId(null);
        setAction(null);
      }
    },
    [t]
  );

  const toggleAvailability = useCallback(
    async (id: string, available: boolean) => {
      setAction("toggle");
      setPendingId(id);
      setError(null);
      try {
        const response = await fetchJson<MenuItemResponse>(
          `/api/menu/items/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ available }),
          }
        );
        setItems((prev) =>
          prev.map((item) => (item.id === id ? response.item : item))
        );
        return response.item;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("menu.errors.updateStatusFailed");
        setError(message);
        throw err;
      } finally {
        setPendingId(null);
        setAction(null);
      }
    },
    [t]
  );

  const autoFetch = options.autoFetch !== false;

  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    fetchItems();
  }, [autoFetch, fetchItems]);

  return {
    items,
    loading,
    error,
    action,
    fetchItems,
    searchItems,
    createItem,
    updateItem,
    deleteItem,
    toggleAvailability,
    pendingId,
    searchMeta,
  };
}
