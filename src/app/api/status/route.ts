import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const GET = withApiLogging(async () => {
  const simulatedLatency = Math.floor(Math.random() * 120) + 80;
  await wait(simulatedLatency);

  return NextResponse.json({
    status: "ok",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    latencyMs: simulatedLatency,
    notes: "Base Next.js API route responding with diagnostic data.",
  });
});
