"use client";

import QrCodeScene from "@/features/admin/components/QrCodeScene";

export default function AuthQrBackground() {
  return (
    <div className="auth-qr-background" aria-hidden="true">
      <div className="auth-qr-glow" />
      <QrCodeScene />
    </div>
  );
}
