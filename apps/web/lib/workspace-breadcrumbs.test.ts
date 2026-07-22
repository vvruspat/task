import assert from "node:assert/strict";
import test from "node:test";
import { type MessageKey, ru } from "./i18n/messages.ts";
import {
  buildWorkspaceBreadcrumbs,
  type WorkspaceBreadcrumbData,
} from "./workspace-breadcrumbs.ts";

const t = (key: MessageKey): string => ru[key];

const data: WorkspaceBreadcrumbData = {
  workspace: { name: "Product Workspace", slug: "product-workspace" },
  projects: [
    {
      id: "project-id",
      key: "AM",
      slug: "album",
      title: "Альбом",
    },
  ],
  views: [
    {
      layout: "board",
      name: "Альбом мечты",
      projectId: "project-id",
      slug: "album-dream",
    },
  ],
};

test("builds route breadcrumbs without a global project selector", () => {
  assert.deepEqual(buildWorkspaceBreadcrumbs("/confirmations", data, t), [
    { href: "/w/product-workspace/agent", label: "Product Workspace" },
    { label: "Уведомления" },
  ]);
  assert.deepEqual(buildWorkspaceBreadcrumbs("/w/product-workspace/view/album-dream", data, t), [
    { href: "/w/product-workspace/agent", label: "Product Workspace" },
    { href: "/w/product-workspace/views", label: "Представления" },
    { label: "Альбом мечты" },
  ]);
  assert.deepEqual(buildWorkspaceBreadcrumbs("/w/product-workspace/issue/AM-1/song", data, t), [
    { href: "/w/product-workspace/agent", label: "Product Workspace" },
    { href: "/w/product-workspace/view/album-dream", label: "Альбом" },
    { label: "AM-1" },
  ]);
});

test("falls back to the filtered kanban when the project view is unavailable", () => {
  assert.deepEqual(
    buildWorkspaceBreadcrumbs("/w/product-workspace/issue/AM-1/song", { ...data, views: [] }, t),
    [
      { href: "/w/product-workspace/agent", label: "Product Workspace" },
      { href: "/w/product-workspace/kanban?project=album", label: "Альбом" },
      { label: "AM-1" },
    ],
  );
});
