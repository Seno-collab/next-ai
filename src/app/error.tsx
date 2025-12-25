"use client";

import { useEffect } from "react";
import { Button, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph, Text } = Typography;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-shell">
      <div className="error-backdrop" />
      <div className="error-grid">
        <div className="error-panel">
          <Text className="error-eyebrow">{t("errors.label")}</Text>
          <div className="error-code">{t("errors.server.code")}</div>
          <Title level={2} className="error-title">
            {t("errors.server.title")}
          </Title>
          <Paragraph className="error-subtitle">{t("errors.server.subtitle")}</Paragraph>
          <Space size="middle" className="error-actions" wrap>
            <Button type="primary" size="large" className="error-primary" onClick={() => reset()}>
              {t("errors.server.primaryCta")}
            </Button>
            <Button size="large" className="error-secondary" onClick={() => router.push("/")}>
              {t("errors.server.secondaryCta")}
            </Button>
          </Space>
          <Text className="error-meta">{t("errors.server.meta")}</Text>
        </div>
        <div className="error-visual">
          <div className="error-visual-orb" />
          <div className="error-visual-card">
            <div className="error-visual-label">{t("errors.server.visualLabel")}</div>
            <div className="error-visual-value">{t("errors.server.visualValue")}</div>
            <div className="error-visual-detail">{t("errors.server.visualDetail")}</div>
            <div className="error-visual-bars">
              <span className="error-bar" />
              <span className="error-bar" />
              <span className="error-bar" />
              <span className="error-bar" />
              <span className="error-bar" />
              <span className="error-bar" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
