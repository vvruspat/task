type MarkdownTable = {
  headers: string[];
  rows: string[][];
};

export function formatTelegramMessage(markdown: string): string {
  const lines = markdown.replace(/\r\n?/gu, "\n").split("\n");
  const formattedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (isCodeFence(line)) {
      const codeLines: string[] = [];
      let closingFenceIndex = index + 1;

      while (closingFenceIndex < lines.length && !isCodeFence(lines[closingFenceIndex] ?? "")) {
        codeLines.push(lines[closingFenceIndex] ?? "");
        closingFenceIndex += 1;
      }

      formattedLines.push(`<pre>${escapeTelegramHtml(codeLines.join("\n"))}</pre>`);
      index = closingFenceIndex < lines.length ? closingFenceIndex : lines.length - 1;
      continue;
    }

    const table = readMarkdownTable(lines, index);
    if (table !== null) {
      formattedLines.push(formatMarkdownTable(table.table));
      index = table.lastLineIndex;
      continue;
    }

    formattedLines.push(formatMarkdownLine(line));
  }

  return collapseBlankLines(formattedLines).trim();
}

function readMarkdownTable(
  lines: string[],
  headerLineIndex: number,
): { lastLineIndex: number; table: MarkdownTable } | null {
  const headers = parseMarkdownTableRow(lines[headerLineIndex] ?? "");
  const delimiter = parseMarkdownTableRow(lines[headerLineIndex + 1] ?? "");

  if (
    headers === null ||
    delimiter === null ||
    headers.length !== delimiter.length ||
    !delimiter.every(isMarkdownTableDelimiterCell)
  ) {
    return null;
  }

  const rows: string[][] = [];
  let currentLineIndex = headerLineIndex + 2;

  while (currentLineIndex < lines.length) {
    const parsedRow = parseMarkdownTableRow(lines[currentLineIndex] ?? "");
    if (parsedRow === null) break;

    const normalizedRow = normalizeTableRow(parsedRow, headers.length);
    if (normalizedRow.some((cell) => cell.length > 0)) {
      rows.push(normalizedRow);
    }
    currentLineIndex += 1;
  }

  if (rows.length === 0) return null;

  return {
    lastLineIndex: currentLineIndex - 1,
    table: { headers, rows },
  };
}

function parseMarkdownTableRow(line: string): string[] | null {
  const trimmedLine = line.trim();
  if (!trimmedLine.includes("|")) return null;

  const cells: string[] = [];
  let currentCell = "";
  let escaped = false;
  let insideCode = false;

  for (const character of trimmedLine) {
    if (escaped) {
      currentCell += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (character === "`") {
      insideCode = !insideCode;
      currentCell += character;
      continue;
    }

    if (character === "|" && !insideCode) {
      cells.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (escaped) currentCell += "\\";
  cells.push(currentCell.trim());

  if (cells[0] === "") cells.shift();
  if (cells.at(-1) === "") cells.pop();

  return cells.length >= 2 ? cells : null;
}

function isMarkdownTableDelimiterCell(cell: string): boolean {
  return /^:?-{3,}:?$/u.test(cell.trim());
}

function normalizeTableRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    if (columnIndex < columnCount - 1) return row[columnIndex] ?? "";
    return row.slice(columnIndex).join(" | ");
  });
}

function formatMarkdownTable(table: MarkdownTable): string {
  const plainHeaders = table.headers.map(toPlainTableText);
  const plainRows = table.rows.map((row) => row.map(toPlainTableText));
  const columnWidths = plainHeaders.map((header, columnIndex) =>
    Math.max(displayWidth(header), ...plainRows.map((row) => displayWidth(row[columnIndex] ?? ""))),
  );
  const totalWidth =
    columnWidths.reduce((sum, columnWidth) => sum + columnWidth, 0) +
    Math.max(0, columnWidths.length - 1) * tableColumnSeparatorWidth;

  if (
    table.headers.length <= compactTableMaxColumns &&
    totalWidth <= compactTableMaxWidth &&
    columnWidths.every((columnWidth) => columnWidth <= compactTableMaxColumnWidth)
  ) {
    return formatCompactTable(plainHeaders, plainRows, columnWidths);
  }

  return formatTableAsCards(table);
}

function formatCompactTable(headers: string[], rows: string[][], columnWidths: number[]): string {
  const headerLine = formatCompactTableRow(headers, columnWidths);
  const separatorLine = columnWidths.map((columnWidth) => "─".repeat(columnWidth)).join("─┼─");
  const rowLines = rows.map((row) => formatCompactTableRow(row, columnWidths));

  return `<pre>${escapeTelegramHtml([headerLine, separatorLine, ...rowLines].join("\n"))}</pre>`;
}

