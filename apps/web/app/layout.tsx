import "@task/ui/styles.css";
import "./workspace.css";
import { Theme } from "@radix-ui/themes";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { I18nProvider } from "../lib/i18n/i18n";
import { localeCookieName, parseLocalePreference, resolveLocale } from "../lib/i18n/locale";

export const metadata: Metadata = { title: "tAsk" };

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const preference = parseLocalePreference(cookieStore.get(localeCookieName)?.value);
  const locale = resolveLocale(preference, requestHeaders.get("accept-language") ?? "en");
  return (
    <html lang={locale}>
      <Theme asChild accentColor="indigo" grayColor="gray" radius="small">
        <body>
          <I18nProvider initialLocale={locale} initialPreference={preference}>
            {children}
          </I18nProvider>
        </body>
      </Theme>
    </html>
  );
}
