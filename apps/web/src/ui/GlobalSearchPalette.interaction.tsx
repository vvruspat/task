import type {
  AgentRunDetail,
  AgentRunSummary,
  SearchPage,
  SearchRequestInput,
} from "@task/api-client";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { GlobalSearchPalette } from "./GlobalSearchPalette.js";
import { AgentHistoryView } from "./views/workspace/AgentHistoryView.js";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type SearchClient = {
  search(input: SearchRequestInput): Promise<SearchPage>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const roots: Root[] = [];

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("GlobalSearchPalette interactions", () => {
  it("opens from Cmd or Ctrl K at the application level", async () => {
    render(<App />);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("closes with Escape when a result has focus", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const client: SearchClient = {
      search: vi.fn().mockResolvedValue(searchPage("Task result")),
    };
    render(
      <GlobalSearchPalette
        isOpen
        onClose={onClose}
        onNavigate={vi.fn()}
        searchClient={client}
        workspaceId={workspaceId}
      />,
    );

    await setQueryAndAdvance("result");
    const result = getOptionByText("Task result");
    result.focus();

    await act(async () => {
      result.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the latest debounced search result when an older request settles last", async () => {
    vi.useFakeTimers();
    const first = deferred<SearchPage>();
    const second = deferred<SearchPage>();
    const client: SearchClient = {
      search: vi
        .fn()
        .mockImplementation((input: SearchRequestInput) =>
          input.query === "first" ? first.promise : second.promise,
        ),
    };
    render(
      <GlobalSearchPalette
        isOpen
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        searchClient={client}
        workspaceId={workspaceId}
      />,
    );

    await setQueryAndAdvance("first");
    await setQueryAndAdvance("second");
    await act(async () => {
      second.resolve(searchPage("Newest result"));
    });
    await act(async () => {
      first.resolve(searchPage("Stale result"));
    });

    expect(document.body.textContent).toContain("Newest result");
    expect(document.body.textContent).not.toContain("Stale result");
  });
});

describe("AgentHistoryView interactions", () => {
  it("keeps the current run detail when an older selection resolves last", async () => {
    const first = deferred<AgentRunDetail>();
    const second = deferred<AgentRunDetail>();
    const getAgentRun = vi
      .fn()
      .mockImplementation(
        (input: { agentRunId: string; workspaceId: string }): Promise<AgentRunDetail> =>
          input.agentRunId === firstRunId ? first.promise : second.promise,
      );
    const onOpenConfirmations = vi.fn();

    render(
      <AgentHistoryView
        agentRuns={[
          agentRunSummary({ id: firstRunId, inputText: "First run" }),
          agentRunSummary({ id: secondRunId, inputText: "Second run" }),
        ]}
        client={{ getAgentRun }}
        onOpenConfirmations={onOpenConfirmations}
        projects={[]}
        selectedProjectId={null}
        selectedWorkspaceId={workspaceId}
        skills={[]}
        statuses={[]}
        tasks={[]}
        workspaces={[]}
      />,
    );

    await act(async () => {
      getButtonByText("Second run").click();
    });
    await act(async () => {
      second.resolve(agentRunDetail(secondRunId, "Newest response"));
    });
    await act(async () => {
      first.resolve(agentRunDetail(firstRunId, "Stale response"));
    });

    expect(getAgentRun).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain("Newest response");
    expect(document.body.textContent).not.toContain("Stale response");
    expect(document.body.textContent).toContain("Tool-call audit");

    await act(async () => {
      getButtonByText("Open confirmations").click();
    });
    expect(onOpenConfirmations).toHaveBeenCalledOnce();
  });
});

function deferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value) {
      if (resolvePromise === undefined) throw new Error("Deferred promise is not initialized.");
      resolvePromise(value);
    },
  };
}

function getOptionByText(text: string): HTMLButtonElement {
  const option = [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.includes(text),
  );
  if (option === undefined) throw new Error(`No command palette option contains ${text}.`);
  return option;
}

function getButtonByText(text: string): HTMLButtonElement {
  const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (button === undefined) throw new Error(`No button contains ${text}.`);
  return button;
}

function render(element: React.ReactNode): void {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(element));
}

function searchPage(title: string): SearchPage {
  return {
    items: [
      {
        description: null,
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        projectId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        title,
        type: "task",
      },
    ],
    page: 1,
    pageSize: 10,
    total: 1,
  };
}

const firstRunId = "11111111-1111-4111-8111-111111111111";
const secondRunId = "22222222-2222-4222-8222-222222222222";

function agentRunSummary(overrides: Partial<AgentRunSummary> = {}): AgentRunSummary {
  return {
    createdAt: "2026-07-10T09:00:00.000Z",
    error: null,
    finalResponse: null,
    id: firstRunId,
    inputText: "First run",
    model: "openai/gpt-5",
    source: "web",
    sourceMessageId: null,
    status: "completed",
    updatedAt: "2026-07-10T10:00:00.000Z",
    userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    workspaceId,
    ...overrides,
  };
}

function agentRunDetail(id: string, finalResponse: string): AgentRunDetail {
  return {
    ...agentRunSummary({ finalResponse, id }),
    confirmationRequests: [
      {
        createdAt: "2026-07-10T09:10:00.000Z",
        expiresAt: "2026-07-11T09:10:00.000Z",
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        kind: "task.create",
        preview: { title: "Create task" },
        status: "pending",
        updatedAt: "2026-07-10T09:10:00.000Z",
      },
    ],
    toolCalls: [
      {
        arguments: { projectId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" },
        completedAt: "2026-07-10T09:05:00.000Z",
        createdAt: "2026-07-10T09:04:00.000Z",
        error: null,
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        result: { created: true },
        status: "success",
        toolName: "create_task",
      },
    ],
  };
}

async function setQueryAndAdvance(value: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Search workspace"]');
  if (input === null) throw new Error("Workspace search input was not rendered.");
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setValue === undefined) throw new Error("Search input does not expose a value setter.");
  await act(async () => {
    setValue.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}