function formatCompactTableRow(cells: string[], columnWidths: number[]): string {
  return columnWidths
    .map((columnWidth, columnIndex) => padToDisplayWidth(cells[columnIndex] ?? "", columnWidth))
    .join(" │ ");
}

function formatTableAsCards(table: MarkdownTable): string {
  const [primaryHeader = "Строка", ...detailHeaders] = table.headers;
  const title = `<b>📊 ${formatInlineMarkdown(primaryHeader)}</b>`;
  const cards = table.rows.map((row) => {
    const [primaryCell = "—", ...detailCells] = row;
    const details = detailHeaders.map((header, detailIndex) => {
      const value = detailCells[detailIndex]?.trim() || "—";
      return `<b>${formatInlineMarkdown(header)}:</b> ${formatInlineMarkdown(value)}`;
    });
    const cardLines = [formatTableCardTitle(primaryCell), ...details];

    return `<blockquote>${cardLines.join("\n")}</blockquote>`;
  });

  return [title, ...cards].join("\n");
}

function formatTableCardTitle(value: string): string {
  const trimmedValue = value.trim() || "—";
  const strongMatch = /^\*\*(.+)\*\*$/u.exec(trimmedValue);
  return `<b>${formatInlineMarkdown(strongMatch?.[1] ?? trimmedValue)}</b>`;
}

function formatMarkdownLine(line: string): string {
  const headingMatch = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line);
  if (headingMatch !== null) {
    return `<b>${formatInlineMarkdown(headingMatch[1] ?? "")}</b>`;
  }

  if (/^\s{0,3}(?:-{3,}|_{3,}|\*{3,})\s*$/u.test(line)) {
    return "────────────";
  }

  const quoteMatch = /^\s{0,3}>\s?(.*)$/u.exec(line);
  if (quoteMatch !== null) {
    return `<blockquote>${formatInlineMarkdown(quoteMatch[1] ?? "")}</blockquote>`;
  }

  const bulletMatch = /^\s*[-+*]\s+(.+)$/u.exec(line);
  if (bulletMatch !== null) {
    return `• ${formatInlineMarkdown(bulletMatch[1] ?? "")}`;
  }

  return formatInlineMarkdown(line);
}

function formatInlineMarkdown(value: string): string {
  const tokens: string[] = [];
  const createToken = (html: string): string => {
    const token = `${tokenStart}${tokens.length}${tokenEnd}`;
    tokens.push(html);
    return token;
  };

  let tokenizedValue = value.replace(/`([^`\n]+)`/gu, (_match: string, code: string) =>
    createToken(`<code>${escapeTelegramHtml(code)}</code>`),
  );

  tokenizedValue = tokenizedValue.replace(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/gu,
    (match: string, label: string, target: string): string => {
      const safeTarget = readSafeLinkTarget(target);
      if (safeTarget === null) return match;
      return createToken(
        `<a href="${escapeTelegramHtmlAttribute(safeTarget)}">${escapeTelegramHtml(label)}</a>`,
      );
    },
  );

  let html = escapeTelegramHtml(tokenizedValue)
    .replace(/\*\*([^*\n]+)\*\*/gu, "<b>$1</b>")
    .replace(/__([^_\n]+)__/gu, "<b>$1</b>")
    .replace(/~~([^~\n]+)~~/gu, "<s>$1</s>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/gu, "$1<i>$2</i>");

  html = html.replace(
    new RegExp(`${tokenStart}(\\d+)${tokenEnd}`, "gu"),
    (_match: string, tokenIndex: string): string => tokens[Number(tokenIndex)] ?? "",
  );

  return html;
}

function readSafeLinkTarget(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function toPlainTableText(value: string): string {
  return value
    .replace(/`([^`\n]+)`/gu, "$1")
    .replace(/\[([^\]\n]+)\]\([^)\n]+\)/gu, "$1")
    .replace(/\*\*([^*\n]+)\*\*/gu, "$1")
    .replace(/__([^_\n]+)__/gu, "$1")
    .replace(/~~([^~\n]+)~~/gu, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/gu, "$1$2")
    .trim();
}

function displayWidth(value: string): number {
  return Array.from(value).length;
}

function padToDisplayWidth(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - displayWidth(value)))}`;
}

function isCodeFence(line: string): boolean {
  return /^\s*```[^`]*$/u.test(line);
}

function escapeTelegramHtml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

function escapeTelegramHtmlAttribute(value: string): string {
  return escapeTelegramHtml(value).replace(/"/gu, "&quot;");
}

function collapseBlankLines(lines: string[]): string {
  return lines.join("\n").replace(/\n{3,}/gu, "\n\n");
}

const compactTableMaxColumns = 4;
const compactTableMaxWidth = 48;
const compactTableMaxColumnWidth = 20;
const tableColumnSeparatorWidth = 3;
const tokenStart = "\u{e000}";
const tokenEnd = "\u{e001}";
