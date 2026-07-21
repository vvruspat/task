"use client";

import { Box, Button, Card, Flex, Heading, Text, TextField, Link as UiLink } from "@task/ui";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";

type AuthFormProps = { mode: "login" | "register" };

export function AuthForm({ mode }: AuthFormProps): ReactNode {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const body = {
      ...(register ? { displayName: String(form.get("displayName") ?? "") } : {}),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const responseBody: unknown = await response.json().catch((): null => null);
      if (!response.ok) {
        setError(readError(responseBody));
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/agent");
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Flex align="center" justify="center" minHeight="100vh" p="4">
      <Box width="100%" maxWidth="420px">
        <Card size="4">
          <Flex direction="column" gap="5">
            <Box>
              <Heading size="7">{register ? "Создать аккаунт" : "Войти в tAsk"}</Heading>
              <Text as="p" color="gray" mt="2" size="2">
                {register
                  ? "Начните с личного рабочего пространства."
                  : "Введите email и пароль, чтобы продолжить."}
              </Text>
            </Box>
            <form onSubmit={submit}>
              <Flex direction="column" gap="4">
                {register && (
                  <label htmlFor="displayName">
                    <Text as="div" mb="1" size="2" weight="medium">
                      Имя
                    </Text>
                    <TextField.Root
                      id="displayName"
                      name="displayName"
                      autoComplete="name"
                      required
                      maxLength={100}
                    />
                  </label>
                )}
                <label htmlFor="email">
                  <Text as="div" mb="1" size="2" weight="medium">
                    Email
                  </Text>
                  <TextField.Root
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={320}
                  />
                </label>
                <label htmlFor="password">
                  <Text as="div" mb="1" size="2" weight="medium">
                    Пароль
                  </Text>
                  <TextField.Root
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={register ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    maxLength={128}
                  />
                </label>
                {error !== null && (
                  <Text color="red" size="2" role="alert">
                    {error}
                  </Text>
                )}
                <Button type="submit" size="3" disabled={submitting}>
                  {submitting ? "Подождите…" : register ? "Зарегистрироваться" : "Войти"}
                </Button>
              </Flex>
            </form>
            <Text align="center" color="gray" size="2">
              {register ? "Уже есть аккаунт? " : "Нет аккаунта? "}
              <UiLink asChild>
                <Link href={register ? "/login" : "/register"}>
                  {register ? "Войти" : "Зарегистрироваться"}
                </Link>
              </UiLink>
            </Text>
          </Flex>
        </Card>
      </Box>
    </Flex>
  );
}

function readError(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return "Не удалось выполнить вход.";
}
