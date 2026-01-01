"use client";

import { useCallback, useEffect, useState } from "react";
import type { Topic } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import {
  RESTAURANT_ID_CHANGE_EVENT,
  fetchJson,
  getStoredRestaurantId,
} from "@/lib/api/client";

type TopicComboboxResponse = {
  items?: unknown;
  data?: unknown;
};

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

function readLabel(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function mapComboboxTopics(data: unknown): Topic[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = readNumber(
        record.value ??
          record.id ??
          record.topic_id ??
          record.menu_topic_id ??
          record.code ??
          record.text
      );
      if (id === null) {
        return null;
      }
      const name =
        readLabel(
          record.text ??
            record.name ??
            record.title ??
            record.slug ??
            record.value ??
            record.id
        ) ?? String(id);
      return { id, name };
    })
    .filter(Boolean) as Topic[];
}

function extractComboboxTopics(payload: TopicComboboxResponse): Topic[] {
  if (Array.isArray(payload.items)) {
    return mapComboboxTopics(payload.items);
  }
  if (Array.isArray(payload.data)) {
    return mapComboboxTopics(payload.data);
  }
  if (payload.data && typeof payload.data === "object") {
    const dataRecord = payload.data as Record<string, unknown>;
    if (Array.isArray(dataRecord.items)) {
      return mapComboboxTopics(dataRecord.items);
    }
    if (Array.isArray(dataRecord.data)) {
      return mapComboboxTopics(dataRecord.data);
    }
  }
  return [];
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

export function useTopicCombobox({ autoFetch = true } = {}) {
  const { t } = useLocale();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(() =>
    getStoredRestaurantId()
  );

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchJson<TopicComboboxResponse>(
        "/api/menu/topics/combobox",
        { cache: "no-store" }
      );
      setTopics(extractComboboxTopics(response));
    } catch (err) {
      setError(resolveTopicErrorMessage(err, t("topics.errors.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const handleRestaurantChange = () => {
      setRestaurantId(getStoredRestaurantId());
    };
    if (typeof window !== "undefined") {
      window.addEventListener(RESTAURANT_ID_CHANGE_EVENT, handleRestaurantChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(RESTAURANT_ID_CHANGE_EVENT, handleRestaurantChange);
      }
    };
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchTopics();
    }
  }, [autoFetch, fetchTopics, restaurantId]);

  return {
    topics,
    loading,
    error,
    fetchTopics,
  };
}
