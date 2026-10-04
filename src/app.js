(() => {
  "use strict";

  const chapters = window.SONSHI_CHAPTERS;
  const fullTexts = window.SONSHI_FULL_TEXTS;
  const asides = window.SONSHI_ASIDES;
  const sayings = window.SONSHI_SAYINGS;
  const highlights = window.SONSHI_HIGHLIGHTS;
  const person = window.SONSHI_PERSON;
  const content = document.querySelector("#chapter-content");
  const slipnav = document.querySelector("#slipnav");
  const tocNav = document.querySelector("#toc-nav");
  const toc = document.querySelector("#toc");
  const headerPlace = document.querySelector("#header-place");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  // 一つの篇を、性格の異なる三つの部に分けて読む
  const parts = [
    { key: "kataru", numeral: "壱", name: "語る", layers: ["軍師の進言"], note: "孫子が王に語りかける形で、各篇の原文を順に今の日本語へ移した本文です。" },
    { key: "genten", numeral: "弐", name: "原典", layers: ["現代に残る言葉", "原文", "書き下し文"], note: "二千年以上書き写されてきた漢文と、それを日本語の語順で読み下した文です。" },
    { key: "yomitsugu", numeral: "参", name: "読み継ぐ", layers: ["余話", "こんなところにも"], note: "後の時代にどう読まれ、どこで引かれてきたか。どれも数ある読みの一つです。" },
  ];
  const groups = [
    { name: "計る", note: "戦う前に量り、損なわずに勝つ", ids: [1, 2, 3] },
    { name: "形と勢", note: "負けぬ形を作り、勢いを生み、虚を撃つ", ids: [4, 5, 6] },
    { name: "動く", note: "先を争い、変に応じ、兆しを読む", ids: [7, 8, 9] },
    { name: "地", note: "地を読み、置かれた場の人の心を読む", ids: [10, 11] },
    { name: "火と間", note: "強い手段の自制と、先に知ること", ids: [12, 13] },
  ];
  const groupStarts = new Set(groups.map((group) => group.ids[0]));

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

  // 扉や行き先の背後に、その篇の書き出しを薄墨で透かす
  const ghostText = (chapterId, length) => escapeHtml(fullTexts[chapterId - 1].original.join("").slice(0, length));

  // 部の見出し。広い画面では余白に縦に掲げ、読み進めるあいだ留まる
  const partMark = (part, sub = "") => `
    <header class="part-mark">
      <span class="part-numeral" aria-hidden="true">${part.numeral}</span>
      <h2 id="part-${part.key}-title" class="part-title">${escapeHtml(part.name)}${sub ? `<span class="part-sub">${escapeHtml(sub)}</span>` : ""}</h2>
    </header>`;

  const partSection = (part, body, sub) => `
    <section id="part-${part.key}" class="part part--${part.key}" data-part="${part.key}" aria-labelledby="part-${part.key}-title">
      <div class="part-grid">
        ${partMark(part, sub)}
        <div class="part-body">${body}</div>
      </div>
    </section>`;

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
      <div class="tate-controls" role="group" aria-label="${escapeHtml(label)}の移動">
        <button type="button" data-tate-move="forward">左へ読む</button>
        <span class="tate-hint">右から左へ</span>
        <button type="button" data-tate-move="back" disabled>右へ戻る</button>
      </div>
    </div>`;

  // 名句を含む段には、余白に名句の名を傍注のように添える
  const counselTemplate = (chapter) => {
    const marks = highlights[chapter.id - 1];
    const chapterSayings = sayings[chapter.id - 1];
    return chapter.counsel
      .map((paragraph) => {
        let html = escapeHtml(paragraph);
        const notes = [];
        marks.forEach((mark) => {
          if (!paragraph.includes(mark.phrase)) return;
          const phrase = escapeHtml(mark.phrase);
          html = html.replace(
            phrase,
            `<a id="mark-${chapter.id}-${mark.quoteIndex + 1}" class="term-link" href="#quote-${chapter.id}-${mark.quoteIndex + 1}" data-jump>${phrase}</a>`,
          );
          notes.push(chapterSayings[mark.quoteIndex].name);
        });
        const note = notes.length
          ? `<span class="margin-note" aria-hidden="true">${notes.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</span>`
          : "";
        return `<p${notes.length ? ' class="has-note"' : ""}>${note}${html}</p>`;
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
      <h3 class="aside-title">${escapeHtml(aside.title)}</h3>
      <ol class="aside-layers">
        ${aside.layers
          .map((layer) => `<li><p class="aside-era">${escapeHtml(layer.era)}</p><p class="aside-text">${escapeHtml(layer.text)}</p></li>`)
          .join("")}
      </ol>
      <p class="aside-takeaway">${escapeHtml(aside.takeaway)}</p>
      ${
        aside.mentions?.length
          ? `<section class="aside-mentions" aria-labelledby="mentions-title">
              <h4 id="mentions-title" class="aside-mentions-title">こんなところにも</h4>
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

  // 先へは大きく、もう一つの行き先は控えめに置く
  const overviewStop = { href: "#overview", direction: "はじめへ", name: "総覧", sub: "十三篇を見渡す" };
  const personStop = { href: "#sonshi", direction: "附録", name: "孫子という人", sub: "十三篇を著した人の生涯" };
  const chapterStop = (chapter, direction) => ({
    href: `#chapter-${chapter.id}`,
    direction,
    number: `第${chapter.idKanji}篇`,
    name: chapter.name,
    sub: chapter.subtitle,
    ghost: ghostText(chapter.id, 64).slice(3),
  });

  const pagerTemplate = (next, other) => `
    <nav class="pager" aria-label="移動">
      <a class="pager-next" href="${next.href}">
        ${next.ghost ? `<span class="pager-ghost" lang="zh-Hant" aria-hidden="true">${next.ghost}</span>` : ""}
        <span class="pager-direction">${next.direction}</span>
        <span class="pager-name">${next.number ? `<span class="pager-number">${next.number}</span>` : ""}${escapeHtml(next.name)}</span>
        <span class="pager-sub">${escapeHtml(next.sub)}</span>
      </a>
      <a class="pager-other" href="${other.href}"><span class="pager-direction">${other.direction}</span>${other.number ? `${other.number}　` : ""}${escapeHtml(other.name)}</a>
    </nav>`;

  const chapterPager = (chapter) => {
    const prev = chapters[chapter.id - 2];
    const next = chapters[chapter.id];
    return pagerTemplate(next ? chapterStop(next, "次の篇") : personStop, prev ? chapterStop(prev, "前の篇") : overviewStop);
  };

  const layer = (key, name, body, extra = "") => `
    <section id="sec-${key}" class="layer layer--${key}" aria-labelledby="sec-${key}-title">
      <header class="layer-head">
        <h3 id="sec-${key}-title" class="layer-title">${name}</h3>${extra}
      </header>
      ${body}
    </section>`;

  const renderChapter = (chapter) => {
    const fullText = fullTexts[chapter.id - 1];
    const chapterSayings = sayings[chapter.id - 1];

    document.title = `第${chapter.id}篇 ${chapter.name}｜孫子兵法 十三篇`;
    content.innerHTML = `
      <header class="opening">
        <p class="opening-ghost" lang="zh-Hant" aria-hidden="true">${ghostText(chapter.id, 160)}</p>
        <h1 class="daisen"><span class="daisen-number">第${chapter.idKanji}篇</span><span class="daisen-name">${escapeHtml(chapter.name)}</span></h1>
        <div class="opening-body">
          <p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>
          <p class="chapter-lead">${escapeHtml(chapter.lead)}</p>
        </div>
      </header>

      ${partSection(parts[0], `<div class="counsel">${counselTemplate(chapter)}</div>`, parts[0].layers[0])}

      ${partSection(
        parts[1],
        `${
          chapterSayings.length
            ? layer(
                "sayings",
                "現代に残る言葉",
                `<div class="sayings">${chapterSayings.map((saying, index) => sayingTemplate(saying, index, chapter.id)).join("")}</div>`,
              )
            : ""
        }
        ${layer("original", "原文", tatePanel(fullText.original, { className: "tate-frame--sumi", label: "原文", lang: "zh-Hant" }))}
        ${layer("kundoku", "書き下し文", kundokuTemplate(fullText.kundoku), kundokuSwitch)}`,
      )}

      ${partSection(parts[2], asideTemplate(asides[chapter.id - 1]), parts[2].layers[0])}

      <aside class="source-note">
        原文は『孫子兵法』通行本を参照し、原文表示から現代的な句読点を除いています。書き下し文は1935年刊『武経七書』所収本文によります。篇や伝本によって異字があります。<br />
        全文：<a href="https://zh.wikisource.org/zh-hant/%E5%AD%AB%E5%AD%90%E5%85%B5%E6%B3%95" target="_blank" rel="noreferrer">中国語版Wikisource『孫子兵法』</a> ／ <a href="https://ja.wikisource.org/wiki/%E5%AD%AB%E5%AD%90_(%E6%AD%A6%E7%B6%93%E4%B8%83%E6%9B%B8)" target="_blank" rel="noreferrer">日本語版Wikisource『孫子（武経七書）』</a><br />
        参照：${sourceLinks(chapter.sources)}
      </aside>

      ${chapterPager(chapter)}`;
  };

  const legendTemplate = () => `
    <ol class="legend">
      ${parts
        .map(
          (part) => `
        <li class="legend-part legend-part--${part.key}">
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

  // 十三篇を、編紐で綴じた十三本の竹簡として並べる。右の題から左へ読み進める
  const slipTemplate = (chapter, index) => `
    <li style="--i: ${index}">
      <a class="slip" href="#chapter-${chapter.id}">
        <span class="slip-number">第${chapter.idKanji}篇</span>
        <span class="slip-name">${escapeHtml(chapter.name)}</span>
        <span class="slip-sub">${escapeHtml(chapter.subtitle)}</span>
      </a>
    </li>`;

  const renderOverview = () => {
    document.title = "孫子兵法 十三篇";
    content.innerHTML = `
      <header class="cover">
        <div class="cover-art" aria-hidden="true"></div>
        <div class="cover-scroll">
          <h1 class="cover-title"><span class="cover-name">孫子兵法</span><span class="cover-seal">十三篇</span></h1>
          <p class="cover-kicker">春秋の兵法書を、いくつもの層で読む</p>
          <div class="slips-frame" tabindex="0" role="region" aria-label="十三篇の竹簡。右の始計から左の用間へ">
            <ol class="slips" aria-label="十三篇">${chapters.map(slipTemplate).join("")}</ol>
          </div>
        </div>
        <p class="slips-hint">右の始計から、左の用間へ<span>横に繰る</span></p>
      </header>

      <section class="cover-intro" aria-label="はじめに">
        <p class="cover-motto" lang="zh-Hant" aria-hidden="true">兵者國之大事</p>
        <div class="cover-lead">
          <p>十三篇、およそ六千字。戦のための書として書かれ、二千年以上にわたって武将に、学者に、経営者に読み継がれてきました。読む人と時代が変われば、同じ一句から引き出されるものも変わります。</p>
          <p>ここでは各篇を「語る」「原典」「読み継ぐ」の三つの層に分けて並べています。どこから読んでも構いません。</p>
          <div class="overview-actions">
            <a class="action-primary" href="#chapter-1">第一篇 始計から読む</a>
            <a class="action-secondary" href="#sonshi">孫子という人</a>
          </div>
        </div>
      </section>

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
      </section>

      <aside class="source-note">表紙の山水：画像生成AIで制作した水墨画をもとに、墨の濃淡だけを取り出して用いています。</aside>

      ${pagerTemplate(chapterStop(chapters[0], "はじめの篇"), personStop)}`;
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
      <header class="opening opening--person">
        <p class="opening-ghost" lang="zh-Hant" aria-hidden="true">${escapeHtml(person.ghost)}</p>
        <h1 class="daisen"><span class="daisen-number">附録</span><span class="daisen-name">孫子という人</span></h1>
        <div class="opening-body">
          <p class="chapter-subtitle">孫武、春秋の兵法家</p>
          <div class="chapter-lead">${person.lead.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
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

      <section class="person-section person-real" aria-labelledby="person-real-title">
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

      ${pagerTemplate(overviewStop, chapterStop(last, "前の篇"))}`;
  };

  // ---- ナビゲーション ----

  // 上端の小さな竹簡。表紙と同じく、右の始計から左の用間へ並べる
  const slipnavTemplate = () => `
    <a class="mini-end" href="#overview" data-view="overview">総覧</a>
    <ol class="mini-slips">
      ${chapters
        .map(
          (chapter) => `<li${groupStarts.has(chapter.id) && chapter.id > 1 ? ' class="group-start"' : ""}>
            <a class="mini-slip" href="#chapter-${chapter.id}" data-chapter="${chapter.id}" aria-label="第${chapter.idKanji}篇 ${escapeHtml(chapter.name)}">
              <span class="mini-name" aria-hidden="true">${escapeHtml(chapter.name)}</span>
              <span class="mini-tip" aria-hidden="true"><b>第${chapter.idKanji}篇</b>${escapeHtml(chapter.subtitle)}</span>
            </a>
          </li>`,
        )
        .join("")}
    </ol>
    <a class="mini-end" href="#sonshi" data-view="person">附録</a>`;

  const sectionLinks = (className) => `
    <span class="${className}" data-sections hidden>
      ${parts.map((part) => `<a href="#part-${part.key}" data-jump data-part-link="${part.key}">${part.name}</a>`).join("")}
    </span>`;

  // 狭い画面の目次。十三本の竹簡を、右上から左へ二段に並べる
  const tocTemplate = () => `
    ${sectionLinks("toc-sections")}
    <ol class="toc-slips">
      ${chapters
        .map(
          (chapter) => `<li>
            <a class="toc-slip" href="#chapter-${chapter.id}" data-chapter="${chapter.id}">
              <span class="toc-slip-number">第${chapter.idKanji}篇</span>
              <span class="toc-slip-name">${escapeHtml(chapter.name)}</span>
              <span class="toc-slip-sub">${escapeHtml(chapter.subtitle)}</span>
            </a>
          </li>`,
        )
        .join("")}
    </ol>
    <div class="toc-ends">
      <a class="toc-end" href="#overview" data-view="overview"><span class="toc-end-glyph" aria-hidden="true">覧</span><span><span class="toc-end-name">総覧</span><span class="toc-end-sub">十三篇を見渡す</span></span></a>
      <a class="toc-end" href="#sonshi" data-view="person"><span class="toc-end-glyph" aria-hidden="true">人</span><span><span class="toc-end-name">孫子という人</span><span class="toc-end-sub">十三篇を著した人</span></span></a>
    </div>`;

  const updateNav = (view, chapterId) => {
    document.body.dataset.view = view;
    document.querySelectorAll("[data-sections]").forEach((section) => {
      section.hidden = view !== "chapter";
    });
    document.querySelectorAll("[data-chapter]").forEach((link) => {
      const selected = view === "chapter" && Number(link.dataset.chapter) === chapterId;
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-view]:not(body)").forEach((link) => {
      if (link.dataset.view === view) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const chapter = chapters[chapterId - 1];
    headerPlace.innerHTML =
      view === "chapter"
        ? `<span class="place-title">第${chapter.idKanji}篇<span>${escapeHtml(chapter.name)}</span></span>${sectionLinks("place-sections")}`
        : `<span class="place-title">${view === "person" ? "孫子という人" : "孫子兵法 十三篇"}</span>`;
    headerPlace.querySelector("[data-sections]")?.removeAttribute("hidden");
  };

  // 名句へは頭から、進言の一句へは前後の文と一緒に見えるように送る
  // ページ内を移ったあとも上端は出したままにして、目次へすぐ戻れるようにする
  let holdHeaderUntil = 0;
  const jumpTo = (target) => {
    if (!target) return;
    holdHeaderUntil = performance.now() + 400;
    document.body.removeAttribute("data-header-away");
    if (!target.matches("a[href], button, [tabindex]")) target.setAttribute("tabindex", "-1");
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
      if (toc.open) toc.close();
      jumpTo(content.querySelector(jump.getAttribute("href")));
      return;
    }
    const move = event.target.closest("[data-tate-move]");
    if (move) {
      const panel = move.closest(".tate-frame").querySelector(".tate");
      panel.scrollBy({
        left: panel.clientWidth * (move.dataset.tateMove === "forward" ? -0.8 : 0.8),
        behavior: calm.matches ? "instant" : "smooth",
      });
      return;
    }
    const writing = event.target.closest("[data-writing]");
    if (writing && writing.tagName === "BUTTON") {
      const container = writing.closest(".layer").querySelector(".kundoku");
      container.dataset.writing = writing.dataset.writing;
      writing.parentElement.querySelectorAll("button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button === writing));
      });
      updateTateControls();
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

  const updateTateControls = () => {
    content.querySelectorAll(".tate").forEach((panel) => {
      const controls = panel.nextElementSibling;
      const extent = panel.scrollWidth - panel.clientWidth;
      const position = Math.abs(panel.scrollLeft);
      controls.querySelector('[data-tate-move="forward"]').disabled = position >= extent - 1;
      controls.querySelector('[data-tate-move="back"]').disabled = position <= 1;
    });
  };
  content.addEventListener("scroll", (event) => {
    if (event.target.matches(".tate")) updateTateControls();
  }, true);
  window.addEventListener("resize", updateTateControls);

  // いま読んでいる部を、上端の見出しと目次に示す
  const partObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const key = entry.target.dataset.part;
        document.querySelectorAll("[data-part-link]").forEach((link) => {
          if (link.dataset.partLink === key) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );

  // 表紙の竹簡が見えているあいだは、上端の竹簡をしまっておく
  const coverObserver = new IntersectionObserver(([entry]) => {
    document.body.toggleAttribute("data-cover-visible", entry.isIntersecting);
  });

  // 読み進めるときは上端を退け、戻ろうとしたら出す
  let lastY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (performance.now() < holdHeaderUntil) {
        lastY = y;
        document.body.toggleAttribute("data-scrolled", y > 8);
        return;
      }
      if (Math.abs(y - lastY) < 6) return;
      document.body.toggleAttribute("data-header-away", y > lastY && y > 160);
      document.body.toggleAttribute("data-scrolled", y > 8);
      lastY = y;
    },
    { passive: true },
  );

  const observe = () => {
    partObserver.disconnect();
    coverObserver.disconnect();
    content.querySelectorAll("[data-part]").forEach((section) => partObserver.observe(section));
    const slips = content.querySelector(".slips-frame");
    if (slips) coverObserver.observe(slips);
    else document.body.removeAttribute("data-cover-visible");
  };

  let shown = false;

  const show = (view, chapterId) => {
    const swap = () => {
      if (view === "chapter") renderChapter(chapters[chapterId - 1]);
      else if (view === "person") renderPerson();
      else renderOverview();
      updateNav(view, chapterId);
      updateTateControls();
      observe();
      window.scrollTo(0, 0);
      lastY = 0;
      document.body.removeAttribute("data-header-away");
      document.body.removeAttribute("data-scrolled");
      document.querySelector("#reading").focus({ preventScroll: true });
    };
    // 篇を移るときだけ、紙面をごく短く差し替える
    // 画面が隠れているときなどは差し替えだけが行われ、ready は拒否される
    if (shown && document.startViewTransition && !calm.matches) document.startViewTransition(swap).ready.catch(() => {});
    else swap();
    shown = true;
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
  });
  document.querySelector("#toc-close").addEventListener("click", () => toc.close());
  toc.addEventListener("click", (event) => {
    if (event.target === toc || event.target.closest("a")) toc.close();
  });
  window.matchMedia("(min-width: 861px)").addEventListener("change", (event) => {
    if (event.matches) toc.close();
  });

  slipnav.innerHTML = slipnavTemplate();
  tocNav.innerHTML = tocTemplate();
  window.addEventListener("hashchange", route);
  route();
})();
