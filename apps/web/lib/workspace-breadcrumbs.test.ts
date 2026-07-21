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
  views: [{ name: "Альбом мечты", slug: "album-dream" }],
};

test("builds route breadcrumbs without a global project selector", () => {
  assert.deepEqual(buildWorkspaceBreadcrumbs("/confirmations", data, t), [
    { href: "/agent", label: "Product Workspace" },
    { label: "Подтверждения" },
  ]);
  assert.deepEqual(buildWorkspaceBreadcrumbs("/w/product-workspace/view/album-dream", data, t), [
    { href: "/agent", label: "Product Workspace" },
    { href: "/views", label: "Представления" },
    { label: "Альбом мечты" },
  ]);
  assert.deepEqual(buildWorkspaceBreadcrumbs("/w/product-workspace/issue/AM-1/song", data, t), [
    { href: "/agent", label: "Product Workspace" },
    { href: "/w/product-workspace/project/album", label: "Альбом" },
    { label: "AM-1" },
  ]);
});
