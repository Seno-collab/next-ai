"use client";

import type {
  OptionGroup,
  OptionGroupInput,
  OptionGroupUpdate,
} from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { fetchApiJson, notifyError, notifySuccess } from "@/lib/api/client";
import { useCallback, useState } from "react";

type OptionGroupsResponse = { groups: OptionGroup[] };
type OptionGroupActionResponse = {
  message?: string;
  response_code?: string | number;
};

type OptionGroupAction = "fetch" | "create" | "update" | "delete";

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

export function useOptionGroups() {
  const { t } = useLocale();
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<OptionGroupAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActionResponse = useCallback(
    (response: OptionGroupActionResponse, fallbackMessage: string) => {
      const responseCode = parseResponseCode(response.response_code);
      if (responseCode !== null && responseCode !== 200) {
        const message =
          typeof response.message === "string"
            ? response.message
            : fallbackMessage;
        notifyError(message);
        throw new Error(message);
      }
      if (typeof response.message === "string") {
        notifySuccess(response.message);
      }
    },
    []
  );

  const fetchGroups = useCallback(
    async (menuItemId: number) => {
      setAction("fetch");
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApiJson<OptionGroupsResponse>(
          `/api/menu/item/${menuItemId}/option-groups`,
          { cache: "no-store" }
        );
        setGroups(response.groups ?? []);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("variants.errors.loadGroupsFailed");
        setError(message);
      } finally {
        setLoading(false);
        setAction(null);
      }
    },
    [t]
  );

  const createGroup = useCallback(
    async (payload: OptionGroupInput) => {
      setAction("create");
      setError(null);
      try {
        const response = await fetchApiJson<OptionGroupActionResponse>(
          "/api/menu/option-group",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        handleActionResponse(response, t("variants.errors.createGroupFailed"));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("variants.errors.createGroupFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t]
  );

  const updateGroup = useCallback(
    async (id: number, payload: OptionGroupUpdate) => {
      setAction("update");
      setError(null);
      try {
        const response = await fetchApiJson<OptionGroupActionResponse>(
          `/api/menu/option-group/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        handleActionResponse(response, t("variants.errors.updateGroupFailed"));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("variants.errors.updateGroupFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t]
  );

  const deleteGroup = useCallback(
    async (id: number) => {
      setAction("delete");
      setError(null);
      try {
        const response = await fetchApiJson<OptionGroupActionResponse>(
          `/api/menu/option-group/${id}`,
          {
            method: "DELETE",
          }
        );
        handleActionResponse(response, t("variants.errors.deleteGroupFailed"));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("variants.errors.deleteGroupFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t]
  );

  return {
    groups,
    loading,
    error,
    action,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}
