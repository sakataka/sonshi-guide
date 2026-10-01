(() => {
  "use strict";

  const chapters = window.SONSHI_CHAPTERS;
  const fullTexts = window.SONSHI_FULL_TEXTS;
  const asides = window.SONSHI_ASIDES;
  const sayings = window.SONSHI_SAYINGS;
  const highlights = window.SONSHI_HIGHLIGHTS;
  const person = window.SONSHI_PERSON;
  const content = document.querySelector("#chapter-content");
  const sidebarNav = document.querySelector("#sidebar-nav");
  const tocNav = document.querySelector("#toc-nav");
  const toc = document.querySelector("#toc");
  const headerPlace = document.querySelector("#header-place");

  // 一つの篇を、性格の異なる三つの部に分けて読む
  const parts = [
    { numeral: "壱", name: "語る", layers: ["軍師の進言"], note: "孫子が王に語りかける形で、各篇の原文を順に今の日本語へ移した本文です。" },
    { numeral: "弐", name: "原典", layers: ["現代に残る言葉", "原文", "書き下し文"], note: "二千年以上書き写されてきた漢文と、それを日本語の語順で読み下した文です。" },
    { numeral: "参", name: "読み継ぐ", layers: ["余話", "こんなところにも"], note: "後の時代にどう読まれ、どこで引かれてきたか。どれも数ある読みの一つです。" },
  ];
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

  const sourceLinks = (sources) =>
    sources
      .map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>`)
      .join(" ／ ");

  // 部の見出し。層が一つだけの部は、その層の名を添えて見出しを一段にまとめる
  const partHead = (part, id, sub = "") => `
    <header class="part-head">
      <span class="part-numeral" aria-hidden="true">${part.numeral}</span>
      <h2 id="${id}" class="part-title">${escapeHtml(part.name)}${sub ? `<span class="part-sub">${escapeHtml(sub)}</span>` : ""}</h2>
    </header>`;

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
      .map((paragraph) => {
        let html = escapeHtml(paragraph);
        marks.forEach((mark) => {
          if (!paragraph.includes(mark.phrase)) return;
          const phrase = escapeHtml(mark.phrase);
          html = html.replace(
            phrase,
            `<a id="mark-${chapter.id}-${mark.quoteIndex + 1}" class="term-link" href="#quote-${chapter.id}-${mark.quoteIndex + 1}" data-jump>${phrase}</a>`,
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
    const marked = highlights[chapterId - 1].some((mark) => mark.quoteIndex === index);
    return `
    <article id="quote-${chapterId}-${index + 1}" class="saying" tabindex="-1">
      <div class="saying-scroll">
        <p class="saying-original" lang="zh-Hant" style="--rows: ${balancedRows(original)}">${escapeHtml(original)}</p>
      </div>
      <div class="saying-body">
        <h4 class="saying-name">${escapeHtml(saying.name)}</h4>
        <p class="saying-kundoku">${escapeHtml(saying.kundoku)}</p>
        <p class="saying-story"><span class="inline-label">来歴</span>${escapeHtml(saying.story)}</p>
        <p class="saying-foot">
          <span class="saying-source"><a href="${escapeHtml(saying.source.url)}" target="_blank" rel="noreferrer">${escapeHtml(saying.source.label)}</a></span>
          ${marked ? `<a class="saying-back" href="#mark-${chapterId}-${index + 1}" data-jump>進言の中で読む</a>` : ""}
        </p>
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

  const kundokuSwitch = `
    <div class="kundoku-switch" role="group" aria-label="書き下し文の組み方">
      <button type="button" data-writing="yoko" aria-pressed="true">横書き</button>
      <button type="button" data-writing="tate" aria-pressed="false">縦書き</button>
    </div>`;

  const kundokuTemplate = (paragraphs) => `
    <div class="kundoku" data-writing="yoko">
      <ol class="kundoku-yoko">
        ${paragraphs.map((paragraph, index) => `<li><span class="dan" aria-hidden="true">${"一二三四五六七八九"[index]}</span><p>${kuHtml(paragraph)}</p></li>`).join("")}
      </ol>
      ${tatePanel(paragraphs, { className: "tate-frame--paper", label: "書き下し文", ku: true })}
    </div>`;

  const personPagerLink = (direction) => `
    <a class="pager-link pager-link--${direction}" href="#sonshi">
      <span class="pager-direction">附</span>
      <span class="pager-name">孫子という人</span>
      <span class="pager-sub">十三篇を著した人の生涯</span>
    </a>`;

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
        : direction === "prev"
          ? `<a class="pager-link pager-link--prev" href="#overview">
              <span class="pager-direction">はじめに</span>
              <span class="pager-name">総覧へ戻る</span>
              <span class="pager-sub">十三篇を見渡す</span>
            </a>`
          : personPagerLink("next");
    return `<nav class="pager" aria-label="篇の移動">${card(prev, "prev")}${card(next, "next")}</nav>`;
  };

  const renderChapter = (chapter) => {
    const fullText = fullTexts[chapter.id - 1];
    const chapterSayings = sayings[chapter.id - 1];
    const layer = (key, name, body, extra = "") => `
      <section id="sec-${key}" class="layer layer--${key}" aria-labelledby="sec-${key}-title">
        <header class="layer-head">
          <h3 id="sec-${key}-title" class="layer-title">${name}</h3>${extra}
        </header>
        ${body}
      </section>`;

    document.title = `第${chapter.id}篇 ${chapter.name}｜孫子兵法 十三篇`;
    content.innerHTML = `
      <header class="chapter-hero">
        <p class="chapter-number"><span class="seal-mini" aria-hidden="true">篇</span>第${chapter.idKanji}篇</p>
        <h1 class="chapter-title">${escapeHtml(chapter.name)}</h1>
        <p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>
        <p class="chapter-lead">${escapeHtml(chapter.lead)}</p>
      </header>

      <section class="part part--kataru" aria-labelledby="part-kataru">
        ${partHead(parts[0], "part-kataru", parts[0].layers[0])}
        <div class="counsel">${counselTemplate(chapter)}</div>
      </section>

      <section class="part part--genten" aria-labelledby="part-genten">
        <div class="part-inner">
          ${partHead(parts[1], "part-genten")}
          ${
            chapterSayings.length
              ? layer(
                  "sayings",
                  "現代に残る言葉",
                  `<div class="sayings">${chapterSayings.map((saying, index) => sayingTemplate(saying, index, chapter.id)).join("")}</div>`,
                )
              : ""
          }
          ${layer("original", "原文", tatePanel(fullText.original, { className: "tate-frame--sumi", label: "原文", lang: "zh-Hant" }))}
          ${layer("kundoku", "書き下し文", kundokuTemplate(fullText.kundoku), kundokuSwitch)}
        </div>
      </section>

      <section class="part part--yomitsugu" aria-labelledby="part-yomitsugu">
        ${partHead(parts[2], "part-yomitsugu", parts[2].layers[0])}
        ${asideTemplate(asides[chapter.id - 1])}
      </section>

      <aside class="source-note">
        原文は『孫子兵法』通行本を参照し、原文表示から現代的な句読点を除いています。書き下し文は1935年刊『武経七書』所収本文によります。篇や伝本によって異字があります。<br />
        全文：<a href="https://zh.wikisource.org/zh-hant/%E5%AD%AB%E5%AD%90%E5%85%B5%E6%B3%95" target="_blank" rel="noreferrer">中国語版Wikisource『孫子兵法』</a> ／ <a href="https://ja.wikisource.org/wiki/%E5%AD%AB%E5%AD%90_(%E6%AD%A6%E7%B6%93%E4%B8%83%E6%9B%B8)" target="_blank" rel="noreferrer">日本語版Wikisource『孫子（武経七書）』</a><br />
        参照：${sourceLinks(chapter.sources)}
      </aside>

      ${pagerTemplate(chapter)}`;
  };

  const legendTemplate = () => `
    <ol class="legend">
      ${parts
        .map(
          (part) => `
        <li class="legend-part">
          <p class="legend-head"><span class="legend-numeral" aria-hidden="true">${part.numeral}</span><strong class="legend-title">${part.name}</strong></p>
          <p class="legend-layers">${part.layers.join("・")}</p>
          <p class="legend-note">${escapeHtml(part.note)}</p>
        </li>`,
        )
        .join("")}
    </ol>`;

  const overviewRow = (chapter) => {
    const names = sayings[chapter.id - 1].map((saying) => saying.name);
    return `
      <li>
        <a class="volume" href="#chapter-${chapter.id}">
          <span class="volume-number">第${chapter.idKanji}篇</span>
          <span class="volume-name">${escapeHtml(chapter.name)}</span>
          <span class="volume-body">
            <span class="volume-sub">${escapeHtml(chapter.subtitle)}</span>
            <span class="volume-lead">${escapeHtml(chapter.lead)}</span>
            ${names.length ? `<span class="volume-sayings">${names.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</span>` : ""}
          </span>
        </a>
      </li>`;
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
            <a class="action-secondary" href="#sonshi">孫子という人</a>
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
              <ol class="volumes">${group.ids.map((id) => overviewRow(chapters[id - 1])).join("")}</ol>
            </section>`,
            )
            .join("")}
        </div>
      </section>`;
  };

  const figureTemplate = (figure, className) => `
    <figure class="${className}">
      <img src="${escapeHtml(figure.src)}" alt="${escapeHtml(figure.alt)}" loading="lazy" decoding="async" />
      <figcaption>${escapeHtml(figure.caption)}</figcaption>
    </figure>`;

  const renderPerson = () => {
    document.title = "孫子という人｜孫子兵法 十三篇";
    const last = chapters[chapters.length - 1];
    content.innerHTML = `
      <header class="person-hero">
        <div class="person-intro">
          <p class="chapter-number"><span class="seal-mini" aria-hidden="true">附</span>附録</p>
          <h1 class="chapter-title">孫子という人</h1>
          <p class="chapter-subtitle">孫武、春秋の兵法家</p>
          ${person.lead.map((paragraph) => `<p class="person-lead">${escapeHtml(paragraph)}</p>`).join("")}
        </div>
        ${figureTemplate(person.portrait, "person-portrait")}
      </header>

      <section class="person-section" aria-labelledby="person-life-title">
        <h2 id="person-life-title" class="overview-heading"><span>伝えられる生涯</span></h2>
        <ol class="aside-layers person-life">
          ${person.life
            .map(
              (item) => `<li><p class="aside-era">${escapeHtml(item.era)}</p><p class="aside-text">${escapeHtml(item.text)}${
                item.link ? ` <a class="person-link" href="${item.link.href}">${escapeHtml(item.link.label)}</a>` : ""
              }</p></li>`,
            )
            .join("")}
        </ol>
      </section>

      <section class="person-section" aria-labelledby="person-real-title">
        <h2 id="person-real-title" class="overview-heading"><span>${escapeHtml(person.real.title)}</span></h2>
        <div class="person-prose">${person.real.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
        ${figureTemplate(person.real.figure, "person-figure person-figure--wide")}
      </section>

      <section class="person-section person-statue" aria-labelledby="person-statue-title">
        <h2 id="person-statue-title" class="overview-heading"><span>${escapeHtml(person.statue.title)}</span></h2>
        <div class="person-statue-body">
          ${figureTemplate(person.statue.figure, "person-figure person-figure--tall")}
          <p class="person-prose">${escapeHtml(person.statue.text)}</p>
        </div>
      </section>

      <aside class="source-note">
        画像：${sourceLinks(person.credits)}<br />
        参照：${sourceLinks(person.sources)}
      </aside>

      <nav class="pager" aria-label="移動">
        <a class="pager-link pager-link--prev" href="#chapter-${last.id}">
          <span class="pager-direction">前の篇</span>
          <span class="pager-name">第${last.idKanji}篇　${escapeHtml(last.name)}</span>
          <span class="pager-sub">${escapeHtml(last.subtitle)}</span>
        </a>
        <a class="pager-link pager-link--next" href="#overview">
          <span class="pager-direction">読み終えたら</span>
          <span class="pager-name">総覧へ戻る</span>
          <span class="pager-sub">十三篇を見渡す</span>
        </a>
      </nav>`;
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
            </li>`;
          })
          .join("")}
      </ul>`,
      )
      .join("")}
    <p class="side-group">附</p>
    <a class="side-top side-top--person" href="#sonshi" data-view="person"><span class="side-glyph" aria-hidden="true">人</span><span><span class="side-name">孫子という人</span><span class="side-sub">十三篇を著した人</span></span></a>`;

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
    const chapter = chapters[chapterId - 1];
    headerPlace.textContent =
      view === "chapter" ? `第${chapter.idKanji}篇　${chapter.name}` : view === "person" ? "孫子という人" : "孫子兵法 十三篇";
  };

  // 名句へは頭から、進言の一句へは前後の文と一緒に見えるように送る
  const jumpTo = (target) => {
    if (!target) return;
    target.scrollIntoView({ block: target.classList.contains("term-link") ? "center" : "start" });
    target.focus({ preventScroll: true });
  };

  document.addEventListener("click", (event) => {
    // 本文への移動では、篇を切り替えるためのハッシュを保つ。
    if (event.target.closest("a.skip-link")) {
      event.preventDefault();
      jumpTo(document.querySelector("#reading"));
      return;
    }
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
    else if (view === "person") renderPerson();
    else renderOverview();
    updateNav(view, chapterId);
    window.scrollTo(0, 0);
    document.querySelector("#reading").focus({ preventScroll: true });
  };

  const route = () => {
    const hash = window.location.hash;
    const chapterMatch = hash.match(/^#chapter-(\d{1,2})$/);
    if (chapterMatch && chapters[Number(chapterMatch[1]) - 1]) show("chapter", Number(chapterMatch[1]));
    else if (hash === "#sonshi") show("person", 0);
    else show("overview", 0);
  };

  // 狭い画面では、目次を必要なときだけ開く
  document.querySelector("#toc-open").addEventListener("click", () => {
    toc.showModal();
    toc.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "center" });
  });
  document.querySelector("#toc-close").addEventListener("click", () => toc.close());
  toc.addEventListener("click", (event) => {
    if (event.target === toc || event.target.closest("a")) toc.close();
  });
  window.matchMedia("(min-width: 861px)").addEventListener("change", (event) => {
    if (event.matches) toc.close();
  });

  sidebarNav.innerHTML = sidebarTemplate();
  tocNav.innerHTML = sidebarTemplate();
  window.addEventListener("hashchange", route);
  route();
})();
