"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { type Locale, type LocalePreference, localeCookieName, resolveLocale } from "./locale";
import { en, type MessageKey, ru } from "./messages";

export type { Locale, LocalePreference } from "./locale";

export type MessageValues = Readonly<Record<string, string | number>>;

type I18nContextValue = {
  locale: Locale;
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
  t: (key: MessageKey, values?: MessageValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);
export function I18nProvider({
  children,
  initialLocale,
  initialPreference,
}: Readonly<{
  children: ReactNode;
  initialLocale: Locale;
  initialPreference: LocalePreference;
}>): ReactNode {
  const [preference, setPreferenceState] = useState(initialPreference);
  const [locale, setLocale] = useState(initialLocale);

  useEffect(() => {
    if (preference !== "system") return;
    setLocale(resolveLocale(preference, navigator.language));
  }, [preference]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      preference,
      setPreference(nextPreference: LocalePreference): void {
        setPreferenceState(nextPreference);
        const nextLocale = resolveLocale(nextPreference, navigator.language);
        setLocale(nextLocale);
        // biome-ignore lint/suspicious/noDocumentCookie: this preference must work in browsers without Cookie Store support.
        document.cookie = `${localeCookieName}=${nextPreference}; Path=/; Max-Age=31536000; SameSite=Lax`;
      },
      t(key: MessageKey, values?: MessageValues): string {
        const template = (locale === "ru" ? ru : en)[key];
        if (values === undefined) return template;
        return template.replace(/\{\{(\w+)\}\}/gu, (match, name: string): string => {
          const value = values[name];
          return value === undefined ? match : String(value);
        });
      },
    }),
    [locale, preference],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (value === null) throw new Error("useI18n must be used inside I18nProvider.");
  return value;
}

export function T({ id, values }: Readonly<{ id: MessageKey; values?: MessageValues }>): ReactNode {
  const { t } = useI18n();
  return t(id, values);
}
