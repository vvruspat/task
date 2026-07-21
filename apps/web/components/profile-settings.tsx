"use client";

import { Box, Button, Callout, Card, Flex, Heading, Select, Text, TextField } from "@task/ui";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { type LocalePreference, useI18n } from "../lib/i18n/i18n";

type ProfileUser = {
  id: string;
  displayName: string;
  email: string;
  locale: "en" | "ru" | null;
};

export function ProfileSettings(): ReactNode {
  const { setPreference, t } = useI18n();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState<LocalePreference>("system");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response): Promise<unknown> => response.json())
      .then((value) => {
        const loaded = readProfileUser(value);
        if (loaded === null) return;
        setUser(loaded);
        setDisplayName(loaded.displayName);
        setLocale(loaded.locale ?? "system");
        setPreference(loaded.locale ?? "system");
      });
  }, [setPreference]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/auth/profile", {
        body: JSON.stringify({ displayName, locale: locale === "system" ? null : locale }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body: unknown = await response.json().catch((): null => null);
      const updated = readProfileUser(body);
      if (!response.ok || updated === null) throw new Error("profile_update_failed");
      setUser(updated);
      setDisplayName(updated.displayName);
      setLocale(updated.locale ?? "system");
      setPreference(updated.locale ?? "system");
      setFeedback({ error: false, message: t("profile.saved") });
    } catch {
      setFeedback({ error: true, message: t("profile.saveError") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Flex direction="column" gap="4" p="5">
      <div>
        <Heading size="6">{t("profile.title")}</Heading>
        <Text color="gray">{t("profile.subtitle")}</Text>
      </div>
      <Box maxWidth="640px" width="100%">
        <Card size="3">
          <form onSubmit={(event) => void submit(event)}>
            <Flex direction="column" gap="4">
              <div>
                <Text as="div" size="2" weight="medium">
                  <label htmlFor="profile-display-name">{t("profile.displayName")}</label>
                </Text>
                <TextField.Root
                  autoComplete="name"
                  disabled={user === null}
                  id="profile-display-name"
                  maxLength={100}
                  required
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
              <div>
                <Text as="div" size="2" weight="medium">
                  <label htmlFor="profile-email">{t("common.email")}</label>
                </Text>
                <TextField.Root disabled id="profile-email" value={user?.email ?? ""} />
              </div>
              <div>
                <Text as="div" size="2" weight="medium">
                  <label htmlFor="profile-language">{t("profile.language")}</label>
                </Text>
                <Select.Root value={locale} onValueChange={readLocalePreference(setLocale)}>
                  <Select.Trigger id="profile-language" />
                  <Select.Content>
                    <Select.Item value="system">{t("profile.languageSystem")}</Select.Item>
                    <Select.Item value="en">{t("profile.languageEnglish")}</Select.Item>
                    <Select.Item value="ru">{t("profile.languageRussian")}</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Text as="div" color="gray" size="1">
                  {t("profile.languageHint")}
                </Text>
              </div>
              {feedback !== null && (
                <Callout.Root color={feedback.error ? "red" : "green"}>
                  <Callout.Text>{feedback.message}</Callout.Text>
                </Callout.Root>
              )}
              <Button disabled={saving || user === null} type="submit">
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </Flex>
          </form>
        </Card>
      </Box>
    </Flex>
  );
}

function readLocalePreference(
  setLocale: (locale: LocalePreference) => void,
): (value: string) => void {
  return (value: string): void => {
    if (value === "system" || value === "en" || value === "ru") setLocale(value);
  };
}

function readProfileUser(value: unknown): ProfileUser | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = "user" in value ? value.user : value;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !("id" in candidate) ||
    typeof candidate.id !== "string" ||
    !("displayName" in candidate) ||
    typeof candidate.displayName !== "string" ||
    !("email" in candidate) ||
    typeof candidate.email !== "string" ||
    !("locale" in candidate) ||
    (candidate.locale !== null && candidate.locale !== "en" && candidate.locale !== "ru")
  )
    return null;
  return {
    id: candidate.id,
    displayName: candidate.displayName,
    email: candidate.email,
    locale: candidate.locale,
  };
}
