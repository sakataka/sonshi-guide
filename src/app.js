(() => {
  "use strict";

  const chapters = window.SONSHI_CHAPTERS;
  const templates = window.SONSHI_TEMPLATES;
  const content = document.querySelector("#chapter-content");
  const slipnav = document.querySelector("#slipnav");
  const tocNav = document.querySelector("#toc-nav");
  const toc = document.querySelector("#toc");
  const tocOpen = document.querySelector("#toc-open");
  const reading = document.querySelector("#reading");
  const headerPlace = document.querySelector("#header-place");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---- ナビゲーション ----

  const setCurrent = (link, selected, value) => {
    if (selected) link.setAttribute("aria-current", value);
    else link.removeAttribute("aria-current");
  };

  const updateNav = (view, chapterId) => {
    document.body.dataset.view = view;
    document.querySelectorAll("[data-sections]").forEach((section) => {
      section.hidden = view !== "chapter";
    });
    document.querySelectorAll("[data-chapter]").forEach((link) => {
      const selected = view === "chapter" && Number(link.dataset.chapter) === chapterId;
      setCurrent(link, selected, "page");
    });
    document.querySelectorAll("[data-view]:not(body)").forEach((link) => {
      setCurrent(link, link.dataset.view === view, "page");
    });
    headerPlace.innerHTML = templates.headerTemplate(view, chapterId);
    headerPlace.querySelector("[data-sections]")?.removeAttribute("hidden");
  };

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
      left: -Math.max(0, Math.min(extent, position + step)),
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

  const setWriting = (button) => {
    const container = button.closest(".layer").querySelector(".kundoku");
    container.dataset.writing = button.dataset.writing;
    button.parentElement.querySelectorAll("button").forEach((option) => {
      option.setAttribute("aria-pressed", String(option === button));
    });
    updateTateControls();
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
      jumpTo(reading);
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
      const panel = event.target.closest(".tate");
      if (!panel || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const { extent, position } = tatePosition(panel);
      if (extent <= 0) return;
      const forward = event.deltaY > 0;
      if ((forward && position >= extent - 1) || (!forward && position <= 0)) return;
      event.preventDefault();
      panel.scrollLeft -= event.deltaY;
    },
    { passive: false },
  );

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
          setCurrent(link, link.dataset.partLink === key, "location");
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
  let lastScrollY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (performance.now() < holdHeaderUntil) {
        lastScrollY = y;
        document.body.toggleAttribute("data-scrolled", y > 8);
        return;
      }
      if (Math.abs(y - lastScrollY) < 6) return;
      document.body.toggleAttribute("data-header-away", y > lastScrollY && y > 160);
      document.body.toggleAttribute("data-scrolled", y > 8);
      lastScrollY = y;
    },
    { passive: true },
  );

  const observeContent = () => {
    partObserver.disconnect();
    coverObserver.disconnect();
    content.querySelectorAll("[data-part]").forEach((section) => partObserver.observe(section));
    const slips = content.querySelector(".slips-frame");
    if (slips) coverObserver.observe(slips);
    else document.body.removeAttribute("data-cover-visible");
  };

  let hasRendered = false;

  const showView = (view, chapterId) => {
    const moveFocus = hasRendered;
    const swap = () => {
      if (view === "chapter") {
        const chapter = chapters[chapterId - 1];
        document.title = `第${chapter.id}篇 ${chapter.name}｜孫子兵法 十三篇`;
        content.innerHTML = templates.chapterTemplate(chapter);
      } else if (view === "person") {
        document.title = "孫子という人｜孫子兵法 十三篇";
        content.innerHTML = templates.personTemplate();
      } else {
        document.title = "孫子兵法 十三篇";
        content.innerHTML = templates.overviewTemplate();
      }
      updateNav(view, chapterId);
      updateTateControls();
      observeContent();
      window.scrollTo(0, 0);
      lastScrollY = 0;
      document.body.removeAttribute("data-header-away");
      document.body.removeAttribute("data-scrolled");
      if (moveFocus) reading.focus({ preventScroll: true });
    };
    // 篇を移るときだけ、紙面をごく短く差し替える
    // 画面が隠れているときなどは差し替えだけが行われ、ready は拒否される
    if (hasRendered && document.startViewTransition && !reducedMotion.matches) document.startViewTransition(swap).ready.catch(() => {});
    else swap();
    hasRendered = true;
  };

  const renderRoute = () => {
    const hash = window.location.hash;
    const chapterMatch = hash.match(/^#chapter-(\d{1,2})$/);
    const chapterId = chapterMatch ? Number(chapterMatch[1]) : 0;
    if (chapterMatch && chapters[chapterId - 1]) showView("chapter", chapterId);
    else if (hash === "#sonshi") showView("person", 0);
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
