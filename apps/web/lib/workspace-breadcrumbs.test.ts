import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceBreadcrumbs,
  type WorkspaceBreadcrumbData,
} from "./workspace-breadcrumbs.ts";

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
  assert.deepEqual(buildWorkspaceBreadcrumbs("/confirmations", data), [
    { href: "/dashboard", label: "Product Workspace" },
    { label: "Подтверждения" },
  ]);
  assert.deepEqual(buildWorkspaceBreadcrumbs("/w/product-workspace/view/album-dream", data), [
    { href: "/dashboard", label: "Product Workspace" },
    { href: "/views", label: "Views" },
    { label: "Альбом мечты" },
  ]);
  assert.deepEqual(buildWorkspaceBreadcrumbs("/w/product-workspace/issue/AM-1/song", data), [
    { href: "/dashboard", label: "Product Workspace" },
    { href: "/w/product-workspace/project/album", label: "Альбом" },
    { label: "AM-1" },
  ]);
});
