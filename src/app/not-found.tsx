"use client";

import { Button, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph, Text } = Typography;

export default function NotFound() {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="error-shell">
      <div className="error-backdrop" />
      <div className="error-grid">
        <div className="error-panel">
          <Text className="error-eyebrow">{t("errors.label")}</Text>
          <div className="error-code">{t("errors.notFound.code")}</div>
          <Title level={2} className="error-title">
            {t("errors.notFound.title")}
          </Title>
          <Paragraph className="error-subtitle">{t("errors.notFound.subtitle")}</Paragraph>
          <Space size="middle" className="error-actions" wrap>
            <Button
              type="primary"
              size="large"
              className="error-primary"
              onClick={() => router.push("/")}
            >
              {t("errors.notFound.primaryCta")}
            </Button>
            <Button
              size="large"
              className="error-secondary"
              onClick={() => router.push("/login")}
            >
              {t("errors.notFound.secondaryCta")}
            </Button>
          </Space>
          <Text className="error-meta">{t("errors.notFound.meta")}</Text>
        </div>
        <div className="error-visual">
          <div className="error-visual-orb" />
          <div className="error-visual-card">
            <div className="error-visual-label">{t("errors.notFound.visualLabel")}</div>
            <div className="error-visual-value">{t("errors.notFound.visualValue")}</div>
            <div className="error-visual-detail">{t("errors.notFound.visualDetail")}</div>
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
