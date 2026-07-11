import type { SearchPage, TaskApiClient } from "@task/api-client";
import { Box, Button, Callout, Dialog, Flex, Text, TextField } from "@task/ui/app";
import type { KeyboardEvent, ReactElement } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildPaletteItems,
  getNextPaletteIndex,
  getSearchResultNavigation,
  type PaletteItem,
  shouldAcceptSearchSettlement,
} from "./globalSearchPaletteModels.js";
import type { WorkspaceNavigationState } from "./navigation.js";

type SearchState =
  | { status: "idle" | "loading" }
  | { message: string; status: "error" }
  | { page: SearchPage; status: "loaded" };

export type GlobalSearchPaletteProps = {
  isOpen: boolean;
  onClose(): void;
  onNavigate(nextState: WorkspaceNavigationState): void;
  searchClient: Pick<TaskApiClient, "search"> | null;
  workspaceId: string | null;
};

const searchDelayMs = 250;

export function GlobalSearchPalette({
  isOpen,
  onClose,
  onNavigate,
  searchClient,
  workspaceId,
}: GlobalSearchPaletteProps): ReactElement {
  const inputId = useId();
  const listboxId = useId();
  const requestVersion = useRef(0);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const items = useMemo(
    () => buildPaletteItems(query, searchState.status === "loaded" ? searchState.page : null),
    [query, searchState],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(inputId)?.focus();
  }, [inputId, isOpen]);

  useEffect(() => {
    setActiveIndex(items.length === 0 ? -1 : 0);
  }, [items.length]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    requestVersion.current += 1;
    const version = requestVersion.current;
    if (!isOpen || normalizedQuery.length === 0) {
      setSearchState({ status: "idle" });
      return;
    }
    if (searchClient === null || workspaceId === null) {
      setSearchState({
        message: "Workspace search is unavailable until workspace data is loaded.",
        status: "error",
      });
      return;
    }
    const timeout = window.setTimeout(() => {
      setSearchState({ status: "loading" });
      void searchClient
        .search({ page: 1, pageSize: 10, query: normalizedQuery, workspaceId })
        .then((page) => {
          if (shouldAcceptSearchSettlement(version, requestVersion.current)) {
            setSearchState({ page, status: "loaded" });
          }
        })
        .catch((error: unknown) => {
          if (shouldAcceptSearchSettlement(version, requestVersion.current)) {
            setSearchState({
              message: error instanceof Error ? error.message : "Workspace search failed.",
              status: "error",
            });
          }
        });
    }, searchDelayMs);
    return () => {
      window.clearTimeout(timeout);
      requestVersion.current += 1;
    };
  }, [isOpen, query, searchClient, workspaceId]);

  const selectItem = (item: PaletteItem): void => {
    onNavigate(
      item.kind === "command" ? item.value.navigation : getSearchResultNavigation(item.value),
    );
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        getNextPaletteIndex(
          currentIndex,
          items.length,
          event.key === "ArrowDown" ? "next" : "previous",
        ),
      );
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      const item = items[activeIndex];
      if (item !== undefined) {
        event.preventDefault();
        selectItem(item);
      }
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(isDialogOpen) => {
        if (!isDialogOpen) onClose();
      }}
    >
      <Dialog.Content aria-describedby={undefined} aria-label="Workspace search and commands">
        <Flex direction="column" gap="4">
          <Box>
            <Dialog.Title>Search workspace</Dialog.Title>
            <Dialog.Description>
              Search tasks, projects, skills, and workspace actions.
            </Dialog.Description>
          </Box>
          <TextField.Root
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded
            aria-label="Search workspace"
            id={inputId}
            onChange={(event) => {
              setActiveIndex(0);
              setQuery(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, skills"
            role="combobox"
            value={query}
          />
          {searchState.status === "error" ? (
            <Callout.Root color="red" role="alert">
              <Callout.Text>{searchState.message}</Callout.Text>
            </Callout.Root>
          ) : null}
          <Flex direction="column" gap="1" id={listboxId} role="listbox">
            {items.map((item, index) => {
              const label = item.kind === "command" ? item.value.label : item.value.title;
              const description =
                item.kind === "command"
                  ? item.value.description
                  : `${item.value.type.replaceAll("_", " ")}${item.value.description === null ? "" : ` · ${item.value.description}`}`;
              return (
                <Button
                  aria-selected={activeIndex === index}
                  id={`${listboxId}-${index}`}
                  key={
                    item.kind === "command" ? item.value.id : `${item.value.type}-${item.value.id}`
                  }
                  onClick={() => selectItem(item)}
                  role="option"
                  variant={activeIndex === index ? "surface" : "ghost"}
                >
                  <Flex align="start" direction="column" gap="1">
                    <Text>{label}</Text>
                    <Text color="gray" size="1">
                      {description}
                    </Text>
                  </Flex>
                </Button>
              );
            })}
            {searchState.status === "loading" ? (
              <Text color="gray">Searching workspace…</Text>
            ) : null}
            {query.trim().length > 0 &&
            searchState.status === "loaded" &&
            searchState.page.total === 0 ? (
              <Text color="gray">No workspace results found.</Text>
            ) : null}
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
