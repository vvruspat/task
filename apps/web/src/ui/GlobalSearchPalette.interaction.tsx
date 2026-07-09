import type { SearchPage, SearchRequestInput } from "@task/api-client";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { GlobalSearchPalette } from "./GlobalSearchPalette.js";

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
