"use client";

import { useCallback, useState } from "react";
import { fetchApiJson, notifySuccess } from "@/lib/api/client";
import type { OptionItem, OptionItemInput, OptionItemUpdate } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";

type OptionItemsResponse = { items: OptionItem[] };
type OptionItemActionResponse = {
  message?: string;
};

type OptionItemAction = "fetch" | "create" | "update" | "delete";

export function useOptionItems() {
  const { t } = useLocale();
  const [items, setItems] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<OptionItemAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActionResponse = useCallback(
    (response: OptionItemActionResponse) => {
      if (typeof response.message === "string") {
        notifySuccess(response.message);
      }
    },
    [],
  );

  const fetchItems = useCallback(
    async (groupId: number) => {
      setAction("fetch");
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemsResponse>(
          `/api/menu/option-group/${groupId}/option-items`,
          { cache: "no-store" },
        );
        setItems(response.items ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.loadItemsFailed");
        setError(message);
      } finally {
        setLoading(false);
        setAction(null);
      }
    },
    [t],
  );

  const createItem = useCallback(
    async (payload: OptionItemInput) => {
      setAction("create");
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemActionResponse>("/api/menu/option-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        handleActionResponse(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.createItemFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  const updateItem = useCallback(
    async (id: number, payload: OptionItemUpdate) => {
      setAction("update");
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemActionResponse>(`/api/menu/option-item/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        handleActionResponse(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.updateItemFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  const deleteItem = useCallback(
    async (id: number) => {
      setAction("delete");
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemActionResponse>(`/api/menu/option-item/${id}`, {
          method: "DELETE",
        });
        handleActionResponse(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.deleteItemFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  return {
    items,
    loading,
    error,
    action,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
