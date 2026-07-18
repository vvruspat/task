"use client";

import "./create-dialog.css";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, Select, TextArea, TextField } from "@radix-ui/themes";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useWorkspaceStore } from "../lib/workspace-store";
import { useWorkspaceData } from "../lib/use-workspace-data";

type CreateKind = "project" | "skill" | "task";

export function CreateDialog(): ReactNode {
  const open = useWorkspaceStore((state) => state.createOpen);
  const setOpen = useWorkspaceStore((state) => state.setCreateOpen);
  const { data, refresh } = useWorkspaceData();
  const [kind, setKind] = useState<CreateKind>("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const projectId = data?.projects.some((project) => project.id === selectedProjectId) ? selectedProjectId : data?.projects[0]?.id ?? null;
  const canCreateTask = kind !== "task" || projectId !== null;
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (data === null || title.trim().length === 0 || !canCreateTask) return;
    setSubmitting(true); setError(null);
    const response = await fetch("/api/workspace/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, title, description, workspaceId: data.workspace.id, ...(kind === "task" && projectId !== null ? { projectId } : {}) }) });
    if (!response.ok) { const body: unknown = await response.json(); setError(typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Не удалось создать объект."); setSubmitting(false); return; }
    await refresh(); setTitle(""); setDescription(""); setOpen(false); setSubmitting(false);
  };
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="search-overlay"/><Dialog.Content className="create-dialog"><Dialog.Title>Создать</Dialog.Title><form onSubmit={(event) => void submit(event)}><label>Тип<Select.Root value={kind} onValueChange={(value) => { if (value === "project" || value === "task" || value === "skill") setKind(value); }}><Select.Trigger/><Select.Content><Select.Item value="task">Задача</Select.Item><Select.Item value="project">Проект</Select.Item><Select.Item value="skill">Шаблон</Select.Item></Select.Content></Select.Root></label><label>Название<TextField.Root value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Введите название" autoFocus/></label><label>Описание<TextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Необязательно"/></label>{error !== null && <p className="form-error">{error}</p>}<div className="dialog-actions"><Button type="button" variant="soft" color="gray" onClick={() => setOpen(false)}>Отмена</Button><Button type="submit" disabled={submitting || !canCreateTask || title.trim().length === 0}>{submitting ? "Создаю…" : "Создать"}</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
