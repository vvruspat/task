export type Locale = "en" | "ru";
export type LocalePreference = Locale | "system";

export const localeCookieName = "task_locale";

export function resolveLocale(preference: LocalePreference, systemLanguage: string): Locale {
  if (preference !== "system") return preference;
  return systemLanguage.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function parseLocalePreference(value: string | undefined): LocalePreference {
  return value === "en" || value === "ru" ? value : "system";
}
