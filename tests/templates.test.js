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
    if (element.target === "_blank") expect(element.rel).toBe("noreferrer");
  }
  return ids;
};

const choKeys = ["kataru", "genten", "yomitsugu"];
const choHref = (id, key) => `#chapter-${id}${key === "kataru" ? "" : `/${key}`}`;

describe("十三篇の三つの帖と参照", () => {
  for (const chapter of data.SONSHI_CHAPTERS) {
    test(`第${chapter.id}篇: 本文、名句、縦書き、帖札、帖送り`, async () => {
      const pages = {};
      for (const key of choKeys) pages[key] = await inspect(templates.chapterTemplate(chapter, key));
      const ids = Object.fromEntries(choKeys.map((key) => [key, expectReferences(pages[key].elements)]));

      for (const key of choKeys) {
        const { elements } = pages[key];
        // 帖札は三枚で、開いている帖の札だけが選ばれている
        const tabs = elements.filter((element) => element.class?.startsWith("cho-tab "));
        expect(tabs.map((element) => element.href)).toEqual(choKeys.map((other) => choHref(chapter.id, other)));
        expect(tabs.map((element) => element["aria-current"] ?? "")).toEqual(choKeys.map((other) => (other === key ? "page" : "")));
        // 帖をまたぐ行き先は、行き先の帖に必ずある
        for (const element of elements.filter((item) => "data-target" in item)) {
          const destination = choKeys.find((other) => choHref(chapter.id, other) === element.href);
          expect(destination).toBeDefined();
          expect(ids[destination]).toContain(element["data-target"]);
        }
      }

      const fullText = data.SONSHI_FULL_TEXTS[chapter.id - 1];
      expect(pages.genten.original).toEqual(fullText.original);
      expect(pages.genten.kundoku).toEqual(fullText.kundoku);
      expect(pages.kataru.original).toEqual([]);
      expect(pages.genten.elements.filter((element) => "data-tate-move" in element)).toHaveLength(4);
      expect(pages.genten.elements.filter((element) => "aria-pressed" in element).map((element) => element["aria-pressed"]))
        .toEqual(["true", "false"]);

      const chapterSayings = data.SONSHI_SAYINGS[chapter.id - 1];
      expect(ids.genten.filter((id) => id.startsWith("quote-"))).toHaveLength(chapterSayings.length);
      for (const mark of data.SONSHI_HIGHLIGHTS[chapter.id - 1]) {
        expect(chapter.counsel.some((paragraph) => paragraph.includes(mark.phrase))).toBe(true);
        expect(ids.kataru).toContain(`mark-${chapter.id}-${mark.quoteIndex + 1}`);
      }

      const pager = (key) =>
        pages[key].elements.filter((element) => element.class?.startsWith("pager-next") || element.class === "pager-other").map((element) => element.href);
      const nextChapter = chapter.id === 13 ? "#sonshi" : `#chapter-${chapter.id + 1}`;
      expect(pager("kataru")).toEqual([choHref(chapter.id, "genten"), nextChapter]);
      expect(pager("genten")).toEqual([choHref(chapter.id, "yomitsugu"), nextChapter]);
      expect(pager("yomitsugu")).toEqual([nextChapter, chapter.id === 1 ? "#overview" : `#chapter-${chapter.id - 1}`]);
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
  expect(overview.elements.filter((element) => element.class === "slip-group").map((element) => element.style))
    .toEqual(["--span: 3", "--span: 3", "--span: 3", "--span: 2", "--span: 2"]);
  expect(person.elements.filter((element) => element.src).map((element) => element.src))
    .toEqual([data.SONSHI_PERSON.portrait.src, data.SONSHI_PERSON.real.figure.src, data.SONSHI_PERSON.statue.figure.src]);
  for (const link of person.elements.filter((element) => element.class === "person-link")) {
    expect(link.href).toMatch(/^#chapter-\d{1,2}(\/(genten|yomitsugu))?$/);
  }
});

test("上端と目次は同じ十三篇を並べ、上端に開いている帖を示す", async () => {
  for (const html of [templates.slipnavTemplate(), templates.tocTemplate()]) {
    const { elements } = await inspect(html);
    expect(elements.filter((element) => "data-chapter" in element).map((element) => Number(element["data-chapter"])))
      .toEqual(data.SONSHI_CHAPTERS.map((chapter) => chapter.id));
  }
  expect(templates.choKeys).toEqual(choKeys);
  for (const chapter of data.SONSHI_CHAPTERS) {
    expect(templates.headerTemplate("chapter", chapter.id, "kataru")).toContain("語る");
    expect(templates.headerTemplate("chapter", chapter.id, "genten")).toContain("原典");
    expect(templates.headerTemplate("chapter", chapter.id, "yomitsugu")).toContain("読み継ぐ");
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
  const html = ["kataru", "genten"].map((key) => custom.SONSHI_TEMPLATES.chapterTemplate(chapter, key)).join("");
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
