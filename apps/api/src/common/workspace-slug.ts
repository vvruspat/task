const cyrillicToLatin: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export const workspaceScopedSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function deriveWorkspaceScopedSlug(value: string): string {
  const transliterated = [...value.toLocaleLowerCase("ru")]
    .map((character) => cyrillicToLatin[character] ?? character)
    .join("");
  const slug = transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug.length === 0 ? "item" : slug;
}

export function selectAvailableWorkspaceScopedSlug(
  value: string,
  existingSlugs: ReadonlySet<string>,
): string {
  const base = deriveWorkspaceScopedSlug(value);
  if (!existingSlugs.has(base)) return base;

  for (let suffix = 2; suffix < 1_000_000; suffix += 1) {
    const suffixText = `-${suffix}`;
    const prefix = base.slice(0, 80 - suffixText.length).replace(/-+$/g, "");
    const candidate = `${prefix}${suffixText}`;
    if (!existingSlugs.has(candidate)) return candidate;
  }

  throw new Error("Unable to allocate a unique workspace-scoped slug.");
}
