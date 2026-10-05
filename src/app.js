(() => {
  "use strict";

  const chapters = window.SONSHI_CHAPTERS;
  const templates = window.SONSHI_TEMPLATES;
  const root = document.documentElement;
  const content = document.querySelector("#chapter-content");
  const slipnav = document.querySelector("#slipnav");
  const tocNav = document.querySelector("#toc-nav");
  const toc = document.querySelector("#toc");
  const tocOpen = document.querySelector("#toc-open");
  const reading = document.querySelector("#reading");
  const headerPlace = document.querySelector("#header-place");
  const themeColors = document.querySelectorAll('meta[name="theme-color"]');
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const choNames = { kataru: "語る", genten: "原典", yomitsugu: "読み継ぐ" };

  // 帖をめくって戻ったときは、めくる前に読んでいた位置へ戻す。履歴の項目に持たせるだけで、保存はしない
  // 押したリンク、書き下し文の組み方と縦書きの欄の位置も同じ項目に持たせ、戻ったときにそろえて返す
  history.scrollRestoration = "manual";
  const rememberScroll = (link) => {
    const texts = content.querySelector(".texts");
    const kundoku = texts?.querySelector("#kundoku-tate");
    history.replaceState(
      {
        ...history.state,
        y: window.scrollY,
        focus: link === undefined ? (history.state?.focus ?? "") : link.id,
        writing: texts?.dataset.writing ?? "",
        kundokuLeft: kundoku ? kundoku.scrollLeft : 0,
      },
      "",
    );
  };
  // 戻る・進むで離れても読んでいた位置に帰れるよう、間引いて覚えておく
  let rememberTimer = 0;
  const rememberLater = () => {
    clearTimeout(rememberTimer);
    rememberTimer = setTimeout(() => rememberScroll(), 200);
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // ---- ナビゲーション ----

  const setCurrent = (link, selected, value) => {
    if (selected) link.setAttribute("aria-current", value);
    else link.removeAttribute("aria-current");
  };

  const updateNav = (view, chapterId, cho) => {
    document.body.dataset.view = view;
    if (view === "chapter") root.dataset.cho = cho;
    else delete root.dataset.cho;
    document.querySelectorAll("[data-chapter]").forEach((link) => {
      setCurrent(link, view === "chapter" && Number(link.dataset.chapter) === chapterId, "page");
    });
    document.querySelectorAll("[data-view]:not(body)").forEach((link) => {
      setCurrent(link, link.dataset.view === view, "page");
    });
    headerPlace.innerHTML = templates.headerTemplate(view, chapterId, cho);
    updateThemeColor();
  };

  // 原典の帖では紙面が墨色になるので、ブラウザの縁の色も合わせる
  const updateThemeColor = () => {
    const paper = getComputedStyle(root).getPropertyValue("--paper").trim();
    themeColors.forEach((meta) => meta.setAttribute("content", paper));
  };
  darkScheme.addEventListener("change", updateThemeColor);

  // ---- 縦組み ----

  // 縦書きの scrollLeft は右端を0として負の方向へ進む。
  const tatePosition = (panel) => ({
    extent: panel.scrollWidth - panel.clientWidth,
    position: Math.abs(panel.scrollLeft),
  });

  const moveTate = (button) => {
    const panel = button.closest(".tate-frame").querySelector(".tate");
    const { extent, position } = tatePosition(panel);
    const step = panel.clientWidth * (button.dataset.tateMove === "forward" ? 0.8 : -0.8);
    panel.scrollTo({
      left: -clamp(position + step, 0, extent),
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
  };

  const updateTateControls = () => {
    content.querySelectorAll(".tate").forEach((panel) => {
      const controls = panel.nextElementSibling;
      const { extent, position } = tatePosition(panel);
      controls.querySelector('[data-tate-move="forward"]').disabled = position >= extent - 1;
      controls.querySelector('[data-tate-move="back"]').disabled = position <= 1;
    });
  };

  // 原文と書き下し文が左右に並ぶ幅でだけ、原文を書き下し文に合わせて送る
  const isSideBySide = (texts) => getComputedStyle(texts).gridTemplateColumns.trim().split(/\s+/).length > 1;
  const isOriginalSynced = () => {
    const texts = content.querySelector(".texts");
    if (!texts) return false;
    if (texts.dataset.writing === "tate") return isSideBySide(texts);
    return getComputedStyle(texts.querySelector(".texts-original")).position === "sticky";
  };

  // 送られているあいだの原文は、送りの操作を出さず、キーボードの止まり先にもしない
  const updateOriginalPanel = () => {
    const texts = content.querySelector(".texts");
    if (!texts) return;
    const synced = isOriginalSynced();
    const original = texts.querySelector("#original-tate");
    texts.toggleAttribute("data-synced", synced);
    original.setAttribute("tabindex", synced ? "-1" : "0");
    original.setAttribute("aria-label", synced ? "原文（縦書き・書き下し文に合わせて送られる）" : "原文（縦書き・横にスクロール）");
  };

  // 表紙の竹簡は、横に繰れる幅のときだけキーボードで止まる欄にする
  const updateSlipsFrame = () => {
    const frame = content.querySelector(".slips-frame");
    if (frame) frame.setAttribute("tabindex", getComputedStyle(frame).overflowX === "auto" ? "0" : "-1");
  };

  // 書き下し文を読み進めると、脇に掛けた原文も同じあたりまで送る。
  // 横書きでは紙面のスクロールに、縦書きでは書き下し文の欄のスクロールに合わせる
  const syncOriginal = () => {
    const texts = content.querySelector(".texts");
    if (!texts) return;
    const original = texts.querySelector("#original-tate");
    const { extent } = tatePosition(original);
    if (extent <= 0) return;
    if (!isOriginalSynced()) return;
    if (texts.dataset.writing === "tate") {
      const kundoku = tatePosition(texts.querySelector("#kundoku-tate"));
      if (kundoku.extent <= 0) return;
      original.scrollLeft = -extent * (kundoku.position / kundoku.extent);
      return;
    }
    const list = texts.querySelector(".kundoku-yoko").getBoundingClientRect();
    const progress = clamp((window.innerHeight * 0.4 - list.top) / list.height, 0, 1);
    const visible = original.clientWidth;
    original.scrollLeft = -clamp(progress * (extent + visible) - visible / 2, 0, extent);
  };

  let syncFrame = 0;
  const requestSync = () => {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      syncOriginal();
      updateTateControls();
    });
  };

  const applyWriting = (button) => {
    const texts = button.closest(".texts");
    texts.dataset.writing = button.dataset.writing;
    button.parentElement.querySelectorAll("button").forEach((option) => {
      option.setAttribute("aria-pressed", String(option === button));
    });
  };

  const setWriting = (button) => {
    applyWriting(button);
    updateOriginalPanel();
    syncOriginal();
    updateTateControls();
    rememberScroll();
  };

  // ---- 帖の中の行き先 ----

  // 名句へは頭から、進言の一句へは前後の文と一緒に見えるように送る
  // 移ったあとも上端は出したままにして、目次へすぐ戻れるようにする
  let holdHeaderUntil = 0;
  const jumpTo = (target) => {
    if (!target) return;
    holdHeaderUntil = performance.now() + 400;
    document.body.removeAttribute("data-header-away");
    if (!target.matches("a[href], button, [tabindex]")) target.setAttribute("tabindex", "-1");
    target.scrollIntoView({ block: target.classList.contains("term-link") ? "center" : "start" });
    target.focus({ preventScroll: true });
    // 進むで同じ項目へ戻ったときも、ここへフォーカスを返す
    history.replaceState({ ...history.state, focus: target.id }, "");
  };

  // 別の帖にある名句や進言の一句へは、帖をめくってから送る
  let pendingTarget = "";
  const openTarget = (href, targetId) => {
    if (window.location.hash === href) {
      jumpTo(document.getElementById(targetId));
      return;
    }
    pendingTarget = targetId;
    window.location.hash = href;
  };

  // 新しいタブで開くなど、修飾キー付きのクリックはブラウザに任せる
  const isModified = (event) => event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (link && !link.matches(".skip-link") && !event.defaultPrevented && !isModified(event)) rememberScroll(link);
    },
    true,
  );

  document.addEventListener("click", (event) => {
    // 本文への移動では、篇を切り替えるためのハッシュを保つ。
    if (event.target.closest("a.skip-link")) {
      event.preventDefault();
      jumpTo(reading);
      return;
    }
    const target = event.target.closest("a[data-target]");
    if (target && !isModified(event)) {
      event.preventDefault();
      if (toc.open) toc.close();
      openTarget(target.getAttribute("href"), target.dataset.target);
      return;
    }
    const move = event.target.closest("[data-tate-move]");
    if (move) {
      moveTate(move);
      return;
    }
    const writing = event.target.closest("[data-writing]");
    if (writing && writing.tagName === "BUTTON") {
      setWriting(writing);
    }
  });

  // 縦組みの欄では、縦方向のホイールを読み進める向き（左）へ送る
  content.addEventListener(
    "wheel",
    (event) => {
      let panel = event.target.closest(".tate");
      if (!panel || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      // 送られている原文の上では、送る側を進める。横書きならページ、縦書きなら書き下し文の欄
      if (panel.id === "original-tate" && isOriginalSynced()) {
        if (panel.closest(".texts").dataset.writing === "yoko") return;
        panel = content.querySelector("#kundoku-tate");
      }
      const { extent, position } = tatePosition(panel);
      if (extent <= 0) return;
      const forward = event.deltaY > 0;
      if ((forward && position >= extent - 1) || (!forward && position <= 0)) return;
      event.preventDefault();
      panel.scrollLeft -= event.deltaY;
    },
    { passive: false },
  );

  content.addEventListener(
    "scroll",
    (event) => {
      if (!event.target.matches?.(".tate")) return;
      if (event.target.id === "kundoku-tate") {
        requestSync();
        rememberLater();
      } else updateTateControls();
    },
    true,
  );
  window.addEventListener("resize", () => {
    updateOriginalPanel();
    updateSlipsFrame();
    requestSync();
  });

  // 表紙の竹簡が見えているあいだは、上端の竹簡をしまっておく
  const coverObserver = new IntersectionObserver(([entry]) => {
    document.body.toggleAttribute("data-cover-visible", entry.isIntersecting);
  });

  // 読み進めるときは上端と帖札を退け、戻ろうとしたら出す
  let lastScrollY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      requestSync();
      rememberLater();
      const y = window.scrollY;
      if (performance.now() < holdHeaderUntil) {
        lastScrollY = y;
        document.body.toggleAttribute("data-scrolled", y > 8);
        return;
      }
      if (Math.abs(y - lastScrollY) < 6) return;
      // 末尾まで読んだら、次の帖へめくれるように出しておく
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      document.body.toggleAttribute("data-header-away", y > lastScrollY && y > 160 && !atEnd);
      document.body.toggleAttribute("data-scrolled", y > 8);
      lastScrollY = y;
    },
    { passive: true },
  );

  const observeCover = () => {
    coverObserver.disconnect();
    const slips = content.querySelector(".slips-frame");
    if (slips) coverObserver.observe(slips);
    else document.body.removeAttribute("data-cover-visible");
  };

  // ---- 画面の切り替え ----

  let hasRendered = false;

  const showView = (view, chapterId, cho) => {
    const moveFocus = hasRendered;
    const restoreY = history.state?.y;
    const restoreFocus = history.state?.focus;
    const restoreWriting = history.state?.writing;
    const restoreKundokuLeft = history.state?.kundokuLeft ?? 0;
    const swap = () => {
      if (view === "chapter") {
        const chapter = chapters[chapterId - 1];
        document.title = `第${chapter.idKanji}篇 ${chapter.name}${cho === "kataru" ? "" : `・${choNames[cho]}`}｜孫子兵法 十三篇`;
        content.innerHTML = templates.chapterTemplate(chapter, cho);
      } else if (view === "person") {
        document.title = "孫子という人｜孫子兵法 十三篇";
        content.innerHTML = templates.personTemplate();
      } else {
        document.title = "孫子兵法 十三篇";
        content.innerHTML = templates.overviewTemplate();
      }
      updateNav(view, chapterId, cho);
      observeCover();
      const writing = restoreWriting && content.querySelector(`.kundoku-switch [data-writing="${restoreWriting}"]`);
      if (writing && restoreWriting !== "yoko") {
        applyWriting(writing);
        content.querySelector("#kundoku-tate").scrollLeft = restoreKundokuLeft;
      }
      updateOriginalPanel();
      updateSlipsFrame();
      window.scrollTo(0, restoreY ?? 0);
      lastScrollY = window.scrollY;
      document.body.removeAttribute("data-header-away");
      document.body.toggleAttribute("data-scrolled", lastScrollY > 8);
      syncOriginal();
      updateTateControls();
      const target = pendingTarget && document.getElementById(pendingTarget);
      pendingTarget = "";
      // 再読み込みのときは位置だけを戻し、フォーカスの枠は出さない
      const returned = moveFocus && restoreY !== undefined && restoreFocus && document.getElementById(restoreFocus);
      if (target) jumpTo(target);
      else if (returned) returned.focus({ preventScroll: true });
      else if (moveFocus) reading.focus({ preventScroll: true });
    };
    // 篇や帖を移るときだけ、紙面をごく短く差し替える
    // 画面が隠れているときなどは差し替えだけが行われ、ready は拒否される
    if (hasRendered && document.startViewTransition && !reducedMotion.matches) document.startViewTransition(swap).ready.catch(() => {});
    else swap();
    hasRendered = true;
  };

  const renderRoute = () => {
    clearTimeout(rememberTimer);
    const match = window.location.hash.match(/^#chapter-(\d{1,2})(?:\/([a-z]+))?$/);
    const chapterId = match ? Number(match[1]) : 0;
    const cho = match?.[2] ?? "kataru";
    if (match && chapters[chapterId - 1] && templates.choKeys.includes(cho)) showView("chapter", chapterId, cho);
    else if (window.location.hash === "#sonshi") showView("person", 0);
    else showView("overview", 0);
  };

  // 狭い画面では、目次を必要なときだけ開く
  tocOpen.addEventListener("click", () => {
    toc.showModal();
    toc.scrollTop = 0;
    tocOpen.setAttribute("aria-expanded", "true");
  });
  toc.addEventListener("close", () => {
    tocOpen.setAttribute("aria-expanded", "false");
  });
  document.querySelector("#toc-close").addEventListener("click", () => toc.close());
  toc.addEventListener("click", (event) => {
    if (event.target.closest("a")) toc.close();
  });
  window.matchMedia("(min-width: 861px)").addEventListener("change", (event) => {
    if (event.matches) toc.close();
  });

  slipnav.innerHTML = templates.slipnavTemplate();
  tocNav.innerHTML = templates.tocTemplate();
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
