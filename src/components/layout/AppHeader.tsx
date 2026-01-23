"use client";

import dynamic from "next/dynamic";
import { CloudSyncOutlined } from "@ant-design/icons";
import { Button, Flex, Layout, Segmented, Space, Typography } from "antd";
import { siteConfig } from "@/config/site";
import { useLocale } from "@/hooks/useLocale";

const { Header } = Layout;
const { Text, Title } = Typography;

// Dynamic import for Three.js component (no SSR)
const HeaderScene = dynamic(() => import("./HeaderScene"), {
  ssr: false,
  loading: () => <div className="header-scene-loading" />,
});

type AppHeaderProps = {
  onRefresh: () => void;
  loading?: boolean;
};

export default function AppHeader({ onRefresh, loading = false }: Readonly<AppHeaderProps>) {
  const { locale, setLocale, t } = useLocale();

  return (
    <Header
      className="app-header-3d"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(2, 8, 23, 0.85)",
        backdropFilter: "blur(12px)",
        paddingInline: 32,
        overflow: "hidden",
      }}
    >
      {/* Three.js Background */}
      <div className="header-scene-container">
        <HeaderScene />
      </div>

      {/* Content */}
      <Flex vertical style={{ position: "relative", zIndex: 2 }}>
        <Text style={{ color: "#8da2fb", letterSpacing: 1, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          {t(siteConfig.nameKey)}
        </Text>
        <Title level={4} style={{ color: "white", margin: 0, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
          {t(siteConfig.taglineKey)}
        </Title>
      </Flex>
      <Space size="middle" style={{ position: "relative", zIndex: 2 }}>
        <Segmented
          size="middle"
          name="app-header-locale-toggle"
          options={[
            { label: "VI", value: "vi" },
            { label: "EN", value: "en" },
          ]}
          value={locale}
          onChange={(value) => setLocale(value as "vi" | "en")}
        />
        <Button
          type="primary"
          size="large"
          icon={<CloudSyncOutlined />}
          loading={loading}
          onClick={onRefresh}
        >
          {t(siteConfig.actions.refreshLabelKey)}
        </Button>
      </Space>
    </Header>
  );
}
