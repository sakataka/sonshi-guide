import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// ブラウザと同じ順でデータとテンプレートを読み込む。DOMや追加依存は不要。
const loadTemplates = () => {
  const window = {};
  for (const file of ["chapters", "full-texts", "asides", "sayings", "person", "templates"]) {
    const source = readFileSync(new URL(`../src/${file}.js`, import.meta.url), "utf8");
    runInNewContext(source, { window }, { filename: `${file}.js` });
  }
  return window;
};

const data = loadTemplates();
const templates = data.SONSHI_TEMPLATES;

// Bun標準のHTMLパーサーで属性と本文を検査する（文字参照は保持される）。
const inspect = async (html) => {
  const elements = [];
  const original = [];
  const kundoku = [];
  const paragraphs = (values) => ({
    element() { values.push(""); },
    text(chunk) { values[values.length - 1] += chunk.text; },
  });
  await new HTMLRewriter()
    .on("*", { element(element) { elements.push(Object.fromEntries(element.attributes)); } })
    .on("#original-tate p", paragraphs(original))
    .on(".kundoku-yoko p", paragraphs(kundoku))
    .transform(new Response(html))
    .text();
  return { elements, original, kundoku };
};

const expectReferences = (elements) => {
  const ids = elements.map((element) => element.id).filter(Boolean);
  expect(new Set(ids).size).toBe(ids.length);
  for (const element of elements) {
    for (const attribute of ["aria-labelledby", "aria-controls"]) {
      for (const id of element[attribute]?.split(/\s+/) ?? []) expect(ids).toContain(id);
    }
    if ("data-jump" in element) expect(ids).toContain(element.href.slice(1));
    if (element.target === "_blank") expect(element.rel).toBe("noreferrer");
  }
};

describe("十三篇の表示と参照", () => {
  for (const chapter of data.SONSHI_CHAPTERS) {
    test(`第${chapter.id}篇: 本文、名句、縦書き、部へのリンク`, async () => {
      const { elements, original, kundoku } = await inspect(templates.chapterTemplate(chapter));
      expectReferences(elements);
      const fullText = data.SONSHI_FULL_TEXTS[chapter.id - 1];
      expect(original).toEqual(fullText.original);
      expect(kundoku).toEqual(fullText.kundoku);
      expect(elements.filter((element) => "data-part" in element).map((element) => element["data-part"]))
        .toEqual(["kataru", "genten", "yomitsugu"]);
      expect(elements.filter((element) => "data-tate-move" in element)).toHaveLength(4);
      expect(elements.filter((element) => "aria-pressed" in element).map((element) => element["aria-pressed"]))
        .toEqual(["true", "false"]);

      const chapterSayings = data.SONSHI_SAYINGS[chapter.id - 1];
      expect(elements.filter((element) => element.id?.startsWith("quote-"))).toHaveLength(chapterSayings.length);
      for (const mark of data.SONSHI_HIGHLIGHTS[chapter.id - 1]) {
        expect(chapter.counsel.some((paragraph) => paragraph.includes(mark.phrase))).toBe(true);
        expect(elements.some((element) => element.id === `mark-${chapter.id}-${mark.quoteIndex + 1}`)).toBe(true);
      }

      const pager = elements.filter((element) => element.class === "pager-next" || element.class === "pager-other");
      expect(pager.map((element) => element.href)).toEqual([
        chapter.id === 13 ? "#sonshi" : `#chapter-${chapter.id + 1}`,
        chapter.id === 1 ? "#overview" : `#chapter-${chapter.id - 1}`,
      ]);
    });
  }
});

test("総覧と附録の参照・画像・行き先", async () => {
  const overview = await inspect(templates.overviewTemplate());
  const person = await inspect(templates.personTemplate());
  expectReferences(overview.elements);
  expectReferences(person.elements);
  expect(overview.elements.filter((element) => element.class === "slip").map((element) => element.href))
    .toEqual(data.SONSHI_CHAPTERS.map((chapter) => `#chapter-${chapter.id}`));
  expect(person.elements.filter((element) => element.src).map((element) => element.src))
    .toEqual([data.SONSHI_PERSON.portrait.src, data.SONSHI_PERSON.real.figure.src, data.SONSHI_PERSON.statue.figure.src]);
});

test("上端と目次は同じ十三篇を並べる", async () => {
  for (const html of [templates.slipnavTemplate(), templates.tocTemplate()]) {
    const { elements } = await inspect(html);
    expect(elements.filter((element) => "data-chapter" in element).map((element) => Number(element["data-chapter"])))
      .toEqual(data.SONSHI_CHAPTERS.map((chapter) => chapter.id));
  }
  for (const chapter of data.SONSHI_CHAPTERS) {
    const { elements } = await inspect(templates.headerTemplate("chapter", chapter.id));
    expect(elements.filter((element) => "data-jump" in element).map((element) => element.href))
      .toEqual(["#part-kataru", "#part-genten", "#part-yomitsugu"]);
  }
  expect(templates.headerTemplate("overview", 0)).toContain("孫子兵法 十三篇");
  expect(templates.headerTemplate("person", 0)).toContain("孫子という人");
});

test("表示文字と出典の属性をHTMLとして解釈させない", async () => {
  const custom = loadTemplates();
  const chapter = custom.SONSHI_CHAPTERS[0];
  const text = `<script>"&'</script>`;
  chapter.name = text;
  chapter.counsel = [text];
  chapter.sources = [{ label: text, url: 'https://example.test/?a="&b=<tag>' }];
  const html = custom.SONSHI_TEMPLATES.chapterTemplate(chapter);
  expect(html).toContain("&lt;script&gt;&quot;&amp;&#039;&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  const { elements } = await inspect(html);
  const source = elements.find((element) => element.href === "https://example.test/?a=&quot;&amp;b=&lt;tag&gt;");
  expect(source).toEqual({
    href: "https://example.test/?a=&quot;&amp;b=&lt;tag&gt;",
    target: "_blank",
    rel: "noreferrer",
  });
});
