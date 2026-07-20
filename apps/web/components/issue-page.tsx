"use client";

import { Callout, Flex, Spinner } from "@radix-ui/themes";
import type { TaskDetail } from "@task/api-client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { issueHref, issueIdentifier, issueTitleSlug } from "../lib/issue-url";
import { useWorkspaceData } from "../lib/use-workspace-data";
import { isApiFailure } from "../lib/workspace-contracts";
import { workspaceIssueHref } from "../lib/workspace-url";
import { TaskDetailsContent } from "./task-details-content";

type IssueState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; task: TaskDetail };

function isTaskDetail(value: unknown): value is TaskDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "projectId" in value &&
    typeof value.projectId === "string" &&
    "number" in value &&
    typeof value.number === "number" &&
    Number.isInteger(value.number) &&
    value.number > 0 &&
    "title" in value &&
    typeof value.title === "string"
  );
}

export function IssuePage({
  identifier,
  slug,
  workspaceSlug,
}: Readonly<{ identifier: string; slug: string | null; workspaceSlug?: string }>): ReactNode {
  const router = useRouter();
  const { data } = useWorkspaceData();
  const [state, setState] = useState<IssueState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        const workspaceQuery =
          workspaceSlug === undefined ? "" : `?workspace=${encodeURIComponent(workspaceSlug)}`;
        const response = await fetch(
          `/api/issues/${encodeURIComponent(identifier)}${workspaceQuery}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body: unknown = await response.json();
        if (!response.ok || isApiFailure(body)) {
          setState({
            status: "error",
            message: isApiFailure(body) ? body.error : "Задача не найдена.",
          });
          return;
        }
        if (!isTaskDetail(body)) {
          setState({ status: "error", message: "Сервер вернул некорректную задачу." });
          return;
        }
        setState({ status: "ready", task: body });
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", message: "Не удалось загрузить задачу." });
      }
    }
    void load();
    return () => controller.abort();
  }, [identifier, workspaceSlug]);

  const project = useMemo(() => {
    if (state.status !== "ready") return undefined;
    const summary = data?.projects.find((item) => item.id === state.task.projectId);
    if (summary !== undefined) return { key: summary.key, title: summary.title };
    const projectData = data?.projectData.find((item) => item.projectId === state.task.projectId);
    return projectData === undefined
      ? undefined
      : { key: projectData.projectKey, title: projectData.projectTitle };
  }, [data?.projectData, data?.projects, state]);

  useEffect(() => {
    if (state.status !== "ready" || project === undefined) return;
    const expectedIdentifier = issueIdentifier(project.key, state.task.number);
    const expectedSlug = issueTitleSlug(state.task.title);
    if (identifier !== expectedIdentifier || slug !== expectedSlug) {
      router.replace(
        data === null
          ? issueHref(project.key, state.task.number, state.task.title)
          : workspaceIssueHref(
              data.workspace.slug,
              project.key,
              state.task.number,
              state.task.title,
            ),
      );
    }
  }, [data, identifier, project, router, slug, state]);

  if (state.status === "loading") {
    return (
      <Flex className="issue-loading" align="center" justify="center">
        <Spinner />
      </Flex>
    );
  }
  if (state.status === "error") {
    return (
      <Callout.Root color="red">
        <Callout.Text>{state.message}</Callout.Text>
      </Callout.Root>
    );
  }

  const task = state.task;
  const readableIdentifier =
    project === undefined ? identifier.toUpperCase() : issueIdentifier(project.key, task.number);

  return (
    <TaskDetailsContent
      data={data}
      identifier={readableIdentifier}
      task={task}
      onTaskUpdated={(updatedTask) => setState({ status: "ready", task: updatedTask })}
    />
  );
}
