"use client";

import {
  StyleProvider,
  createCache,
  extractStyle,
} from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";

type StyleCache = ReturnType<typeof createCache>;

export default function AntdRegistry({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cache] = useState<StyleCache>(() => createCache());

  useServerInsertedHTML(() => (
    <style
      id="antd"
      dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
    />
  ));

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
