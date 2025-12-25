"use client";

import Link from "next/link";
import { QrcodeOutlined } from "@ant-design/icons";
import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { useLocale } from "@/hooks/useLocale";
import QrCodeScene from "@/features/admin/components/QrCodeScene";

const { Title, Paragraph, Text } = Typography;

export function AdminHero() {
  const { t } = useLocale();

  return (
    <Card className="glass-card hero-card dashboard-hero-card" variant="borderless">
      <Row gutter={[32, 32]} align="middle">
        <Col xs={24} lg={14}>
          <Space orientation="vertical" size="middle">
            <Tag className="neon-tag dashboard-badge">{t("adminHero.badge")}</Tag>
            <Title level={2} className="dashboard-hero-title">
              {t("adminHero.title")}
            </Title>
            <Paragraph className="dashboard-hero-subtitle">{t("adminHero.subtitle")}</Paragraph>
            <Space size="middle" wrap>
              <Link href="/menu">
                <Button type="primary" size="large" icon={<QrcodeOutlined />} className="dashboard-primary-button">
                  {t("adminHero.primaryAction")}
                </Button>
              </Link>
            </Space>
            <Text type="secondary" className="dashboard-hero-note">
              {t("adminHero.note")}
            </Text>
          </Space>
        </Col>
        <Col xs={24} lg={10}>
          <div className="qr-stack">
            <div className="qr-scene">
              <div className="qr-ambient" />
              <div className="qr-frame" />
              <QrCodeScene />
              <div className="qr-logo-label">QR MENU</div>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
