import { Injectable } from "@nestjs/common";
import { loadApiConfig } from "../config.js";

export type TelegramBrowserConnectConfig = {
  botToken: string | null;
  webAppUrl: string | null;
};

@Injectable()
export class TelegramBrowserConnectConfigProvider {
  private readonly config: TelegramBrowserConnectConfig;

  constructor() {
    const apiConfig = loadApiConfig();
    this.config = {
      botToken: apiConfig.telegramMiniApp?.botToken ?? null,
      webAppUrl: apiConfig.webAppUrl,
    };
  }

  getConfig(): TelegramBrowserConnectConfig {
    return this.config;
  }
}
