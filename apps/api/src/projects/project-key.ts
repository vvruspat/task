const cyrillicToLatin: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "z",
  з: "z",
  и: "i",
  й: "i",
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
  ц: "c",
  ч: "c",
  ш: "s",
  щ: "s",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "u",
  я: "a",
};

export const projectKeyPattern = /^[A-Z][A-Z0-9]{1,7}$/;

export function deriveProjectKeyBase(title: string): string {
  const transliterated = [...title.toLocaleLowerCase("ru")]
    .map((character) => cyrillicToLatin[character] ?? character)
    .join("");
  const words = transliterated
    .split(/[^a-z0-9]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  if (words.length === 0) return "PRJ";
  const key =
    words.length === 1
      ? words[0]?.slice(0, 3)
      : words
          .slice(0, 3)
          .map((word) => word[0])
          .join("");
  const normalized = (key ?? "PRJ").toUpperCase();
  return normalized.length >= 2 ? normalized : `${normalized}P`;
}

export function selectAvailableProjectKey(
  title: string,
  existingKeys: ReadonlySet<string>,
): string {
  const base = deriveProjectKeyBase(title);
  if (!existingKeys.has(base)) return base;

  for (let suffix = 2; suffix < 1_000_000; suffix += 1) {
    const suffixText = String(suffix);
    const candidate = `${base.slice(0, 8 - suffixText.length)}${suffixText}`;
    if (!existingKeys.has(candidate)) return candidate;
  }

  throw new Error("Unable to allocate a unique project key.");
}
