(() => {
  "use strict";

  const chapters = window.SONSHI_CHAPTERS;
  const fullTexts = window.SONSHI_FULL_TEXTS;
  const asides = window.SONSHI_ASIDES;
  const sayings = window.SONSHI_SAYINGS;
  const highlights = window.SONSHI_HIGHLIGHTS;
  const person = window.SONSHI_PERSON;

  // データからHTMLを生成する。DOMの更新や画面操作は app.js が受け持つ。
  // 一つの篇を、性格の異なる三つの帖に綴じ分け、一帖ずつめくって読む
  const chos = [
    { key: "kataru", numeral: "壱", name: "語る", layers: ["軍師の進言"], note: "各篇の原文を順に読み、今の日本語へ移しました。軍師が王に語りかける形に再構成した本文です。" },
    { key: "genten", numeral: "弐", name: "原典", layers: ["現代に残る言葉", "原文", "書き下し文"], note: "二千年以上書き写されてきた漢文と、それを日本語の語順で読み下した文です。" },
    { key: "yomitsugu", numeral: "参", name: "読み継ぐ", layers: ["余話", "こんなところにも"], note: "後の時代にどう読まれ、どこで引かれてきたか。どれも数ある読みの一つです。" },
  ];
  const choKeys = chos.map((cho) => cho.key);
  const choByKey = Object.fromEntries(chos.map((cho) => [cho.key, cho]));
  const groups = [
    { name: "計る", note: "戦う前に量り、損なわずに勝つ", ids: [1, 2, 3] },
    { name: "形と勢", note: "負けぬ形を作り、勢いを生み、虚を撃つ", ids: [4, 5, 6] },
    { name: "動く", note: "先を争い、変に応じ、兆しを読む", ids: [7, 8, 9] },
    { name: "地", note: "地を読み、置かれた場の人の心を読む", ids: [10, 11] },
    { name: "火と間", note: "強い手段の自制と、先に知ること", ids: [12, 13] },
  ];
  const groupStarts = new Set(groups.map((group) => group.ids[0]));

  // 帖のURL。語るの帖は篇のURLそのもの
  const choHref = (chapterId, key = "kataru") => `#chapter-${chapterId}${key === "kataru" ? "" : `/${key}`}`;

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const stripOriginalPunctuation = (value) =>
    String(value).replace(/[，。；：！？、,.!?;:“”‘’「」『』（）()《》〈〉—…·﹁﹂\s]/g, "");

  const sourceLink = (source) =>
    `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>`;

  const sourceLinks = (sources) => sources.map(sourceLink).join(" ／ ");

  const paragraphsTemplate = (paragraphs, format = escapeHtml) =>
    paragraphs.map((paragraph) => `<p>${format(paragraph)}</p>`).join("");

  // 扉や行き先の背後に、その篇の書き出しを薄墨で透かす
  const ghostText = (chapterId, length) => escapeHtml(fullTexts[chapterId - 1].original.join("").slice(0, length));

  // 帖札。広い画面では本文の左の余白に縦に掛け、狭い画面では下端に並べる
  const choNav = (chapter, current) => `
    <nav class="cho-nav" aria-label="第${chapter.idKanji}篇の帖">
      ${chos
        .map(
          // どの帖へも帖の頭へ送る。語るでは扉を飛ばして進言の頭に着く
          (cho) => `<a id="cho-tab-${cho.key}" class="cho-tab cho-tab--${cho.key}" href="${choHref(chapter.id, cho.key)}" data-target="cho"${cho.key === current ? ' aria-current="page"' : ""}>
            <span class="cho-tab-numeral" aria-hidden="true">${cho.numeral}</span><span class="cho-tab-name">${cho.name}</span>
          </a>`,
        )
        .join("")}
    </nav>`;

  // 書き下し文は句点ごとに行を改め、一文ずつ読めるようにする
  const sentencesTemplate = (paragraph) =>
    paragraph
      .split(/(?<=。)/)
      .map((sentence) => `<span class="ku">${escapeHtml(sentence)}</span>`)
      .join("");

  // 縦組みの本文。右から左へ読み進める
  const tatePanel = (paragraphs, { className = "", label, lang = "", ku = false }) => {
    const panelId = ku ? "kundoku-tate" : "original-tate";
    return `
    <div class="tate-frame ${className}">
      <div id="${panelId}" class="tate"${lang ? ` lang="${lang}"` : ""} tabindex="0" role="region" aria-label="${escapeHtml(label)}（縦書き・横にスクロール）">
        ${paragraphsTemplate(paragraphs, ku ? sentencesTemplate : escapeHtml)}
      </div>
      <div class="tate-controls" role="group" aria-label="${escapeHtml(label)}の移動">
        <button type="button" data-tate-move="forward" aria-controls="${panelId}">左へ読む</button>
        <span class="tate-hint">右から左へ</span>
        <button type="button" data-tate-move="back" aria-controls="${panelId}" disabled>右へ戻る</button>
      </div>
    </div>`;
  };

  // 名句を含む段には、余白に名句の名を傍注のように添える。名句そのものは原典の帖にある
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
            `<a id="mark-${chapter.id}-${mark.quoteIndex + 1}" class="term-link" href="${choHref(chapter.id, "genten")}" data-target="quote-${chapter.id}-${mark.quoteIndex + 1}">${phrase}</a>`,
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
        <h3 class="saying-name">${escapeHtml(saying.name)}</h3>
        <p class="saying-kundoku">${escapeHtml(saying.kundoku)}</p>
        <p class="saying-story"><span class="inline-label">来歴</span>${escapeHtml(saying.story)}</p>
        <p class="saying-foot">
          <span class="saying-source">${sourceLink(saying.source)}</span>
          ${marked ? `<a id="back-${chapterId}-${index + 1}" class="saying-back" href="${choHref(chapterId)}" data-target="mark-${chapterId}-${index + 1}">進言の中で読む</a>` : ""}
        </p>
      </div>
    </article>`;
  };

  const asideTemplate = (aside) => `
    <div class="aside">
      <h2 class="aside-title">${escapeHtml(aside.title)}</h2>
      <ol class="aside-layers">
        ${aside.layers
          .map((layer) => `<li><p class="aside-era">${escapeHtml(layer.era)}</p><p class="aside-text">${escapeHtml(layer.text)}</p></li>`)
          .join("")}
      </ol>
      <p class="aside-takeaway">${escapeHtml(aside.takeaway)}</p>
      ${
        aside.mentions?.length
          ? `<section class="aside-mentions" aria-labelledby="mentions-title">
              <h2 id="mentions-title" class="layer-title">こんなところにも</h2>
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
      <button type="button" data-writing="yoko" aria-controls="kundoku-content" aria-pressed="true">横書き</button>
      <button type="button" data-writing="tate" aria-controls="kundoku-content" aria-pressed="false">縦書き</button>
    </div>`;

  const kundokuTemplate = (paragraphs) => `
    <div id="kundoku-content" class="kundoku">
      <ol class="kundoku-yoko">
        ${paragraphs
          .map((paragraph, index) =>
            // 巻末の「孫子終」は段ではないので、番号を付けずに結びとして置く
            paragraph === "孫子終"
              ? `<li class="kundoku-end"><p>${escapeHtml(paragraph)}</p></li>`
              : `<li><span class="dan" aria-hidden="true">${"一二三四五六七八九"[index]}</span><p>${sentencesTemplate(paragraph)}</p></li>`,
          )
          .join("")}
      </ol>
      ${tatePanel(paragraphs, { className: "tate-frame--paper", label: "書き下し文", ku: true })}
    </div>`;

  // 原文と書き下し文を並べて読む。広い画面では、書き下し文を読み進めると脇の原文も送られる
  const textsTemplate = (fullText) => `
    <section class="texts" data-writing="yoko" aria-label="原文と書き下し文">
      <div class="texts-kundoku">
        <header class="layer-head">
          <h2 id="sec-kundoku-title" class="layer-title">書き下し文</h2>${kundokuSwitch}
        </header>
        ${kundokuTemplate(fullText.kundoku)}
      </div>
      <div class="texts-original">
        <header class="layer-head">
          <h2 id="sec-original-title" class="layer-title">原文</h2>
        </header>
        ${tatePanel(fullText.original, { className: "tate-frame--sumi", label: "原文", lang: "zh-Hant" })}
      </div>
    </section>`;

  // 先へは大きく、もう一つの行き先は控えめに置く
  const overviewStop = { href: "#overview", direction: "はじめへ", name: "総覧", sub: "十三篇を見渡す" };
  const personStop = { href: "#sonshi", direction: "附録", name: "孫子という人", sub: "十三篇の著者として伝わる人" };
  const chapterStop = (chapter, direction) => ({
    href: choHref(chapter.id),
    direction,
    number: `第${chapter.idKanji}篇`,
    name: chapter.name,
    sub: chapter.subtitle,
    ghost: ghostText(chapter.id, 64).slice(3),
  });

  // 同じ篇の次の帖。添え書きはその篇の書き出しや余話の題にして、どの篇でも同じ説明を繰り返さない
  const choStop = (chapter, key) => {
    const cho = choByKey[key];
    const sub = key === "genten" ? `${fullTexts[chapter.id - 1].kundoku[0].split("。")[0]}。` : asides[chapter.id - 1].title;
    return { href: choHref(chapter.id, key), direction: "次の帖", number: cho.numeral, name: cho.name, sub, cho: key, ghost: key === "genten" ? ghostText(chapter.id, 64).slice(3) : "" };
  };

  const pagerTemplate = (next, other) => `
    <nav class="pager" aria-label="移動">
      <a id="pager-next" class="pager-next${next.cho ? ` pager-next--${next.cho}` : ""}" href="${next.href}">
        ${next.ghost ? `<span class="pager-ghost" lang="zh-Hant" aria-hidden="true">${next.ghost}</span>` : ""}
        <span class="pager-direction">${next.direction}</span>
        <span class="pager-name">${next.number ? `<span class="pager-number">${next.number}</span>` : ""}${escapeHtml(next.name)}</span>
        <span class="pager-sub">${escapeHtml(next.sub)}</span>
      </a>
      <a id="pager-other" class="pager-other" href="${other.href}"><span class="pager-direction">${other.direction}</span>${other.number ? `${other.number}　` : ""}${escapeHtml(other.name)}</a>
    </nav>`;

  const chapterPager = (chapter, key) => {
    const prev = chapters[chapter.id - 2];
    const next = chapters[chapter.id];
    const nextChapter = next ? chapterStop(next, "次の篇") : personStop;
    if (key === "kataru") return pagerTemplate(choStop(chapter, "genten"), nextChapter);
    if (key === "genten") return pagerTemplate(choStop(chapter, "yomitsugu"), nextChapter);
    return pagerTemplate(nextChapter, prev ? chapterStop(prev, "前の篇") : overviewStop);
  };

  // 原典と読み継ぐの帖の頭。篇の名を小さく、帖の名を大きく掲げる
  const choHead = (chapter, key) => {
    const cho = choByKey[key];
    return `
      <header class="cho-head">
        ${key === "genten" ? `<p class="opening-ghost" lang="zh-Hant" aria-hidden="true">${ghostText(chapter.id, 160)}</p>` : ""}
        <h1 class="cho-title"><span class="cho-chapter">第${chapter.idKanji}篇 ${escapeHtml(chapter.name)}</span> <span class="cho-name"><span class="cho-numeral" aria-hidden="true">${cho.numeral}</span>${cho.name}</span></h1>
      </header>`;
  };

  const chapterOpening = (chapter) => `
      <header class="opening">
        <p class="opening-ghost" lang="zh-Hant" aria-hidden="true">${ghostText(chapter.id, 160)}</p>
        <h1 class="daisen"><span class="daisen-number">第${chapter.idKanji}篇</span><span class="daisen-name">${escapeHtml(chapter.name)}</span></h1>
        <div class="opening-body">
          <p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>
          <p class="chapter-lead">${escapeHtml(chapter.lead)}</p>
        </div>
      </header>`;

  const sourceNote = (chapter, fullText) => `
      <aside class="source-note">
        原文は中国語版Wikisourceの通行本から、句読点と校異注を除いています。書き下し文は1935年刊『武経七書』所収本文によります。明らかな誤植・転記の誤りは補正しました。名句は各出典の本文・訓読によります。底本によって異字や読みの違いがあります。<br />
        ${fullText.corrections ? `書き下し文の補正：${escapeHtml(fullText.corrections)}<br />` : ""}
        全文：<a href="https://zh.wikisource.org/zh-hant/%E5%AD%AB%E5%AD%90%E5%85%B5%E6%B3%95" target="_blank" rel="noreferrer">中国語版Wikisource『孫子兵法』</a> ／ <a href="https://ja.wikisource.org/wiki/%E5%AD%AB%E5%AD%90_(%E6%AD%A6%E7%B6%93%E4%B8%83%E6%9B%B8)" target="_blank" rel="noreferrer">日本語版Wikisource『孫子（武経七書）』</a><br />
        参照：${sourceLinks(chapter.sources)}
      </aside>`;

  const choBody = (chapter, key) => {
    if (key === "kataru") return `<div class="counsel">${counselTemplate(chapter)}</div>`;
    if (key === "yomitsugu") return asideTemplate(asides[chapter.id - 1]);
    const chapterSayings = sayings[chapter.id - 1];
    const sayingsHtml = chapterSayings.length
      ? `<section class="layer layer--sayings" aria-labelledby="sec-sayings-title">
          <header class="layer-head"><h2 id="sec-sayings-title" class="layer-title">現代に残る言葉</h2></header>
          <div class="sayings">${chapterSayings.map((saying, index) => sayingTemplate(saying, index, chapter.id)).join("")}</div>
        </section>`
      : "";
    return `${sayingsHtml}${textsTemplate(fullTexts[chapter.id - 1])}`;
  };

  const chapterTemplate = (chapter, key = "kataru") => `
      ${key === "kataru" ? chapterOpening(chapter) : ""}
      <div id="cho" class="cho cho--${key}" data-cho="${key}">
        ${choNav(chapter, key)}
        <div class="cho-body">
          ${key === "kataru" ? "" : choHead(chapter, key)}
          ${choBody(chapter, key)}
        </div>
      </div>
      ${key === "genten" ? sourceNote(chapter, fullTexts[chapter.id - 1]) : ""}
      ${chapterPager(chapter, key)}`;

  // 三つの帖の説明から、第一篇のその帖をそのまま開ける
  const legendTemplate = () => `
    <ol class="legend">
      ${chos
        .map(
          (cho) => `
        <li>
          <a id="legend-${cho.key}" class="legend-part legend-part--${cho.key}" href="${choHref(1, cho.key)}">
            <span class="legend-head"><span class="legend-numeral" aria-hidden="true">${cho.numeral}</span><strong class="legend-title">${cho.name}</strong></span>
            <span class="legend-layers">${cho.layers.join("・")}</span>
            <span class="legend-note">${escapeHtml(cho.note)}</span>
            <span class="legend-open">第一篇 始計で開く</span>
          </a>
        </li>`,
        )
        .join("")}
    </ol>`;

  // 十三篇を、編紐で綴じた十三本の竹簡として並べる。右の題から左へ読み進める
  // まとまりの最初の竹簡に、そのまとまりの名を添える
  const slipTemplate = (chapter, index) => {
    const group = groups.find((item) => item.ids[0] === chapter.id);
    return `
    <li style="--i: ${index}"${group && index > 0 ? ' class="group-start"' : ""}>
      <a id="slip-${chapter.id}" class="slip" href="${choHref(chapter.id)}">
        <span class="slip-number">第${chapter.idKanji}篇</span>
        <span class="slip-name">${escapeHtml(chapter.name)}</span>
        <span class="slip-sub">${escapeHtml(chapter.subtitle)}</span>
      </a>
      ${group ? `<p class="slip-group" style="--span: ${group.ids.length}"><b>${escapeHtml(group.name)}</b><span>${escapeHtml(group.note)}</span></p>` : ""}
    </li>`;
  };

  const overviewTemplate = () => `
      <header class="cover">
        <div class="cover-art" aria-hidden="true"></div>
        <div class="cover-scroll">
          <h1 class="cover-title"><span class="cover-name">孫子兵法</span><span class="cover-seal">十三篇</span></h1>
          <p class="cover-kicker">古代中国の兵法書を、いくつもの層で読む</p>
          <div class="slips-frame" tabindex="0" role="region" aria-label="十三篇の竹簡。右の始計から左の用間へ">
            <ol class="slips" aria-label="十三篇">${chapters.map(slipTemplate).join("")}</ol>
          </div>
        </div>
        <p class="slips-hint">右の始計から、左の用間へ<span>横に繰る</span></p>
        <p class="slips-note">篇の区切りは伝本のとおり。まとまりの名は、見渡すための目安として付けたものです。</p>
      </header>

      <section class="cover-intro" aria-label="はじめに">
        <p class="cover-motto" lang="zh-Hant" aria-hidden="true">兵者國之大事</p>
        <div class="cover-lead">
          <p>十三篇、およそ六千字。戦のための書として書かれ、二千年以上にわたって武将に、学者に、経営者に読み継がれてきました。読む人と時代が変われば、同じ一句から引き出されるものも変わります。</p>
          <p>ここでは各篇を「語る」「原典」「読み継ぐ」の三つの帖に綴じ分けています。どの帖から読んでも構いません。</p>
          <div class="overview-actions">
            <a class="action-primary" href="${choHref(1)}">第一篇 始計から読む</a>
            <a class="action-secondary" href="#sonshi">孫子という人</a>
          </div>
        </div>
      </section>

      <section class="overview-section" aria-labelledby="legend-title">
        <h2 id="legend-title" class="overview-heading"><span>一篇の読み方</span></h2>
        ${legendTemplate()}
      </section>

      <aside class="source-note">表紙の山水：画像生成AIで制作した水墨画をもとに、墨の濃淡だけを取り出して用いています。</aside>

      ${pagerTemplate(chapterStop(chapters[0], "はじめの篇"), personStop)}`;

  const figureTemplate = (figure, className) => `
    <figure class="${className}">
      <img src="${escapeHtml(figure.src)}" alt="${escapeHtml(figure.alt)}" loading="lazy" decoding="async" />
      <figcaption>${escapeHtml(figure.caption)}</figcaption>
    </figure>`;

  const personTemplate = () => {
    const last = chapters[chapters.length - 1];
    return `
      <header class="opening opening--person">
        <p class="opening-ghost" lang="zh-Hant" aria-hidden="true">${escapeHtml(person.ghost)}</p>
        <h1 class="daisen"><span class="daisen-number">附録</span><span class="daisen-name">孫子という人</span></h1>
        <div class="opening-body">
          <p class="chapter-subtitle">孫武、春秋の兵法家</p>
          <div class="chapter-lead">${paragraphsTemplate(person.lead)}</div>
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
        <div class="person-prose">${paragraphsTemplate(person.real.paragraphs)}</div>
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

  // ---- ナビゲーションのHTML ----

  // 上端の小さな竹簡。表紙と同じく、右の始計から左の用間へ並べる
  const slipnavTemplate = () => `
    <a class="mini-end" href="#overview" data-view="overview">総覧</a>
    <ol class="mini-slips">
      ${chapters
        .map(
          (chapter) => `<li${groupStarts.has(chapter.id) && chapter.id > 1 ? ' class="group-start"' : ""}>
            <a id="mini-slip-${chapter.id}" class="mini-slip" href="${choHref(chapter.id)}" data-chapter="${chapter.id}" aria-label="第${chapter.idKanji}篇 ${escapeHtml(chapter.name)}">
              <span class="mini-name" aria-hidden="true">${escapeHtml(chapter.name)}</span>
              <span class="mini-tip" aria-hidden="true"><b>第${chapter.idKanji}篇</b>${escapeHtml(chapter.subtitle)}</span>
            </a>
          </li>`,
        )
        .join("")}
    </ol>
    <a class="mini-end" href="#sonshi" data-view="person">附録</a>`;

  // 狭い画面の目次。十三本の竹簡を、右上から左へ二段に並べる
  const tocTemplate = () => `
    <ol class="toc-slips">
      ${chapters
        .map(
          (chapter) => `<li>
            <a class="toc-slip" href="${choHref(chapter.id)}" data-chapter="${chapter.id}">
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
      <a class="toc-end" href="#sonshi" data-view="person"><span class="toc-end-glyph" aria-hidden="true">人</span><span><span class="toc-end-name">孫子という人</span><span class="toc-end-sub">十三篇とその著者</span></span></a>
    </div>`;

  const headerTemplate = (view, chapterId, key = "kataru") => {
    const chapter = chapters[chapterId - 1];
    if (view !== "chapter") return `<span class="place-title">${view === "person" ? "孫子という人" : "孫子兵法 十三篇"}</span>`;
    const cho = choByKey[key];
    return `<span class="place-title">第${chapter.idKanji}篇<span>${escapeHtml(chapter.name)}</span></span><span class="place-cho place-cho--${key}"><span aria-hidden="true">${cho.numeral}</span>${cho.name}</span>`;
  };

  window.SONSHI_TEMPLATES = {
    choKeys,
    choHref,
    chapterTemplate,
    overviewTemplate,
    personTemplate,
    slipnavTemplate,
    tocTemplate,
    headerTemplate,
  };
})();
