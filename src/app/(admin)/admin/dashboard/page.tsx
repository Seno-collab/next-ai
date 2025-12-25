"use client";

import { MenuAnalyticsPanel } from "@/features/menu/components/MenuAnalyticsPanel";
import { useMenuAnalytics } from "@/features/menu/hooks/useMenuAnalytics";
import { AdminHero } from "@/features/admin/components/AdminHero";

export default function AdminDashboardPage() {
  const { data, loading, error } = useMenuAnalytics();

  return (
    <div className="dashboard-shell">
      <section className="dashboard-section">
        <AdminHero />
      </section>
      <section className="dashboard-section dashboard-section-analytics">
        <MenuAnalyticsPanel data={data} loading={loading} error={error} />
      </section>
    </div>
  );
}
