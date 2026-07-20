import "@task/ui/styles.css";
import "./workspace.css";
import { Theme } from "@radix-ui/themes";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "tAsk", description: "Product workspace" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html lang="ru">
      <Theme asChild accentColor="indigo" grayColor="gray" radius="small">
        <body>{children}</body>
      </Theme>
    </html>
  );
}
