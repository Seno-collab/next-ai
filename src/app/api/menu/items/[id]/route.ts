import { NextResponse } from "next/server";
import { deleteMenuItem, updateMenuItem } from "@/features/menu/server/menuStore";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";

export const PATCH = withApiLogging(async (request: Request, { params }: { params: { id: string } }) => {
  const t = createTranslator(getRequestLocale(request));
  try {
    const payload = await request.json();
    const item = updateMenuItem(params.id, payload);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("menu.errors.updateFailed") },
      { status: 400 },
    );
  }
});

export const DELETE = withApiLogging(async (request: Request, { params }: { params: { id: string } }) => {
  const t = createTranslator(getRequestLocale(request));
  try {
    deleteMenuItem(params.id);
    return NextResponse.json({ message: t("menu.success.delete") });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("menu.errors.deleteFailed") },
      { status: 400 },
    );
  }
});
