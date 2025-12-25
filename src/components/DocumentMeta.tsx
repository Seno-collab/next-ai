"use client";

import { useEffect } from "react";
import { useLocale } from "@/hooks/useLocale";

export default function DocumentMeta() {
  const { t, locale } = useLocale();

  useEffect(() => {
    const title = t("site.name");
    const description = t("site.tagline");
    if (title) {
      document.title = title;
    }
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag && description) {
      descriptionTag.setAttribute("content", description);
    }
    document.documentElement.lang = locale;
  }, [locale, t]);

  return null;
}
