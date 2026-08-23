(() => {
  "use strict";

  const chapters = window.SONSHI_CHAPTERS;
  const fullTexts = window.SONSHI_FULL_TEXTS;
  const desktopNav = document.querySelector("#desktop-nav");
  const mobileNav = document.querySelector("#mobile-nav");
  const content = document.querySelector("#chapter-content");
  const progressCurrent = document.querySelector("#progress-current");
  const progressBar = document.querySelector("#progress-bar");

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const stripOriginalPunctuation = (value) =>
    String(value).replace(/[，。；：！？、,.!?;:“”‘’「」『』（）()《》〈〉—…·﹁﹂\s]/g, "");

  const modernSayings = [
    [
      {
        original: "兵者詭道也",
        kundoku: "兵は詭道なり。",
        story: "この一節は「兵は詭道なり」という短い名句になりました。直後には、できてもできないように見せるなどの対句が続きます。名は、ここから残りました。「詭道」の二字で孫子の情報戦を言い表せるため、戦略論の入口として今も引かれます。",
        source: { label: "Web漢文大系「兵は詭道なり」", url: "https://kanbun.info/koji/heiwakido.html" },
      },
    ],
    [
      {
        original: "故兵聞拙速未睹巧之久也",
        kundoku: "故に兵は拙速を聞くも、いまだ巧の久しきを睹ざるなり。",
        story: "よく知られる「兵は拙速を尊ぶ」は、原文をそのまま抜いた句ではありません。原文は、拙くても速く終えた戦は聞くが、巧みな長期戦は見たことがない、と説きます。その警告が後世に短い格言へ縮まり、仕事の速さを説く場面にも広がりました。",
        source: { label: "Web漢文大系「兵は拙速を尊ぶ」", url: "https://kanbun.info/koji/heiwasesso.html" },
      },
    ],
    [
      {
        original: "百戰百勝非善之善者也不戰而屈人之兵善之善者也",
        kundoku: "百戦百勝は善の善なる者にあらず。戦わずして人の兵を屈するは、善の善なる者なり。",
        story: "「百戦百勝」より「戦わずして屈する」を上に置く逆説が、孫子を代表する考えとして繰り返し紹介されてきました。勝った回数だけを褒めません。損失を出さず目的を達することを勝利とするため、外交や経営にも読み替えられています。",
        source: { label: "Web漢文大系「孫子・謀攻篇」", url: "https://kanbun.info/shibu02/sonshi03.html" },
      },
      {
        original: "知彼知己者百戰不殆",
        kundoku: "彼を知り己を知れば、百戦殆うからず。",
        story: "この後には「自分だけを知れば一勝一敗」と続きます。どちらも知らなければ、戦うたびに危うい。相手と自分を対にした三段論法が、自己分析と相手理解の格言として戦争の外にも残りました。",
        source: { label: "Web漢文大系「彼を知り己を知れば百戦殆からず」", url: "https://kanbun.info/koji/karewoshiri.html" },
      },
    ],
    [],
    [],
    [
      {
        original: "水因地而制流兵因敵而制勝故兵無常勢水無常形",
        kundoku: "水は地に因りて流れを制し、兵は敵に因りて勝ちを制す。故に兵に常勢なく、水に常形なし。",
        story: "水が地形に従って姿を変えるという像は、固定した必勝法がないことを一目で伝え、変化への適応を説明する比喩として軍事の外へ持ち出しやすかったため、「兵に常勢無し」の形で故事名言に残りました。",
        source: { label: "Web漢文大系「兵に常勢無し」", url: "https://kanbun.info/koji/heinijosei.html" },
      },
    ],
    [
      {
        original: "軍爭之難者以迂爲直以患爲利故迂其途而誘之以利後人發先人至此知迂直之計者也",
        kundoku: "軍争の難きは、迂を以て直と為し、患を以て利と為す。故にその途を迂にして、これを誘うに利を以てし、人に後れて発し、人に先んじて至る。これ迂直の計を知る者なり。",
        story: "遠回りをしながら相手を別方向へ誘う。結果は逆です。こちらが先着します。この逆転に「迂直の計」という名が付いたため、戦略的な回り道を表す言葉として残りました。",
        source: { label: "Web漢文大系「迂直の計」", url: "https://kanbun.info/koji/uchoku.html" },
      },
      {
        original: "故其疾如風其徐如林侵掠如火不動如山難知如陰動如雷震",
        kundoku: "故にその疾きこと風の如く、その徐かなること林の如く、侵掠すること火の如く、動かざること山の如く、知り難きこと陰の如く、動くこと雷震の如し。",
        story: "原文は、風・林・火・山で終わりません。まだ続きます。「陰」と「雷」です。その前半四句を記した「孫子の旗」が武田信玄の軍旗として知られ、日本では四字の「風林火山」がとりわけ有名になりました。",
        source: { label: "甲府市「風林火山には続きがある!?」", url: "https://www.city.kofu.yamanashi.jp/senior/kamejii/035.html" },
      },
      {
        original: "以近待遠以佚待勞以飽待饑此治力者也",
        kundoku: "近きを以て遠きを待ち、佚を以て労を待ち、飽を以て飢を待つ。これ力を治むる者なり。",
        story: "自軍は近くで休み、食べた状態を保ち、遠来して疲れ、飢えた敵を待つという、対になる三組の言葉が戦う前に力の差を作る発想を簡潔に示すため、「佚を以て労を待つ」が独立した名句になりました。",
        source: { label: "Web漢文大系「佚を以て労を待つ」", url: "https://kanbun.info/koji/itsuworo.html" },
      },
      {
        original: "無邀正正之旗勿擊堂堂之陳",
        kundoku: "正々の旗を邀うることなく、堂々の陣を撃つことなかれ。",
        story: "現在の「正々堂々」は、公明正大に振る舞う意味で使われます。しかし原文は、旗列の整った「正々」の軍と、陣容の盛んな「堂々」の敵を攻めるなという戒めでした。二つの形容が結び付き、意味を広げながら四字熟語として定着しました。",
        source: { label: "Web漢文大系「正正堂堂」", url: "https://kanbun.info/koji/seiseidodo.html" },
      },
    ],
    [],
    [],
    [],
    [
      {
        original: "夫吳人與越人相惡也當其同舟而濟遇風其相救也如左右手",
        kundoku: "夫れ呉人と越人とは相悪むも、その舟を同じくして済り、風に遇うに当たりては、その相救うや左右の手の如し。",
        story: "呉と越は、敵国同士でした。ところが、同じ舟で暴風に遭う。すると左右の手のように助け合います。この小さな物語が「呉越同舟」という故事成語になり、仲の悪い者も共通の危機では協力するという意味で残りました。",
        source: { label: "Science Portal China「呉越同舟」", url: "https://spap.jst.go.jp/china/enjoy/kotowaza/kotowaza_006.html" },
      },
      {
        original: "故善用兵者譬如率然率然者常山之蛇也擊其首則尾至擊其尾則首至擊其中則首尾俱至",
        kundoku: "故に善く兵を用うる者は、譬えば率然の如し。率然とは常山の蛇なり。その首を撃てば尾至り、その尾を撃てば首至り、その中を撃てば首尾ともに至る。",
        story: "常山に住む蛇「率然」は、頭を攻めれば尾が、尾を攻めれば頭が、胴を攻めれば両方が助けに来るとされました。どこにも隙がなく互いに救援する陣形を一匹の蛇で描いた物語が、「常山の蛇勢」という言葉を残しました。",
        source: { label: "Web漢文大系「常山の蛇勢」", url: "https://kanbun.info/koji/jozan.html" },
      },
      {
        original: "是故始如處女敵人開戶後如脫兔敵不及拒",
        kundoku: "是の故に始めは処女の如く、敵人戸を開き、後には脱兎の如くして、敵拒ぐに及ばず。",
        story: "初めはおとなしく見せて相手に隙を作らせ、その瞬間には罠を逃れた兎のように動く。静と動の落差が鮮やかなため長い句のまま伝わり、後半からは「脱兎の勢い」という言い回しも生まれました。",
        source: { label: "Web漢文大系「始めは処女の如く、後は脱兎の如し」", url: "https://kanbun.info/koji/hajimewasho.html" },
      },
    ],
    [],
    [],
  ];

  const counselHighlights = [
    [{ phrase: "戦とは、欺きの道。", quoteIndex: 0 }],
    [{ phrase: "兵は、拙速を聞くも、巧久を見ず。", quoteIndex: 0 }],
    [
      { phrase: "一度も戦わずして百の敵を屈服させた者の方がよい。戦わずして人の兵を屈する。", quoteIndex: 0 },
      { phrase: "彼を知り、己を知れば、百戦して殆うからず。", quoteIndex: 1 },
    ],
    [],
    [],
    [{ phrase: "兵の形は、水に似ております。水は高きを避け、低きへ流れる。兵は敵の実を避け、虚を撃つ。", quoteIndex: 0 }],
    [
      { phrase: "遠回りを近道に変え、不利を利益へ変えること。", quoteIndex: 0 },
      { phrase: "速く動くときは風のように。静かに構えるときは林のように。攻め奪うときは火のように。動かぬときは山のように。", quoteIndex: 1 },
      { phrase: "近くで遠来の敵を待ち、休んで疲れた敵を待ち、食べて飢えた敵を待つ。", quoteIndex: 2 },
      { phrase: "敵の旗が整い、陣が堂々としているなら、無理に当たってはなりません。", quoteIndex: 3 },
    ],
    [],
    [],
    [],
    [
      { phrase: "呉と越の者は仇同士でも、同じ舟で嵐に遭えば、左右の手のように助け合う。", quoteIndex: 0 },
      { phrase: "頭を撃たれれば尾が救い、尾を撃たれれば頭が救い、中央を撃たれれば頭尾が共に応ずる。", quoteIndex: 1 },
      { phrase: "初めはおとなしく動きを隠し、敵に戸を開かせる。戸が開いたなら、逃げる兎のような速さで一気に入る。", quoteIndex: 2 },
    ],
    [],
    [],
  ];

  const chapterFromHash = () => {
    const match = window.location.hash.match(/^#chapter-(\d{1,2})$/);
    const number = match ? Number(match[1]) : 1;
    return Math.min(13, Math.max(1, number));
  };

  const createNavButton = (chapter, mobile = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-button";
    button.dataset.chapter = String(chapter.id);
    button.setAttribute("aria-label", `第${chapter.id}篇 ${chapter.name}を開く`);
    button.innerHTML = `<span class="chapter-number">${String(chapter.id).padStart(2, "0")}</span><span class="chapter-name">${escapeHtml(chapter.name)}</span>`;
    button.addEventListener("click", () => selectChapter(chapter.id, true));
    if (!mobile) {
      button.addEventListener("keydown", handleNavKeydown);
    }
    return button;
  };

  const handleNavKeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectChapter(Number(event.currentTarget.dataset.chapter), true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...desktopNav.querySelectorAll("button")];
    const currentIndex = buttons.indexOf(event.currentTarget);
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    buttons[nextIndex].focus();
  };

  const counselParagraphTemplate = (paragraph, index, chapter) => {
    const highlights = counselHighlights[chapter.id - 1];
    const plainParagraph = paragraph
      .replaceAll("<strong>", "")
      .replaceAll("</strong>", "")
      .replace(/^孫子は申し上げる。\s*/, "");
    if (!plainParagraph) return "";
    let paragraphHtml = escapeHtml(plainParagraph);
    highlights.forEach((highlight) => {
      if (!plainParagraph.includes(highlight.phrase)) return;
      const escapedPhrase = escapeHtml(highlight.phrase);
      paragraphHtml = paragraphHtml.replace(
        escapedPhrase,
        `<a class="term-link" href="#quote-${chapter.id}-${highlight.quoteIndex + 1}">${escapedPhrase}</a>`,
      );
    });
    return `<p>${paragraphHtml}</p>`;
  };

  const quoteTemplate = (quote, index, chapterId) => `
    <section id="quote-${chapterId}-${index + 1}" class="quote-entry" tabindex="-1">
      <p class="quote-kicker">名句 ${String(index + 1).padStart(2, "0")}</p>
      <blockquote class="quote-original" lang="zh-Hant">${escapeHtml(stripOriginalPunctuation(quote.original))}</blockquote>
      <p class="kundoku-label">書き下し</p>
      <p class="quote-kundoku">${escapeHtml(quote.kundoku)}</p>
      <p class="story-label">この言葉の来歴</p>
      <p class="quote-story">${escapeHtml(quote.story)}</p>
      <p class="quote-source"><a href="${escapeHtml(quote.source.url)}" target="_blank" rel="noreferrer">${escapeHtml(quote.source.label)}</a></p>
    </section>`;

  const renderChapter = (chapter) => {
    const next = chapters[chapter.id % chapters.length];
    const fullText = fullTexts[chapter.id - 1];
    const sayings = modernSayings[chapter.id - 1];
    const sayingsSection = sayings.length
      ? `<section class="section" aria-labelledby="quotes-title">
          <h2 id="quotes-title" class="section-title">現代に残る言葉</h2>
          <p class="original-note">原文には、後世に補われた句読点を表示していません。</p>
          <div class="quotes">${sayings.map((quote, index) => quoteTemplate(quote, index, chapter.id)).join("")}</div>
        </section>`
      : "";
    document.title = `第${chapter.id}篇 ${chapter.name}｜孫子兵法 十三篇`;
    content.innerHTML = `
      <header class="chapter-header">
        <h1 class="chapter-title">第${chapter.idKanji}篇　${escapeHtml(chapter.name)}</h1>
        <p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>
        <p class="chapter-lead">${escapeHtml(chapter.lead)}</p>
      </header>

      <section class="section" aria-labelledby="counsel-title">
        <h2 id="counsel-title" class="section-title">軍師の進言</h2>
        <div class="counsel">
          ${chapter.counsel.map((paragraph, index) => counselParagraphTemplate(paragraph, index, chapter)).join("")}
        </div>
      </section>

      ${sayingsSection}

      <section class="section supplement" aria-labelledby="supplement-title">
        <h2 id="supplement-title" class="section-title">補足資料</h2>
        <section class="full-text-block" aria-labelledby="full-original-title">
          <h3 id="full-original-title">原文</h3>
          <div class="full-text full-original" lang="zh-Hant">
            ${fullText.original.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </div>
        </section>
        <section class="full-text-block" aria-labelledby="full-kundoku-title">
          <h3 id="full-kundoku-title">書き下し文</h3>
          <div class="full-text full-kundoku">
            ${fullText.kundoku.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </div>
        </section>
      </section>

      <aside class="source-note">
        原文は『孫子兵法』通行本を参照し、原文表示から現代的な句読点を除いています。書き下し文は1935年刊『武経七書』所収本文によります。篇や伝本によって異字があります。<br />
        全文：<a href="https://zh.wikisource.org/zh-hant/%E5%AD%AB%E5%AD%90%E5%85%B5%E6%B3%95" target="_blank" rel="noreferrer">中国語版Wikisource『孫子兵法』</a> ／ <a href="https://ja.wikisource.org/wiki/%E5%AD%AB%E5%AD%90_(%E6%AD%A6%E7%B6%93%E4%B8%83%E6%9B%B8)" target="_blank" rel="noreferrer">日本語版Wikisource『孫子（武経七書）』</a><br />
        参照：${chapter.sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>`).join(" ／ ")}
      </aside>

      <div class="next-row">
        <button class="next-button" type="button" data-next="${next.id}">
          次の篇　${escapeHtml(next.name)}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`;

    content.querySelectorAll(".term-link").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const target = content.querySelector(link.getAttribute("href"));
        target.focus({ preventScroll: true });
        const headerOffset = document.querySelector(".site-header")?.offsetHeight ?? 0;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset - 24;
        window.scrollTo(0, targetTop);
      });
    });

    content.querySelector(".next-button").addEventListener("click", (event) => {
      selectChapter(Number(event.currentTarget.dataset.next), true);
    });
  };

  function selectChapter(id, updateHash = false) {
    const chapter = chapters[id - 1] || chapters[0];
    if (updateHash && window.location.hash !== `#chapter-${chapter.id}`) {
      history.pushState(null, "", `#chapter-${chapter.id}`);
    }

    renderChapter(chapter);
    document.querySelectorAll(".chapter-button").forEach((button) => {
      const selected = Number(button.dataset.chapter) === chapter.id;
      button.toggleAttribute("aria-current", selected);
      if (selected) {
        button.setAttribute("aria-current", "page");
        if (button.closest("#mobile-nav")) {
          const nav = button.closest("#mobile-nav");
          const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
          const left = button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2;
          nav.scrollTo({ left: Math.max(0, left), behavior });
        }
      }
    });
    progressCurrent.textContent = String(chapter.id);
    progressBar.style.width = `${(chapter.id / 13) * 100}%`;

    if (updateHash) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      window.scrollTo({ top: 0, behavior });
      document.querySelector("#reading").focus({ preventScroll: true });
    }
  }

  chapters.forEach((chapter) => {
    desktopNav.append(createNavButton(chapter));
    mobileNav.append(createNavButton(chapter, true));
  });

  window.addEventListener("hashchange", () => {
    if (/^#chapter-\d{1,2}$/.test(window.location.hash)) selectChapter(chapterFromHash());
  });
  window.addEventListener("popstate", () => {
    if (/^#chapter-\d{1,2}$/.test(window.location.hash)) selectChapter(chapterFromHash());
  });
  selectChapter(chapterFromHash());
})();
