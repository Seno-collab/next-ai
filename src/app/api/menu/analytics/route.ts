import { NextResponse } from "next/server";
import { getMenuAnalytics } from "@/features/menu/server/menuStore";
import { withApiLogging } from "@/lib/api/withApiLogging";

export const GET = withApiLogging(async () => {
  const analytics = getMenuAnalytics();
  return NextResponse.json({ analytics });
});
