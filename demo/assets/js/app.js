(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = new Intl.NumberFormat("en-US");

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // Folds alef / ta-marbuta / ya variants and diacritics so "العضويه" matches "العضوية".
  const normalizeArabic = (str) =>
    String(str).toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْٰ]/g, "").trim();

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Header: transparent over the hero, solid after scrolling ---------- */
  const header = $(".site-header");
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle("is-top", window.scrollY <= 24);
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------- Mega menus ---------- */
  const megaItems = $$(".has-mega");
  const closeMega = (li) => {
    li.classList.remove("is-open");
    $(".mega-trigger", li).setAttribute("aria-expanded", "false");
  };
  const openMega = (li) => {
    megaItems.forEach((other) => other !== li && closeMega(other));
    li.classList.add("is-open");
    $(".mega-trigger", li).setAttribute("aria-expanded", "true");
  };

  megaItems.forEach((li) => {
    const trigger = $(".mega-trigger", li);
    let leaveTimer;

    trigger.addEventListener("click", () => (li.classList.contains("is-open") ? closeMega(li) : openMega(li)));
    li.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(leaveTimer);
      openMega(li);
    });
    li.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      leaveTimer = setTimeout(() => closeMega(li), 160);
    });
    li.addEventListener("focusout", (e) => {
      if (!li.contains(e.relatedTarget)) closeMega(li);
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && li.classList.contains("is-open")) {
        closeMega(li);
        trigger.focus();
      }
    });
    $$(".mega a", li).forEach((a) => a.addEventListener("click", () => closeMega(li)));
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".has-mega")) megaItems.forEach(closeMega);
  });

  /* ---------- Dialogs (mobile drawer + search) ---------- */
  $$("[data-dialog-open]").forEach((btn) => {
    const dialog = document.getElementById(btn.dataset.dialogOpen);
    if (!dialog || typeof dialog.showModal !== "function") return;
    btn.addEventListener("click", () => {
      dialog.showModal();
      const field = $("input", dialog);
      if (field) field.focus();
    });
  });

  $$("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    $$("[data-dialog-close]", dialog).forEach((el) => el.addEventListener("click", () => dialog.close()));
    $$(".drawer__nav a, .drawer__foot a", dialog).forEach((a) => a.addEventListener("click", () => dialog.close()));
  });

  /* ---------- Site search (filters the quick links) ---------- */
  const searchInput = $("#site-search");
  const searchForm = $("#search-form");
  if (searchInput && searchForm) {
    const list = $(".search-suggest ul");
    const links = $$("a", list);
    const empty = document.createElement("li");
    empty.className = "is-empty";
    empty.hidden = true;
    list.append(empty);

    searchInput.addEventListener("input", () => {
      const q = normalizeArabic(searchInput.value);
      let visible = 0;
      links.forEach((a) => {
        const match = !q || normalizeArabic(a.textContent).includes(q);
        a.parentElement.hidden = !match;
        if (match) visible++;
      });
      empty.hidden = visible > 0;
      empty.textContent = visible ? "" : `لا توجد صفحات تطابق «${searchInput.value.trim()}». جرب البحث في دليل المزارع.`;
    });

    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const first = links.find((a) => !a.parentElement.hidden);
      if (first) {
        $("#search-dialog").close();
        location.href = first.href;
      }
    });
  }

  /* ---------- Hero headline: word-by-word reveal (never per letter for Arabic) ---------- */
  const title = $("[data-split-words]");
  if (title && !reduceMotion) {
    let index = 0;
    const split = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.append(" ");
            return;
          }
          const word = document.createElement("span");
          word.className = "w";
          word.style.setProperty("--wi", index++);
          word.textContent = part;
          frag.append(word);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.localName !== "svg") {
        [...node.childNodes].forEach(split);
      }
    };
    [...title.childNodes].forEach(split);
    title.classList.add("is-split");
  }

  /* ---------- Hero band slider ---------- */
  const initBand = () => {
    if (!window.Swiper || !$(".hero-swiper")) return;
    const current = $("[data-band-current]");
    const progress = $("[data-band-progress]");
    new window.Swiper(".hero-swiper", {
      effect: "fade",
      fadeEffect: { crossFade: true },
      speed: 1100,
      loop: true,
      autoplay: reduceMotion ? false : { delay: 6500, disableOnInteraction: false, pauseOnMouseEnter: true },
      navigation: { nextEl: "[data-band-next]", prevEl: "[data-band-prev]" },
      a11y: {
        prevSlideMessage: "الشريحة السابقة",
        nextSlideMessage: "الشريحة التالية",
        slideLabelMessage: "الشريحة {{index}} من {{slidesLength}}",
      },
      on: {
        slideChange(s) {
          current.textContent = String(s.realIndex + 1).padStart(2, "0");
        },
        autoplayTimeLeft(s, time, ratio) {
          progress.style.transform = `scaleX(${1 - ratio})`;
        },
      },
    });
  };
  if (document.readyState === "complete") initBand();
  else window.addEventListener("load", initBand, { once: true });

  /* ---------- Event countdown ---------- */
  const countdown = $("[data-countdown]");
  if (countdown) {
    const target = new Date(countdown.dataset.countdown).getTime();
    const units = { d: $('[data-unit="d"]', countdown), h: $('[data-unit="h"]', countdown), m: $('[data-unit="m"]', countdown) };
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        countdown.classList.add("is-live");
        countdown.textContent = "المعرض مفتوح الآن، نسعد بزيارتكم";
        return false;
      }
      const minutes = Math.floor(diff / 60000);
      units.d.textContent = String(Math.floor(minutes / 1440)).padStart(2, "0");
      units.h.textContent = String(Math.floor((minutes % 1440) / 60)).padStart(2, "0");
      units.m.textContent = String(minutes % 60).padStart(2, "0");
      return true;
    };
    if (tick()) {
      const timer = setInterval(() => tick() || clearInterval(timer), 30000);
    }
  }

  /* ---------- Scroll reveal, counters, journey progress ---------- */
  const animateCount = (el) => {
    const end = Number(el.dataset.count);
    if (reduceMotion || !end) {
      el.textContent = fmt.format(end);
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt.format(Math.round(end * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const runSteps = (list) => {
    list.style.setProperty("--progress", 1);
    $$(".step", list).forEach((step, i) => {
      setTimeout(() => step.classList.add("is-done"), reduceMotion ? 0 : 250 + i * 420);
    });
  };

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    $$(".reveal").forEach((el) => revealObserver.observe(el));

    const counters = $$("[data-count]");
    if (!reduceMotion) counters.forEach((el) => (el.textContent = "0"));
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => countObserver.observe(el));

    const stepsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runSteps(entry.target);
          stepsObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );
    $$("[data-steps]").forEach((el) => stepsObserver.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
    $$("[data-steps]").forEach(runSteps);
  }

  /* ---------- Accessible tabs (roving tabindex, RTL arrow keys) ---------- */
  const initTabs = (tablist, onSelect) => {
    const tabs = $$('[role="tab"]', tablist);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      onSelect(tab, tabs);
    };
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(tab);
        // In RTL the next tab sits to the left.
        const moves = { ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in moves)) return;
        e.preventDefault();
        select(tabs[(moves[e.key] + tabs.length) % tabs.length], true);
      });
    });
  };

  const showPanelFor = (tab, tabs) => {
    tabs.forEach((t) => {
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (!panel) return;
      panel.hidden = t !== tab;
      if (t !== tab) $$("iframe", panel).forEach((f) => f.remove());
      if (t === tab) panel.classList.add("is-in");
    });
  };

  $$(".services .seg, .media .seg").forEach((tablist) => initTabs(tablist, showPanelFor));

  /* ---------- YouTube: load the player only on click ---------- */
  $$(".yt[data-yt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(btn.dataset.yt)}?autoplay=1&rel=0`;
      frame.title = btn.getAttribute("aria-label") || "فيديو";
      frame.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture";
      frame.allowFullscreen = true;
      frame.className = "yt__frame";
      btn.replaceWith(frame);
    });
  });

  /* ---------- Directory map ---------- */
  // Regions keyed by the SVG ids in assets/img/sa.svg.
  const REGIONS = {
    SA01: { name: "منطقة الرياض", short: "الرياض", seat: "الرياض", lat: 24.71, lng: 46.68 },
    SA02: { name: "منطقة مكة المكرمة", short: "مكة المكرمة", seat: "مكة المكرمة", lat: 21.39, lng: 39.86 },
    SA03: { name: "منطقة المدينة المنورة", short: "المدينة المنورة", seat: "المدينة المنورة", lat: 24.47, lng: 39.61 },
    SA04: { name: "المنطقة الشرقية", short: "الشرقية", seat: "الدمام", lat: 26.43, lng: 50.1 },
    SA05: { name: "منطقة القصيم", short: "القصيم", seat: "بريدة", lat: 26.33, lng: 43.97 },
    SA06: { name: "منطقة حائل", short: "حائل", seat: "حائل", lat: 27.52, lng: 41.69 },
    SA07: { name: "منطقة تبوك", short: "تبوك", seat: "تبوك", lat: 28.38, lng: 36.57 },
    SA08: { name: "منطقة الحدود الشمالية", short: "الحدود الشمالية", seat: "عرعر", lat: 30.98, lng: 41.04 },
    SA09: { name: "منطقة جازان", short: "جازان", seat: "جازان", lat: 16.89, lng: 42.55 },
    SA10: { name: "منطقة نجران", short: "نجران", seat: "نجران", lat: 17.49, lng: 44.13 },
    SA11: { name: "منطقة الباحة", short: "الباحة", seat: "الباحة", lat: 20.01, lng: 41.47 },
    SA12: { name: "منطقة الجوف", short: "الجوف", seat: "سكاكا", lat: 29.97, lng: 40.21 },
    SA14: { name: "منطقة عسير", short: "عسير", seat: "أبها", lat: 18.22, lng: 42.51 },
  };

  const CATEGORIES = {
    farms: { label: "المزارع العضوية", forms: { one: "مزرعة", two: "مزرعتان", few: "مزارع", many: "مزرعة" } },
    transition: { label: "المزارع تحت التحول", forms: { one: "مزرعة", two: "مزرعتان", few: "مزارع", many: "مزرعة" } },
    inputs: { label: "مدخلات الإنتاج العضوي", forms: { one: "جهة", two: "جهتان", few: "جهات", many: "جهة" } },
    outlets: { label: "منافذ البيع", forms: { one: "منفذ", two: "منفذان", few: "منافذ", many: "منفذا" } },
    packaging: { label: "شركات التغليف", forms: { one: "شركة", two: "شركتان", few: "شركات", many: "شركة" } },
    transport: { label: "شركات النقل", forms: { one: "شركة", two: "شركتان", few: "شركات", many: "شركة" } },
    certification: { label: "شركات التوثيق", forms: { one: "شركة", two: "شركتان", few: "شركات", many: "شركة" } },
  };

  const PROFILE_URL = "https://sofa.org.sa/showProfile/";
  // Side wall of the 3D map: how many stacked outlines, and how far apart (SVG units).
  const DEPTH_LAYERS = 7;
  const DEPTH_STEP = 4;

  // Arabic counted-noun agreement: 1, 2, 3–10 (plural), 11–99 (accusative singular), hundreds (genitive singular).
  const countedNoun = (n, f) => {
    if (n === 1) return f.one;
    if (n === 2) return f.two;
    const r = n % 100;
    if (r >= 3 && r <= 10) return f.few;
    if (r >= 11) return f.many;
    return f.one;
  };

  const mapRoot = $("#sa-map");
  const results = $("#map-results");
  const regionSelect = $("#region-select");
  const nameFilter = $("#name-filter");
  const coord = $("#map-coord");
  const tip = $("#map-tip");
  const catTabs = $(".cat-tabs");

  if (mapRoot && results && regionSelect) {
    const state = { cat: "farms", region: "SA01", q: "" };
    let directory = {};
    const paths = {};
    const labelPoints = {};
    const labels = {};

    const listFor = (cat, region) => directory[cat]?.[region] || [];
    const matches = (cat, region) => {
      const q = normalizeArabic(state.q);
      const list = listFor(cat, region);
      return q ? list.filter(([name]) => normalizeArabic(name).includes(q)) : list;
    };
    // While searching the map shows where the matches are, not the raw totals.
    const countFor = (cat, region) => matches(cat, region).length;

    Object.entries(REGIONS)
      .sort((a, b) => a[1].name.localeCompare(b[1].name, "ar"))
      .forEach(([id, r]) => regionSelect.add(new Option(r.name, id, id === state.region, id === state.region)));

    const renderTotals = () => {
      let all = 0;
      Object.keys(CATEGORIES).forEach((cat) => {
        const total = Object.values(directory[cat] || {}).reduce((sum, list) => sum + list.length, 0);
        all += total;
        const el = $(`[data-cat-total="${cat}"]`);
        if (el) el.textContent = fmt.format(total);
      });
      const meta = $("[data-dir-total]");
      if (meta) meta.textContent = `${fmt.format(all)} ENTRIES · 13 REGIONS`;
    };

    const itemHtml = ([name, id], regionId) => `
      <li><a href="${PROFILE_URL}${encodeURIComponent(id)}" rel="noopener">
        <i class="fa-solid fa-location-dot pin" aria-hidden="true"></i>
        <span class="name">${escapeHtml(name)}</span>
        ${regionId ? `<span class="city">${escapeHtml(REGIONS[regionId].seat)}</span>` : ""}
      </a></li>`;

    const renderResults = () => {
      const cat = CATEGORIES[state.cat];
      const region = REGIONS[state.region];
      const q = state.q.trim();

      if (q) {
        const hits = Object.keys(REGIONS).flatMap((rid) => matches(state.cat, rid).map((item) => [item, rid]));
        results.innerHTML = `
          <p class="map-results__kicker mono">SEARCH</p>
          <h3 class="map-results__region">«${escapeHtml(q)}»</h3>
          <p class="map-results__cat">${escapeHtml(cat.label)} في كل المناطق</p>
          <p class="map-results__count"><span class="mono">${fmt.format(hits.length)}</span><span>${hits.length ? "نتيجة" : "لا نتائج"}</span></p>
          ${
            hits.length
              ? `<ul class="result-list" role="list">${hits.map(([item, rid]) => itemHtml(item, rid)).join("")}</ul>`
              : `<div class="empty"><span class="empty__icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span><p>لا توجد ${escapeHtml(cat.label)} بهذا الاسم. جرب جزءا من الاسم أو نشاطا آخر.</p></div>`
          }`;
        return;
      }

      const list = listFor(state.cat, state.region);
      const count = list.length;
      results.innerHTML = `
        <p class="map-results__kicker mono">${state.region.replace("SA", "SA-")}</p>
        <h3 class="map-results__region">${escapeHtml(region.name)}</h3>
        <p class="map-results__cat">${escapeHtml(cat.label)} &middot; المقر الإداري: ${escapeHtml(region.seat)}</p>
        <p class="map-results__count"><span class="mono">${fmt.format(count)}</span><span>${count ? countedNoun(count, cat.forms) : "لا يوجد تسجيل"}</span></p>
        ${
          count
            ? `<ul class="result-list" role="list">${list.map((item) => itemHtml(item)).join("")}</ul>`
            : `<div class="empty">
                <span class="empty__icon"><i class="fa-solid fa-seedling" aria-hidden="true"></i></span>
                <p>لا توجد جهات مسجلة ضمن «${escapeHtml(cat.label)}» في ${escapeHtml(region.name)} حتى الآن.</p>
                <a class="link-arrow" href="https://sofa.org.sa/service/16">سجل جهتك لدى الجمعية <i class="fa-solid fa-arrow-left" aria-hidden="true"></i></a>
              </div>`
        }`;
    };

    const paintMap = () => {
      const counts = Object.fromEntries(Object.keys(REGIONS).map((id) => [id, countFor(state.cat, id)]));
      const max = Math.max(1, ...Object.values(counts));
      const searching = Boolean(state.q.trim());
      const cat = CATEGORIES[state.cat];
      Object.entries(paths).forEach(([id, path]) => {
        const n = counts[id];
        // sqrt spreads the long tail so small regions are still visible on the scale
        path.dataset.step = n ? 1 + Math.min(3, Math.floor(Math.sqrt(n / max) * 4 - 1e-9)) : 0;
        const active = !searching && id === state.region;
        path.classList.toggle("is-active", active);
        path.setAttribute("aria-pressed", String(active));
        path.setAttribute("aria-label", `${REGIONS[id].name}: ${fmt.format(n)} ${n ? countedNoun(n, cat.forms) : ""}`);
      });

      const r = REGIONS[state.region];
      if (coord) coord.textContent = searching ? "SEARCH · ALL REGIONS" : `${state.region.replace("SA", "SA-")} · ${r.lat.toFixed(2)}°N ${r.lng.toFixed(2)}°E`;
      Object.entries(labels).forEach(([id, label]) => {
        label.count.textContent = fmt.format(counts[id]);
        label.lift.classList.toggle("is-active", !searching && id === state.region);
        label.lift.classList.toggle("is-empty", counts[id] === 0);
      });
    };

    const render = () => {
      paintMap();
      renderResults();
    };

    const selectRegion = (id) => {
      if (!REGIONS[id]) return;
      state.region = id;
      regionSelect.value = id;
      if (state.q && nameFilter) {
        state.q = "";
        nameFilter.value = "";
      }
      render();
    };

    const showTip = (id, clientX, clientY) => {
      if (!tip) return;
      const stage = tip.parentElement.getBoundingClientRect();
      tip.innerHTML = `${escapeHtml(REGIONS[id].name)}<b>${fmt.format(countFor(state.cat, id))}</b>`;
      tip.style.left = `${clientX - stage.left}px`;
      tip.style.top = `${clientY - stage.top}px`;
      tip.hidden = false;
    };
    const hideTip = () => tip && (tip.hidden = true);

    const mountSvg = (svg) => {
      svg.setAttribute("viewBox", "0 0 1000 824");
      ["width", "height", "fill", "stroke", "stroke-width", "viewbox"].forEach((a) => svg.removeAttribute(a));
      svg.setAttribute("role", "group");
      svg.setAttribute("aria-label", "خريطة مناطق المملكة العربية السعودية، اختر منطقة");

      $$("#label_points circle", svg).forEach((c) => (labelPoints[c.id] = { x: +c.getAttribute("cx"), y: +c.getAttribute("cy") }));
      ["#points", "#label_points"].forEach((sel) => $(sel, svg)?.remove());

      $$("path", svg).forEach((path) => {
        const id = path.id;
        if (!REGIONS[id]) return;
        paths[id] = path;
        path.removeAttribute("name");
        path.setAttribute("tabindex", "0");
        path.setAttribute("role", "button");
        path.addEventListener("pointerenter", (e) => {
          path.parentNode.append(path); // bring outline above neighbours
          showTip(id, e.clientX, e.clientY);
        });
        path.addEventListener("pointermove", (e) => showTip(id, e.clientX, e.clientY));
        path.addEventListener("pointerleave", hideTip);
        path.addEventListener("click", () => selectRegion(id));
        path.addEventListener("focus", () => {
          const box = path.getBoundingClientRect();
          showTip(id, box.left + box.width / 2, box.top + box.height / 2);
        });
        path.addEventListener("blur", hideTip);
        path.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectRegion(id);
          }
        });
      });

      const ns = "http://www.w3.org/2000/svg";
      const features = $("#features", svg);

      // Extruded side wall: the whole country outline stacked a few times below the regions.
      const outline = Object.values(paths)
        .map((p) => p.getAttribute("d"))
        .join(" ");
      const depth = document.createElementNS(ns, "g");
      depth.setAttribute("class", "map-depth");
      depth.setAttribute("aria-hidden", "true");
      for (let i = DEPTH_LAYERS; i >= 1; i--) {
        const layer = document.createElementNS(ns, "path");
        layer.setAttribute("d", outline);
        layer.setAttribute("transform", `translate(0 ${i * DEPTH_STEP})`);
        if (i === DEPTH_LAYERS) layer.setAttribute("class", "map-depth__base");
        depth.append(layer);
      }
      features.before(depth);

      // Region names as real text, with the live count for the selected activity under each.
      const labelLayer = document.createElementNS(ns, "g");
      labelLayer.setAttribute("class", "map-labels");
      labelLayer.setAttribute("aria-hidden", "true");
      Object.entries(REGIONS).forEach(([id, region]) => {
        const point = labelPoints[id];
        if (!point) return;
        const place = document.createElementNS(ns, "g");
        place.setAttribute("transform", `translate(${point.x} ${point.y})`);
        const lift = document.createElementNS(ns, "g");
        lift.setAttribute("class", "map-label");
        const name = document.createElementNS(ns, "text");
        name.setAttribute("class", "map-label__name");
        name.setAttribute("text-anchor", "middle");
        name.textContent = region.short;
        const count = document.createElementNS(ns, "text");
        count.setAttribute("class", "map-label__count");
        count.setAttribute("text-anchor", "middle");
        count.setAttribute("y", "27");
        lift.append(name, count);
        place.append(lift);
        labelLayer.append(place);
        labels[id] = { lift, count };
      });
      svg.append(labelLayer);
      mapRoot.replaceChildren(svg);
    };

    const loadSvg = fetch(mapRoot.dataset.src)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((text) => {
        const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
        if (svg.localName !== "svg") throw new Error("Invalid SVG");
        mountSvg(document.importNode(svg, true));
      })
      .catch(() => {}); // the static <img> map stays and the list still works

    const loadData = fetch("assets/data/directory.json")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        directory = data;
        renderTotals();
      })
      .catch(() => {
        results.innerHTML = `<div class="empty"><span class="empty__icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span><p>تعذر تحميل الدليل الآن. حدث الصفحة أو حاول بعد قليل.</p></div>`;
      });

    Promise.all([loadSvg, loadData]).then(render);

    regionSelect.addEventListener("change", () => selectRegion(regionSelect.value));

    let typing;
    nameFilter?.addEventListener("input", () => {
      clearTimeout(typing);
      typing = setTimeout(() => {
        state.q = nameFilter.value;
        render();
      }, 120);
    });

    $("#map-filter")?.addEventListener("submit", (e) => {
      e.preventDefault();
      state.region = regionSelect.value;
      state.q = nameFilter ? nameFilter.value : "";
      render();
      results.setAttribute("tabindex", "-1");
      results.focus({ preventScroll: false });
    });

    if (catTabs) {
      initTabs(catTabs, (tab) => {
        state.cat = tab.dataset.cat;
        $("#map-panel").setAttribute("aria-labelledby", tab.id);
        render();
      });
    }
  }

  /* ---------- Newsletter ---------- */
  const newsletter = $("#newsletter");
  if (newsletter) {
    const input = $("input[type=email]", newsletter);
    const msg = $("#newsletter-msg");
    const setMsg = (text, type, example) => {
      msg.className = `newsletter__msg is-${type}`;
      msg.textContent = text;
      if (example) {
        const bdi = document.createElement("bdi");
        bdi.textContent = example;
        msg.append(" ", bdi);
      }
    };
    newsletter.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      input.setAttribute("aria-invalid", String(!valid));
      if (!value) {
        setMsg("اكتب بريدك الإلكتروني أولا.", "error");
        input.focus();
      } else if (!valid) {
        setMsg("صيغة البريد غير صحيحة، مثال:", "error", "name@example.com");
        input.focus();
      } else {
        setMsg("تم الاشتراك. ستصلك أول رسالة مع بداية الشهر القادم.", "ok");
        newsletter.reset();
        input.removeAttribute("aria-invalid");
      }
    });
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        input.removeAttribute("aria-invalid");
        msg.textContent = "";
      }
    });
  }
})();
