"use client";

import { Box, Button, Card, Flex, Heading, Text, TextField } from "@task/ui";
import { type FormEvent, type ReactNode, useState } from "react";

export function WorkspaceOnboarding({ refresh }: { refresh: () => Promise<void> }): ReactNode {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/workspace", {
        body: JSON.stringify({ name: String(form.get("name") ?? "") }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body: unknown = await response.json().catch((): null => null);
      if (!response.ok) {
        setError(readError(body, "Не удалось создать рабочее пространство."));
        return;
      }
      await refresh();
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Flex align="center" justify="center" minHeight="70vh" p="4">
      <Box width="100%" maxWidth="460px">
        <Card size="4">
          <Flex direction="column" gap="5">
            <Box>
              <Heading size="7">Создайте рабочее пространство</Heading>
              <Text as="p" color="gray" mt="2" size="2">
                Здесь будут храниться ваши проекты, задачи и шаблоны.
              </Text>
            </Box>
            <form onSubmit={submit}>
              <Flex direction="column" gap="4">
                <label htmlFor="workspaceName">
                  <Text as="div" mb="1" size="2" weight="medium">
                    Название
                  </Text>
                  <TextField.Root
                    id="workspaceName"
                    name="name"
                    autoFocus
                    maxLength={80}
                    placeholder="Например, Моя команда"
                    required
                  />
                </label>
                {error !== null && (
                  <Text color="red" size="2" role="alert">
                    {error}
                  </Text>
                )}
                <Button disabled={submitting} size="3" type="submit">
                  {submitting ? "Создаю…" : "Создать workspace"}
                </Button>
              </Flex>
            </form>
          </Flex>
        </Card>
      </Box>
    </Flex>
  );
}

function readError(value: unknown, fallback: string): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}
