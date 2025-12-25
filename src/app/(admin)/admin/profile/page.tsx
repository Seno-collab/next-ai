"use client";

import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Space, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/client";
import { useLocale } from "@/hooks/useLocale";
import type { AuthPublicUser } from "@/features/auth/types";

const { Title, Paragraph, Text } = Typography;

type ProfileFormValues = {
  name: string;
  email: string;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileResponse = {
  user?: AuthPublicUser | null;
  message?: string;
};

export default function ProfilePage() {
  const { t } = useLocale();
  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<AuthPublicUser | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await fetchJson<ProfileResponse>("/api/auth/profile", { cache: "no-store" });
      const user = response.user ?? null;
      setProfileUser(user);
      profileForm.setFieldsValue({
        name: user?.name ?? "",
        email: user?.email ?? "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.errors.profileFailed");
      setProfileError(message);
    } finally {
      setProfileLoading(false);
    }
  }, [profileForm, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      await fetchJson<ProfileResponse>("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name }),
      });
      setProfileSuccess(t("profile.success.update"));
      await loadProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.errors.profileUpdateFailed");
      setProfileError(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await fetchJson<{ message?: string }>("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      setPasswordSuccess(t("profile.success.password"));
      passwordForm.resetFields();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.errors.changePasswordFailed");
      setPasswordError(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const profileInitial = (profileUser?.name?.trim() || profileUser?.email?.trim() || "QR").charAt(0).toUpperCase();

  return (
    <Space orientation="vertical" size="large" className="profile-page">
      <Card variant="borderless" className="glass-card profile-hero" loading={profileLoading}>
        <div className="profile-hero-content">
          <Avatar size={72} className="profile-avatar">
            {profileInitial}
          </Avatar>
          <div className="profile-hero-text">
            <Title level={3} className="profile-hero-title">
              {t("profile.title")}
            </Title>
            <Paragraph type="secondary" className="profile-hero-subtitle">
              {t("profile.subtitle")}
            </Paragraph>
            <div className="profile-hero-meta">
              <span className="profile-meta-item">
                {t("auth.nameLabel")}: {profileUser?.name || "--"}
              </span>
              <span className="profile-meta-item">
                {t("auth.emailLabel")}: {profileUser?.email || "--"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[24, 24]} className="profile-grid">
        <Col xs={24} lg={12}>
          <Card variant="borderless" className="glass-card profile-card">
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={4} className="profile-section-title">
                  {t("profile.infoTitle")}
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {t("profile.infoSubtitle")}
                </Paragraph>
              </div>
              <Form form={profileForm} layout="vertical" onFinish={handleProfileSubmit} className="profile-form">
                <Form.Item
                  label={t("auth.nameLabel")}
                  name="name"
                  rules={[{ required: true, message: t("auth.nameLabel") }]}
                >
                  <Input placeholder={t("auth.namePlaceholder")} />
                </Form.Item>
                <Form.Item label={t("auth.emailLabel")} name="email">
                  <Input disabled />
                </Form.Item>
                <Space className="profile-actions">
                  <Button type="primary" htmlType="submit" loading={profileSaving}>
                    {t("profile.save")}
                  </Button>
                </Space>
              </Form>
              {profileSuccess && <Alert title={profileSuccess} type="success" showIcon className="profile-alert" />}
              {profileError && <Alert title={profileError} type="error" showIcon className="profile-alert" />}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card variant="borderless" className="glass-card profile-card">
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={4} className="profile-section-title">
                  {t("profile.passwordTitle")}
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {t("profile.passwordSubtitle")}
                </Paragraph>
              </div>
              <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit} className="profile-form">
                <Form.Item
                  label={t("profile.currentPassword")}
                  name="currentPassword"
                  rules={[{ required: true, message: t("profile.currentPassword") }]}
                >
                  <Input.Password placeholder={t("auth.currentPasswordPlaceholder")} />
                </Form.Item>
                <Form.Item
                  label={t("profile.newPassword")}
                  name="newPassword"
                  rules={[{ required: true, message: t("profile.newPassword") }]}
                >
                  <Input.Password placeholder={t("auth.newPasswordPlaceholder")} />
                </Form.Item>
                <Form.Item
                  label={t("profile.confirmPassword")}
                  name="confirmPassword"
                  dependencies={["newPassword"]}
                  rules={[
                    { required: true, message: t("profile.confirmPassword") },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("newPassword") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(t("profile.passwordMismatch")));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder={t("auth.newPasswordPlaceholder")} />
                </Form.Item>
                <Space className="profile-actions">
                  <Button type="primary" htmlType="submit" loading={passwordSaving}>
                    {t("profile.updatePassword")}
                  </Button>
                </Space>
              </Form>
              {passwordSuccess && <Alert title={passwordSuccess} type="success" showIcon className="profile-alert" />}
              {passwordError && <Alert title={passwordError} type="error" showIcon className="profile-alert" />}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
