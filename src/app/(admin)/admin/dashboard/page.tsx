"use client";

import { Col, Row } from "antd";
import { AdminHero } from "@/features/admin/components/AdminHero";
import { RestaurantSelectCard } from "@/features/admin/components/RestaurantSelectCard";
import { MenuAnalyticsPanel } from "@/features/menu/components/MenuAnalyticsPanel";
import { useMenuAnalytics } from "@/features/menu/hooks/useMenuAnalytics";

export default function AdminDashboardPage() {
  const { data, loading, error } = useMenuAnalytics();

  return (
    <div className="dashboard-shell">
      <section className="dashboard-section">
        <AdminHero />
      </section>
      <section className="dashboard-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12} xl={8}>
            <RestaurantSelectCard />
          </Col>
        </Row>
      </section>
      <section className="dashboard-section dashboard-section-analytics">
        <MenuAnalyticsPanel data={data} loading={loading} error={error} />
      </section>
    </div>
  );
}
