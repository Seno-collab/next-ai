"use client";

import { ConfigProvider, theme as antdTheme } from "antd";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const STORAGE_KEY = "next-ai-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  const stored = globalThis.window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return globalThis.window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type ThemeProviderProps = Readonly<{ children: React.ReactNode }>;

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode,
      toggle: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  useEffect(() => {
    const nextMode = getInitialMode();
    setMode(nextMode);
  }, []);

  useEffect(() => {
    globalThis.window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeConfigProvider({ children }: ThemeProviderProps) {
  const { isDark } = useTheme();

  const themeConfig = useMemo(
    () => ({
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: "#1677ff",
        borderRadius: 12,
      },
      components: {
        Menu: {
          darkItemBg: "transparent",
          darkSubMenuItemBg: "transparent",
          itemSelectedBg: isDark ? "rgba(255, 255, 255, 0.08)" : undefined,
        },
      },
    }),
    [isDark],
  );

  return <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("ThemeProvider is missing");
  }
  return context;
}
