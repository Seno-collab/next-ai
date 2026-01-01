"use client";

import { useLocale } from "@/hooks/useLocale";
import { useRestaurantSelect } from "@/features/admin/hooks/useRestaurantSelect";
import { Card, Select, Space, Typography } from "antd";

const { Text } = Typography;

export function RestaurantSelectCard() {
  const { t } = useLocale();
  const { options, loading, error, value, handleChange, filterOption } =
    useRestaurantSelect();

  return (
    <Card title={t("login.restaurantLabel")} variant="borderless" className="glass-card">
      <Space orientation="vertical" size="small" style={{ width: "100%" }}>
        <Select
          allowClear
          showSearch
          value={value}
          placeholder={t("login.restaurantPlaceholder")}
          options={options}
          loading={loading}
          filterOption={filterOption}
          aria-label={t("login.restaurantLabel")}
          onChange={handleChange}
          style={{ width: "100%" }}
        />
        {error && <Text type="danger">{error}</Text>}
      </Space>
    </Card>
  );
}
