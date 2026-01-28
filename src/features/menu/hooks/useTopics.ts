"use client";

import type { Topic, TopicInput, TopicUpdate } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { fetchApiJson, notifySuccess } from "@/lib/api/client";
import { useCallback, useEffect, useState } from "react";

type TopicsResponse = {
  items?: Topic[];
  data?: {
    items?: Topic[];
    page?: number;
    limit?: number;
    total_items?: number;
    total_pages?: number;
  } | null;
};
type TopicActionResponse = {
  message?: string;
};
type TopicQueryParams = {
  name?: string;
  page?: number;
  limit?: number;
};

type TopicAction = "fetch" | "create" | "update" | "delete";

function buildTopicsQuery(params?: TopicQueryParams) {
  const searchParams = new URLSearchParams();
  const name = params?.name?.trim() ?? "";
  const page =
    typeof params?.page === "number" && params.page > 0 ? params.page : 1;
  const limit =
    typeof params?.limit === "number" && params.limit > 0 ? params.limit : 20;
  if (name) {
    searchParams.set("name", name);
  }
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function resolveTopicErrorMessage(err: unknown, fallback: string) {
  if (!(err instanceof Error)) {
    return fallback;
  }
  const message = err.message?.trim();
  if (!message) {
    return fallback;
  }
  const normalized = message.toLowerCase();
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  ) {
    return fallback;
  }
  return message;
}

function extractTopics(payload: TopicsResponse) {
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  if (payload.data && Array.isArray(payload.data.items)) {
    return payload.data.items;
  }
  return [];
}

export function useTopics() {
  const { t } = useLocale();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<TopicAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActionResponse = useCallback(
    (response: TopicActionResponse) => {
      if (typeof response.message === "string") {
        notifySuccess(response.message);
      }
    },
    []
  );

  const fetchTopics = useCallback(async (params?: TopicQueryParams) => {
    setAction("fetch");
    setLoading(true);
    setError(null);
    try {
      const query = buildTopicsQuery(params);
      const response = await fetchApiJson<TopicsResponse>(
        `/api/menu/topics/search${query}`,
        { cache: "no-store" }
      );
      setTopics(extractTopics(response));
    } catch (err) {
      const message = resolveTopicErrorMessage(
        err,
        t("topics.errors.loadFailed")
      );
      setError(message);
    } finally {
      setLoading(false);
      setAction(null);
    }
  }, [t]);

  const createTopic = useCallback(
    async (payload: TopicInput) => {
      setAction("create");
      setError(null);
      try {
        const response = await fetchApiJson<TopicActionResponse>(
          "/menu/topics",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        handleActionResponse(response);
      } catch (err) {
        const message = resolveTopicErrorMessage(
          err,
          t("topics.errors.createFailed")
        );
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t]
  );

  const updateTopic = useCallback(
    async (id: number, payload: TopicUpdate) => {
      setAction("update");
      setError(null);
      try {
        const response = await fetchApiJson<TopicActionResponse>(
          `/menu/topics/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        handleActionResponse(response);
      } catch (err) {
        const message = resolveTopicErrorMessage(
          err,
          t("topics.errors.updateFailed")
        );
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t]
  );

  const deleteTopic = useCallback(
    async (id: number) => {
      setAction("delete");
      setError(null);
      try {
        const response = await fetchApiJson<TopicActionResponse>(
          `/menu/topics/${id}`,
          { method: "DELETE" }
        );
        handleActionResponse(response);
      } catch (err) {
        const message = resolveTopicErrorMessage(
          err,
          t("topics.errors.deleteFailed")
        );
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t]
  );

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

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
