import type { ReactNode } from "react";
import { TelegramBrowserConnect } from "../../../../components/telegram-browser-connect";

export default async function TelegramConnectPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>): Promise<ReactNode> {
  const { token } = await params;
  return <TelegramBrowserConnect token={token} />;
}
