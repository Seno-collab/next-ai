"use client";

import { useCallback, useState } from "react";
import { fetchApiJson, notifyError, notifySuccess } from "@/lib/api/client";
import type { Topic, TopicInput, TopicUpdate } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";

type TopicsResponse = { items: Topic[] };
type TopicActionResponse = {
  message?: string;
  response_code?: string | number;
};

type TopicAction = "fetch" | "create" | "update" | "delete";

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

export function useTopics() {
  const { t } = useLocale();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<TopicAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActionResponse = useCallback(
    (response: TopicActionResponse, fallbackMessage: string) => {
      const responseCode = parseResponseCode(response.response_code);
      if (responseCode !== null && responseCode !== 200) {
        const message = typeof response.message === "string" ? response.message : fallbackMessage;
        notifyError(message);
        throw new Error(message);
      }
      if (typeof response.message === "string") {
        notifySuccess(response.message);
      }
    },
    [],
  );

  const fetchTopics = useCallback(
    async (restaurantId: number) => {
      setAction("fetch");
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApiJson<TopicsResponse>(
          `/api/menu/restaurant/topics?restaurant_id=${restaurantId}`,
          { cache: "no-store" },
        );
        setTopics(response.items ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("topics.errors.loadFailed");
        setError(message);
      } finally {
        setLoading(false);
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  const createTopic = useCallback(
    async (payload: TopicInput) => {
      setAction("create");
      setError(null);
      try {
        const response = await fetchApiJson<TopicActionResponse>("/api/menu/topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        handleActionResponse(response, t("topics.errors.createFailed"));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("topics.errors.createFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  const updateTopic = useCallback(
    async (id: number, payload: TopicUpdate) => {
      setAction("update");
      setError(null);
      try {
        const response = await fetchApiJson<TopicActionResponse>(`/api/menu/topic/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        handleActionResponse(response, t("topics.errors.updateFailed"));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("topics.errors.updateFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [t],
  );

  const deleteTopic = useCallback(
    async (id: number) => {
      setAction("delete");
      setError(null);
      try {
        const response = await fetchApiJson<TopicActionResponse>(`/api/menu/topic/${id}`, { method: "DELETE" });
        handleActionResponse(response, t("topics.errors.deleteFailed"));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("topics.errors.deleteFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  return {
    topics,
    loading,
    error,
    action,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
  };
}
