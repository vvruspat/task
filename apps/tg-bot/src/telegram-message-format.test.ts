import assert from "node:assert/strict";
import test from "node:test";
import { formatTelegramMessage } from "./telegram-message-format.js";

test("formatTelegramMessage renders compact Markdown tables as monospace tables", () => {
  assert.equal(
    formatTelegramMessage(`| Задача | Статус |
| --- | --- |
| Сценарий | Готово |
| Съёмка | В работе |`),
    [
      `<pre>Задача   │ Статус\u0020\u0020`,
      "─────────┼─────────",
      `Сценарий │ Готово\u0020\u0020`,
      "Съёмка   │ В работе</pre>",
    ].join("\n"),
  );
});

test("formatTelegramMessage renders wide Markdown tables as readable cards", () => {
  assert.equal(
    formatTelegramMessage(`## План проекта

| Корневая задача | Статус | Подзадачи |
| --- | --- | --- |
| **#1 Excalibur** | Статус A | Написание текста, аранжировка и запись демо |
| **#2 Рыцари** | Статус B | Подбор актёров, раскадровка, костюмы и репетиции |`),
    `<b>План проекта</b>

<b>📊 Корневая задача</b>
<blockquote><b>#1 Excalibur</b>
<b>Статус:</b> Статус A
<b>Подзадачи:</b> Написание текста, аранжировка и запись демо</blockquote>
<blockquote><b>#2 Рыцари</b>
<b>Статус:</b> Статус B
<b>Подзадачи:</b> Подбор актёров, раскадровка, костюмы и репетиции</blockquote>`,
  );
});

test("formatTelegramMessage converts common Markdown and escapes unsupported HTML", () => {
  assert.equal(
    formatTelegramMessage(
      "## Итог\n\n**Готово** и `безопасно` <script>\n\n- [Открыть](https://example.com/path?a=1&b=2)",
    ),
    `<b>Итог</b>

<b>Готово</b> и <code>безопасно</code> &lt;script&gt;

• <a href="https://example.com/path?a=1&amp;b=2">Открыть</a>`,
  );
});

test("formatTelegramMessage keeps escaped and inline-code pipes inside table cells", () => {
  assert.equal(
    formatTelegramMessage(`| Поле | Значение |
| --- | --- |
| Код | \`a|b\` и A\\|B |`),
    [`<pre>Поле │ Значение\u0020`, "─────┼──────────", "Код  │ a|b и A|B</pre>"].join("\n"),
  );
});
