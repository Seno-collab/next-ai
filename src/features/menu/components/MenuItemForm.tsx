"use client";

import Image from "next/image";
import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Select, Space, Switch } from "antd";
import type { FormInstance } from "antd";
import { useRef, useState } from "react";
import { menuCategories } from "@/features/menu/constants";
import { useLocale } from "@/hooks/useLocale";
import { fetchJson } from "@/lib/api/client";

export type MenuItemFormValues = {
  name: string;
  description?: string;
  category: string;
  price: number;
  available: boolean;
  imageUrl?: string;
};

type MenuItemFormProps = {
  form: FormInstance<MenuItemFormValues>;
  onSubmit: (values: MenuItemFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
};

export function MenuItemForm({ form, onSubmit, onCancel, submitLabel, loading = false }: MenuItemFormProps) {
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageUrl = Form.useWatch("imageUrl", form);
  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const isSubmitting = loading || uploading;

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetchJson<{ url: string }>("/api/menu/upload", {
        method: "POST",
        body: formData,
      });
      form.setFieldsValue({ imageUrl: response.url });
    } catch {
      // Error toast is already handled by fetchJson.
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        label={t("menu.form.name")}
        name="name"
        rules={[{ required: true, message: t("menu.form.name") }]}
      >
        <Input placeholder={t("menu.form.namePlaceholder")} />
      </Form.Item>
      <Form.Item label={t("menu.form.description")} name="description">
        <Input.TextArea rows={3} placeholder={t("menu.form.descriptionPlaceholder")} />
      </Form.Item>
      <Form.Item
        label={t("menu.form.category")}
        name="category"
        rules={[{ required: true, message: t("menu.form.category") }]}
      >
        <Select
          options={menuCategories.map((category) => ({
            value: category.value,
            label: t(category.labelKey),
          }))}
        />
      </Form.Item>
      <Form.Item
        label={t("menu.form.price")}
        name="price"
        rules={[{ required: true, message: t("menu.form.price") }]}
      >
        <Space.Compact style={{ width: "100%" }}>
          <InputNumber min={0} style={{ width: "100%" }} />
          <div className="menu-price-addon">VND</div>
        </Space.Compact>
      </Form.Item>
      <Form.Item label={t("menu.form.image")} name="imageUrl">
        <Input placeholder={t("menu.form.imagePlaceholder")} type="url" allowClear />
      </Form.Item>
      <Space size="small" wrap>
        <Button icon={<UploadOutlined />} onClick={handlePickFile} loading={uploading} disabled={loading}>
          {t("menu.form.imageUpload")}
        </Button>
        <Button
          onClick={() => form.setFieldsValue({ imageUrl: "" })}
          disabled={!trimmedImageUrl || isSubmitting}
        >
          {t("menu.form.imageRemove")}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />
      </Space>
      {trimmedImageUrl && (
        <div className="menu-image-preview">
          <Image
            src={trimmedImageUrl}
            alt={t("menu.form.image")}
            fill
            sizes="(max-width: 768px) 100vw, 480px"
          />
        </div>
      )}
      <Form.Item label={t("menu.form.available")} name="available" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>{t("menu.form.cancel")}</Button>
        <Button type="primary" htmlType="submit" loading={loading} disabled={uploading}>
          {submitLabel}
        </Button>
      </Space>
    </Form>
  );
}
