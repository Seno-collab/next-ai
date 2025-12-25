"use client";

import AntdRegistry from "@/components/AntdRegistry";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { ThemeConfigProvider, ThemeProvider } from "@/theme/ThemeProvider";
import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showToast = pathname !== "/login";

  return (
    <LocaleProvider>
      <ThemeProvider>
        <AntdRegistry>
          <ThemeConfigProvider>
            {children}
            {showToast && (
              <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                pauseOnHover
                draggable
                theme="dark"
                limit={3}
              />
            )}
          </ThemeConfigProvider>
        </AntdRegistry>
      </ThemeProvider>
    </LocaleProvider>
  );
}
