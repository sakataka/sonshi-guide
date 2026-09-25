(() => {
  "use strict";

  const chapters = window.SONSHI_CHAPTERS;
  const fullTexts = window.SONSHI_FULL_TEXTS;
  const asides = window.SONSHI_ASIDES;
  const sayings = window.SONSHI_SAYINGS;
  const highlights = window.SONSHI_HIGHLIGHTS;
  const content = document.querySelector("#chapter-content");
  const sidebarNav = document.querySelector("#sidebar-nav");
  const mobileNav = document.querySelector("#mobile-nav");
  const headerPlace = document.querySelector("#header-place");
  const headerTicks = document.querySelector("#header-ticks");

  // 一つの篇を、性格の異なる三つの層に分けて読む
  const parts = [
    { key: "kataru", numeral: "壱", name: "語る", note: "孫子の教えを、主君への進言として今の日本語で語り直した本文です。" },
    { key: "genten", numeral: "弐", name: "原典", note: "二千年以上書き写されてきた漢文と、それを日本語の語順で読み下した文です。" },
    { key: "yomitsugu", numeral: "参", name: "読み継ぐ", note: "後の時代にどう読まれ、どこで引かれてきたか。どれも数ある読みの一つです。" },
  ];
  const layers = {
    counsel: { part: "kataru", glyph: "言", name: "軍師の進言", kind: "意訳", note: "孫子が主君に語りかける形で、篇の内容を今の日本語に移したもの。" },
    sayings: { part: "genten", glyph: "句", name: "現代に残る言葉", kind: "名句", note: "この篇から生まれ、今も使われる言葉。原文・書き下し・来歴の順に。" },
    original: { part: "genten", glyph: "文", name: "原文", kind: "白文", note: "伝わる漢文。後世に補われた句読点を除き、縦に組んでいます。" },
    kundoku: { part: "genten", glyph: "訓", name: "書き下し文", kind: "訓読", note: "漢文を日本語の語順で読み下した文。1935年刊『武経七書』所収本文によります。" },
    aside: { part: "yomitsugu", glyph: "話", name: "余話", kind: "後世", note: "この篇が後の時代にどう読まれ、史書や物語、映画やドラマのどこで引かれてきたか。" },
  };
  const groups = [
    { name: "計る", note: "戦う前に量り、損なわずに勝つ", ids: [1, 2, 3] },
    { name: "形と勢", note: "負けぬ形を作り、勢いを生み、虚を撃つ", ids: [4, 5, 6] },
    { name: "動く", note: "先を争い、変に応じ、兆しを読む", ids: [7, 8, 9] },
    { name: "地", note: "地を読み、置かれた場の人の心を読む", ids: [10, 11] },
    { name: "火と間", note: "強い手段の自制と、先に知ること", ids: [12, 13] },
  ];
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const stripOriginalPunctuation = (value) =>
    String(value).replace(/[，。；：！？、,.!?;:“”‘’「」『』（）()《》〈〉—…·﹁﹂\s]/g, "");

  const plainCounsel = (paragraph) =>
    paragraph.replaceAll("<strong>", "").replaceAll("</strong>", "").replace(/^孫子は申し上げる。\s*/, "");

  const glyph = (key) => {
    const layer = layers[key];
    return `<span class="glyph glyph--${layer.part}" aria-hidden="true">${layer.glyph}</span>`;
  };

  const sourceLinks = (sources) =>
    sources
      .map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>`)
      .join(" ／ ");

  const layerHead = (key, id) => {
    const layer = layers[key];
    return `
      <header class="layer-head">
        ${glyph(key)}
        <h3 id="${id}-title" class="layer-title">${escapeHtml(layer.name)}<span class="layer-kind">${escapeHtml(layer.kind)}</span></h3>
      </header>`;
  };

  const partHead = (part) => `
    <header class="part-head">
      <span class="part-numeral" aria-hidden="true">${part.numeral}</span>
      <h2 class="part-title">${escapeHtml(part.name)}</h2>
    </header>`;

  const chapterLayers = (chapter) =>
    ["counsel", "sayings", "original", "kundoku", "aside"].filter(
      (key) => key !== "sayings" || sayings[chapter.id - 1].length,
    );

  // 書き下し文は句点ごとに行を改め、一文ずつ読めるようにする
  const kuHtml = (paragraph) =>
    paragraph
      .split(/(?<=。)/)
      .map((sentence) => `<span class="ku">${escapeHtml(sentence)}</span>`)
      .join("");

  // 縦組みの本文。右から左へ読み進める
  const tatePanel = (paragraphs, { className = "", label, lang = "", ku = false }) => `
    <div class="tate-frame ${className}">
      <div class="tate"${lang ? ` lang="${lang}"` : ""} tabindex="0" role="region" aria-label="${escapeHtml(label)}（縦書き・横にスクロール）">
        ${paragraphs.map((paragraph) => `<p>${ku ? kuHtml(paragraph) : escapeHtml(paragraph)}</p>`).join("")}
      </div>
      <p class="tate-hint" aria-hidden="true"><span>右から左へ</span></p>
    </div>`;

  const counselTemplate = (chapter) => {
    const marks = highlights[chapter.id - 1];
    return chapter.counsel
      .map(plainCounsel)
      .filter(Boolean)
      .map((paragraph) => {
        let html = escapeHtml(paragraph);
        marks.forEach((mark) => {
          if (!paragraph.includes(mark.phrase)) return;
          const phrase = escapeHtml(mark.phrase);
          html = html.replace(
            phrase,
            `<a class="term-link" href="#quote-${chapter.id}-${mark.quoteIndex + 1}" data-jump>${phrase}</a>`,
          );
        });
        return `<p>${html}</p>`;
      })
      .join("");
  };

  // 掛け軸のように、どの列もほぼ同じ字数で折り返す
  const balancedRows = (text, maxRows = 9) => {
    const columns = Math.ceil(text.length / maxRows);
    return Math.ceil(text.length / columns);
  };

  const sayingTemplate = (saying, index, chapterId) => {
    const original = stripOriginalPunctuation(saying.original);
    return `
    <article id="quote-${chapterId}-${index + 1}" class="saying" tabindex="-1">
      <div class="saying-scroll">
        <p class="saying-original" lang="zh-Hant" style="--rows: ${balancedRows(original)}">${escapeHtml(original)}</p>
      </div>
      <div class="saying-body">
        <h4 class="saying-name">${escapeHtml(saying.name)}</h4>
        <p class="saying-kundoku">${escapeHtml(saying.kundoku)}</p>
        <p class="saying-story"><span class="inline-label">来歴</span>${escapeHtml(saying.story)}</p>
        <p class="saying-source"><a href="${escapeHtml(saying.source.url)}" target="_blank" rel="noreferrer">${escapeHtml(saying.source.label)}</a></p>
      </div>
    </article>`;
  };

  const asideTemplate = (aside) => `
    <div class="aside">
      <h4 class="aside-title">${escapeHtml(aside.title)}</h4>
      <ol class="aside-layers">
        ${aside.layers
          .map((layer) => `<li><p class="aside-era">${escapeHtml(layer.era)}</p><p class="aside-text">${escapeHtml(layer.text)}</p></li>`)
          .join("")}
      </ol>
      <p class="aside-takeaway">${escapeHtml(aside.takeaway)}</p>
      ${
        aside.mentions?.length
          ? `<section class="aside-mentions" aria-label="こんなところにも">
              <h5 class="aside-mentions-title">こんなところにも</h5>
              <ul>${aside.mentions
                .map((mention) => `<li><p class="aside-where">${escapeHtml(mention.where)}</p><p class="aside-text">${escapeHtml(mention.text)}</p></li>`)
                .join("")}</ul>
            </section>`
          : ""
      }
      <p class="fine-sources">${sourceLinks(aside.sources)}</p>
    </div>`;

  const kundokuTemplate = (paragraphs) => `
    <div class="kundoku-switch" role="group" aria-label="書き下し文の組み方">
      <button type="button" data-writing="yoko" aria-pressed="true">横書き</button>
      <button type="button" data-writing="tate" aria-pressed="false">縦書き</button>
    </div>
    <div class="kundoku" data-writing="yoko">
      <ol class="kundoku-yoko">
        ${paragraphs.map((paragraph, index) => `<li><span class="dan" aria-hidden="true">${"一二三四五六七八九"[index]}</span><p>${kuHtml(paragraph)}</p></li>`).join("")}
      </ol>
      ${tatePanel(paragraphs, { className: "tate-frame--paper", label: "書き下し文", ku: true })}
    </div>`;

  const pagerTemplate = (chapter) => {
    const prev = chapters[chapter.id - 2];
    const next = chapters[chapter.id];
    const card = (target, direction) =>
      target
        ? `<a class="pager-link pager-link--${direction}" href="#chapter-${target.id}">
            <span class="pager-direction">${direction === "prev" ? "前の篇" : "次の篇"}</span>
            <span class="pager-name">第${target.idKanji}篇　${escapeHtml(target.name)}</span>
            <span class="pager-sub">${escapeHtml(target.subtitle)}</span>
          </a>`
        : `<a class="pager-link pager-link--${direction}" href="#overview">
            <span class="pager-direction">${direction === "prev" ? "はじめに" : "読み終えたら"}</span>
            <span class="pager-name">総覧へ戻る</span>
            <span class="pager-sub">十三篇を見渡す</span>
          </a>`;
    return `<nav class="pager" aria-label="篇の移動">${card(prev, "prev")}${card(next, "next")}</nav>`;
  };

  const renderChapter = (chapter) => {
    const fullText = fullTexts[chapter.id - 1];
    const chapterSayings = sayings[chapter.id - 1];
    const section = (key, body) => `
      <section id="sec-${key}" class="layer layer--${key}" data-spy="${key}" tabindex="-1" aria-labelledby="sec-${key}-title">
        ${layerHead(key, `sec-${key}`)}
        ${body}
      </section>`;

    document.title = `第${chapter.id}篇 ${chapter.name}｜孫子兵法 十三篇`;
    content.innerHTML = `
      <header class="chapter-hero">
        <span class="hero-watermark" aria-hidden="true">${chapter.idKanji}</span>
        <p class="chapter-number"><span class="seal-mini" aria-hidden="true">篇</span>第${chapter.idKanji}篇</p>
        <h1 class="chapter-title">${escapeHtml(chapter.name)}</h1>
        <p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>
        <p class="chapter-lead">${escapeHtml(chapter.lead)}</p>
      </header>

      <div class="part part--kataru">
        ${partHead(parts[0])}
        ${section("counsel", `<div class="counsel">${counselTemplate(chapter)}</div>`)}
      </div>

      <div class="part part--genten">
        ${partHead(parts[1])}
        ${
          chapterSayings.length
            ? section(
                "sayings",
                `<div class="sayings">${chapterSayings.map((saying, index) => sayingTemplate(saying, index, chapter.id)).join("")}</div>`,
              )
            : ""
        }
        ${section("original", tatePanel(fullText.original, { className: "tate-frame--sumi", label: "原文", lang: "zh-Hant" }))}
        ${section("kundoku", kundokuTemplate(fullText.kundoku))}
      </div>

      <div class="part part--yomitsugu">
        ${partHead(parts[2])}
        ${section("aside", asideTemplate(asides[chapter.id - 1]))}
      </div>

      <aside class="source-note">
        原文は『孫子兵法』通行本を参照し、原文表示から現代的な句読点を除いています。書き下し文は1935年刊『武経七書』所収本文によります。篇や伝本によって異字があります。<br />
        全文：<a href="https://zh.wikisource.org/zh-hant/%E5%AD%AB%E5%AD%90%E5%85%B5%E6%B3%95" target="_blank" rel="noreferrer">中国語版Wikisource『孫子兵法』</a> ／ <a href="https://ja.wikisource.org/wiki/%E5%AD%AB%E5%AD%90_(%E6%AD%A6%E7%B6%93%E4%B8%83%E6%9B%B8)" target="_blank" rel="noreferrer">日本語版Wikisource『孫子（武経七書）』</a><br />
        参照：${sourceLinks(chapter.sources)}
      </aside>

      ${pagerTemplate(chapter)}`;
  };

  const legendTemplate = () => `
    <div class="legend">
      ${parts
        .map(
          (part) => `
        <section class="legend-part legend-part--${part.key}">
          <p class="legend-numeral" aria-hidden="true">${part.numeral}</p>
          <h3 class="legend-title">${part.name}</h3>
          <p class="legend-note">${escapeHtml(part.note)}</p>
          <ul class="legend-layers">
            ${Object.entries(layers)
              .filter(([, layer]) => layer.part === part.key)
              .map(([key, layer]) => `<li>${glyph(key)}<span><strong>${layer.name}</strong>${escapeHtml(layer.note)}</span></li>`)
              .join("")}
          </ul>
        </section>`,
        )
        .join("")}
    </div>`;

  const overviewCard = (chapter) => {
    const names = sayings[chapter.id - 1].map((saying) => saying.name);
    return `
      <a class="volume" href="#chapter-${chapter.id}">
        <span class="volume-number">第${chapter.idKanji}篇</span>
        <span class="volume-name">${escapeHtml(chapter.name)}</span>
        <span class="volume-sub">${escapeHtml(chapter.subtitle)}</span>
        <span class="volume-lead">${escapeHtml(chapter.lead)}</span>
        ${names.length ? `<span class="volume-sayings">${names.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</span>` : ""}
      </a>`;
  };

  const renderOverview = () => {
    document.title = "孫子兵法 十三篇";
    content.innerHTML = `
      <header class="overview-hero">
        <div class="overview-intro">
          <p class="overview-kicker">春秋の兵法書を、いくつもの層で読む</p>
          <h1 class="overview-title">孫子兵法<span>十三篇</span></h1>
          <p class="overview-lead">十三篇、およそ六千字。戦のための書として書かれ、二千年以上にわたって武将に、学者に、経営者に読み継がれてきました。読む人と時代が変われば、同じ一句から引き出されるものも変わります。</p>
          <p class="overview-lead">ここでは各篇を「語る」「原典」「読み継ぐ」の三つの層に分けて並べています。どこから読んでも構いません。</p>
          <div class="overview-actions">
            <a class="action-primary" href="#chapter-1">第一篇 始計から読む</a>
          </div>
        </div>
        <div class="overview-scroll" lang="zh-Hant" aria-label="第一篇の書き出し（原文）">
          <p>兵者國之大事</p><p>死生之地</p><p>存亡之道</p><p>不可不察也</p>
        </div>
      </header>

      <section class="overview-section" aria-labelledby="legend-title">
        <h2 id="legend-title" class="overview-heading"><span>一篇の読み方</span></h2>
        ${legendTemplate()}
      </section>

      <section class="overview-section" aria-labelledby="volumes-title">
        <h2 id="volumes-title" class="overview-heading"><span>十三篇の見取り図</span></h2>
        <p class="overview-note">篇の区切りは伝本のとおり。まとまりの名は、見渡すための目安として付けたものです。</p>
        <div class="volume-groups">
          ${groups
            .map(
              (group) => `
            <section class="volume-group">
              <h3 class="group-title"><span class="group-name">${group.name}</span><span class="group-note">${group.note}</span></h3>
              <div class="volumes">${group.ids.map((id) => overviewCard(chapters[id - 1])).join("")}</div>
            </section>`,
            )
            .join("")}
        </div>
      </section>`;
  };

  // ---- ナビゲーション ----

  const sidebarTemplate = () => `
    <a class="side-top" href="#overview" data-view="overview"><span class="side-glyph" aria-hidden="true">覧</span><span><span class="side-name">総覧</span><span class="side-sub">十三篇を見渡す</span></span></a>
    ${groups
      .map(
        (group) => `
      <p class="side-group">${group.name}</p>
      <ul class="side-chapters">
        ${group.ids
          .map((id) => {
            const chapter = chapters[id - 1];
            return `<li>
              <a class="side-chapter" href="#chapter-${id}" data-chapter="${id}"><span class="side-number">${chapter.idKanji}</span><span class="side-chapter-name">${escapeHtml(chapter.name)}</span></a>
              <ul class="side-layers" data-layers="${id}" hidden>
                ${chapterLayers(chapter)
                  .map((key) => `<li><a href="#sec-${key}" data-jump data-layer="${key}">${glyph(key)}<span>${layers[key].name}</span></a></li>`)
                  .join("")}
              </ul>
            </li>`;
          })
          .join("")}
      </ul>`,
      )
      .join("")}`;

  const mobileTemplate = () => `
    <a class="strip-link strip-link--view" href="#overview" data-view="overview">総覧</a>
    ${chapters
      .map(
        (chapter) =>
          `<a class="strip-link" href="#chapter-${chapter.id}" data-chapter="${chapter.id}"><span class="strip-number">${chapter.idKanji}</span>${escapeHtml(chapter.name)}</a>`,
      )
      .join("")}`;

  const ticksTemplate = () =>
    chapters
      .map(
        (chapter) =>
          `<a class="tick" href="#chapter-${chapter.id}" data-chapter="${chapter.id}" aria-label="第${chapter.id}篇 ${escapeHtml(chapter.name)}" title="第${chapter.idKanji}篇 ${escapeHtml(chapter.name)}"></a>`,
      )
      .join("");

  const updateNav = (view, chapterId) => {
    document.querySelectorAll("[data-chapter]").forEach((link) => {
      const selected = view === "chapter" && Number(link.dataset.chapter) === chapterId;
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-view]").forEach((link) => {
      if (link.dataset.view === view) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-layers]").forEach((list) => {
      list.hidden = !(view === "chapter" && Number(list.dataset.layers) === chapterId);
    });
    const chapter = chapters[chapterId - 1];
    headerPlace.textContent =
      view === "chapter" ? `第${chapter.idKanji}篇　${chapter.name}` : "総覧";

    const current = mobileNav.querySelector('[aria-current="page"]');
    if (current) {
      const left = current.offsetLeft - (mobileNav.clientWidth - current.offsetWidth) / 2;
      mobileNav.scrollTo({ left: Math.max(0, left) });
    }
  };

  // 読んでいる層を、側面の目次に示す
  let spyObserver;
  const watchSections = () => {
    spyObserver?.disconnect();
    const targets = content.querySelectorAll("[data-spy]");
    if (!targets.length || !("IntersectionObserver" in window)) return;
    const visible = new Map();
    spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.dataset.spy, entry.target.offsetTop);
          else visible.delete(entry.target.dataset.spy);
        });
        const [active] = [...visible.entries()].sort((a, b) => a[1] - b[1]).map(([key]) => key);
        if (!active) return;
        document.querySelectorAll(".side-layers a").forEach((link) => {
          if (link.dataset.layer === active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    targets.forEach((target) => spyObserver.observe(target));
  };

  const jumpTo = (target) => {
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
  };

  document.addEventListener("click", (event) => {
    const jump = event.target.closest("a[data-jump]");
    if (jump) {
      event.preventDefault();
      jumpTo(content.querySelector(jump.getAttribute("href")));
      return;
    }
    const writing = event.target.closest("[data-writing]");
    if (writing && writing.tagName === "BUTTON") {
      const container = writing.closest(".layer").querySelector(".kundoku");
      container.dataset.writing = writing.dataset.writing;
      writing.parentElement.querySelectorAll("button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button === writing));
      });
    }
  });

  // 縦組みの欄では、縦方向のホイールを読み進める向き（左）へ送る
  content.addEventListener(
    "wheel",
    (event) => {
      const panel = event.target.closest(".tate");
      if (!panel || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const maxScroll = panel.scrollWidth - panel.clientWidth;
      if (maxScroll <= 0) return;
      const position = Math.abs(panel.scrollLeft);
      const forward = event.deltaY > 0;
      if ((forward && position >= maxScroll - 1) || (!forward && position <= 0)) return;
      event.preventDefault();
      panel.scrollLeft -= event.deltaY;
    },
    { passive: false },
  );

  const show = (view, chapterId) => {
    if (view === "chapter") renderChapter(chapters[chapterId - 1]);
    else renderOverview();
    updateNav(view, chapterId);
    watchSections();
    window.scrollTo(0, 0);
    document.querySelector("#reading").focus({ preventScroll: true });
  };

  const route = () => {
    const hash = window.location.hash;
    const chapterMatch = hash.match(/^#chapter-(\d{1,2})$/);
    if (chapterMatch && chapters[Number(chapterMatch[1]) - 1]) show("chapter", Number(chapterMatch[1]));
    else show("overview", 0);
  };

  sidebarNav.innerHTML = sidebarTemplate();
  mobileNav.innerHTML = mobileTemplate();
  headerTicks.innerHTML = ticksTemplate();
  window.addEventListener("hashchange", route);
  route();
})();
