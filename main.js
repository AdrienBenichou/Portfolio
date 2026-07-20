/* ============================================
   main.js — Portfolio Adrien Benichou
   Cylindre rotatif (nav d'accueil + showcase projets), orbite projets
   + modal éditorial plein écran, données Airtable (data.json), i18n, filtre
   ============================================ */

(function () {
  "use strict";

  /* ============ ÉTAT GLOBAL ============ */
  const state = {
    lang: "fr",
    data: null,
    activeFilter: "all",
    reducedMotion: false,
    resizeRAF: null,
  };

  /* ============ NAVIGATION PRINCIPALE (hero scoreboard de la page d'accueil) ============ */
  const NAV_SECTIONS = [
    { id: "apropos", labelKey: "nav.apropos", href: "apropos.html", tint: "#1B4FDB" },
    { id: "projets", labelKey: "nav.projets", href: "projets.html", tint: "#FF6B35" },
    { id: "softwares", labelKey: "nav.softwares", href: "softwares.html", tint: "#0E7C86" },
    { id: "diplomes", labelKey: "nav.diplomes", href: "diplomes.html", tint: "#12379E" },
    { id: "benevolat", labelKey: "nav.benevolat", href: "benevolat.html", tint: "#E91E8C" },
  ];

  // Couleur + emoji par compétence : hash déterministe, mêmes teintes que le design handoff,
  // pour que deux compétences identiques (hero, modal, softwares...) restent reconnaissables.
  const COMPETENCE_EMOJI = {
    "Vente": "💰",
    "Relation client": "👥",
    "Communication": "📱",
    "Création de contenu": "🤳",
    "Evenementiel": "🎉",
    "Sport": "⚽",
    "Data": "📈",
    "Gamification": "🎮",
  };
  const COMPETENCE_PALETTE = ["#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#38D9A9", "#4DABF7", "#748FFC", "#DA77F2", "#F783AC", "#94D82D"];
  const FALLBACK_EMOJI_PALETTE = ["💡", "🔧", "🎯", "📌", "⭐", "🔥"];

  function hashString(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return hash;
  }
  function emojiForCompetence(name) {
    if (COMPETENCE_EMOJI[name]) return COMPETENCE_EMOJI[name];
    return FALLBACK_EMOJI_PALETTE[hashString(name) % FALLBACK_EMOJI_PALETTE.length];
  }
  function colorForCompetence(name) {
    return COMPETENCE_PALETTE[hashString(name) % COMPETENCE_PALETTE.length];
  }

  // Index ouvert au chargement via un lien profond (?open=2) depuis la pile du hero.
  function getOpenParamIndex() {
    const raw = new URLSearchParams(window.location.search).get("open");
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  /* ============ TRADUCTIONS (labels d'interface uniquement) ============ */
  const I18N = {
    fr: {
      "hero.eyebrow": "Sport × Digital",
      "hero.tagline": "Je fais rimer performance sportive et stratégie digitale.",
      "hero.allProjects": "Tous mes projets →",
      "nav.apropos": "À propos de moi",
      "nav.projets": "Mes projets",
      "nav.softwares": "Softwares",
      "nav.diplomes": "Diplômes",
      "nav.benevolat": "Bénévolat",
      "nav.home": "← Accueil",
      "apropos.eyebrow": "Qui je suis",
      "apropos.title": "À propos de moi",
      "apropos.location": "Lieu",
      "apropos.email": "Contact",
      "apropos.timelineTitle": "Parcours",
      "apropos.skillsTitle": "Compétences",
      "apropos.languagesTitle": "Langues",
      "projets.eyebrow": "Ils m'ont fait confiance",
      "projets.title": "Mes projets",
      "projets.orbitHint": "Clique un projet pour l'ouvrir en plein écran",
      "projets.filterAll": "Tous",
      "projets.filterPro": "Projets Pro",
      "projets.filterStage": "Stage",
      "projets.filterJob": "Job étudiant",
      "projets.filterEtudiant": "Projets étudiants",
      "projets.filterCesure": "Césure",
      "softwares.eyebrow": "Ma boîte à outils",
      "softwares.title": "Softwares",
      "diplomes.eyebrow": "Formation",
      "diplomes.title": "Diplômes",
      "benevolat.eyebrow": "Engagement",
      "benevolat.title": "Bénévolat",
      "contact.title": "Contact",
      "contact.email": "Email",
    },
    en: {
      "hero.eyebrow": "Sport × Digital",
      "hero.tagline": "Where athletic performance meets digital strategy.",
      "hero.allProjects": "All my projects →",
      "nav.apropos": "About me",
      "nav.projets": "My projects",
      "nav.softwares": "Softwares",
      "nav.diplomes": "Degrees",
      "nav.benevolat": "Volunteering",
      "nav.home": "← Home",
      "apropos.eyebrow": "Who I am",
      "apropos.title": "About me",
      "apropos.location": "Location",
      "apropos.email": "Contact",
      "apropos.timelineTitle": "Background",
      "apropos.skillsTitle": "Skills",
      "apropos.languagesTitle": "Languages",
      "projets.eyebrow": "Trusted by",
      "projets.title": "My projects",
      "projets.orbitHint": "Click a project to open it full screen",
      "projets.filterAll": "All",
      "projets.filterPro": "Pro projects",
      "projets.filterStage": "Internship",
      "projets.filterJob": "Student job",
      "projets.filterEtudiant": "Academic projects",
      "projets.filterCesure": "Gap year",
      "softwares.eyebrow": "My toolbox",
      "softwares.title": "Softwares",
      "diplomes.eyebrow": "Education",
      "diplomes.title": "Degrees",
      "benevolat.eyebrow": "Engagement",
      "benevolat.title": "Volunteering",
      "contact.title": "Contact",
      "contact.email": "Email",
    },
  };

  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = I18N[state.lang][key];
      if (val) el.textContent = val;
    });
    document.documentElement.setAttribute("lang", state.lang);
    document.documentElement.setAttribute("data-lang", state.lang);
  }

  function initLangSwitcher() {
    const btns = document.querySelectorAll(".lang-btn");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang-btn");
        state.lang = lang;
        btns.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle("is-active", isActive);
          b.setAttribute("aria-pressed", isActive);
        });
        applyI18n();
        updateReelLabelFromPosition();
      });
    });
  }

  /* ============ CURSEUR CUSTOM ============ */
  function initCustomCursor() {
    const cursor = document.getElementById("custom-cursor");
    const hero = document.getElementById("hero");
    if (!cursor || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    window.addEventListener("mousemove", (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });

    // Délégation : fonctionne aussi pour les nœuds d'orbite/cylindre injectés dynamiquement
    document.addEventListener("mouseover", (e) => {
      if (hero && hero.contains(e.target)) cursor.classList.add("is-dark");

      const previewNode = e.target.closest(".orbit-node, .reel-slide, .hero-stack-card");
      const interactive = e.target.closest("a, button, .software-item, .orbit-node, .reel-slide, .hero-stack-card");

      if (interactive) cursor.classList.add("is-hover");
      if (previewNode) {
        cursor.classList.add("is-label");
        cursor.setAttribute("data-cursor-label", "VOIR");
      }
    });

    document.addEventListener("mouseout", (e) => {
      if (hero && hero.contains(e.target) && !hero.contains(e.relatedTarget)) {
        cursor.classList.remove("is-dark");
      }
      const interactive = e.target.closest("a, button, .software-item, .orbit-node, .reel-slide, .hero-stack-card");
      if (interactive && !interactive.contains(e.relatedTarget)) {
        cursor.classList.remove("is-hover");
        cursor.classList.remove("is-label");
        cursor.removeAttribute("data-cursor-label");
      }
    });
  }

  /* ============ BANDEAU-CYLINDRE ROTATIF (showcase projets, page "Mes projets") ============ */
  const REEL_TINTS = ["#1B4FDB", "#FF6B35", "#E91E8C", "#12379E", "#0E7C86"];
  const REEL_AUTO_MS = 3400;
  const reelState = {
    items: [],
    position: 0,
    stepPx: 0,
    dragging: false,
    dragStartX: 0,
    dragStartPos: 0,
    dragMoved: 0,
    pressedSlide: null,
    hovered: false,
    manualPause: false,
    autoRAF: null,
  };

  function setReelTransform(animate) {
    const track = document.getElementById("reel-track");
    if (!track) return;
    track.classList.toggle("is-dragging", !animate);
    track.style.transform = `translateX(${-reelState.position * reelState.stepPx}px)`;
  }

  function measureReelStep() {
    const track = document.getElementById("reel-track");
    const first = track && track.querySelector(".reel-slide");
    if (!first) {
      reelState.stepPx = 0;
      return;
    }
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0") || 0;
    reelState.stepPx = first.getBoundingClientRect().width + gap;
    setReelTransform(false);
  }

  function currentReelIndex() {
    const n = reelState.items.length;
    if (!n) return 0;
    return ((Math.round(reelState.position) % n) + n) % n;
  }

  function updateReelLabelFromPosition() {
    const items = reelState.items;
    if (!items.length) return;
    const idx = currentReelIndex();
    const item = items[idx];
    const label = document.getElementById("reel-label");
    const thumb = document.getElementById("reel-thumb-img");
    const thumbWrap = thumb && thumb.closest(".reel-pill-thumb");

    if (label) label.textContent = projectTitle(item);
    if (thumb) {
      thumb.src = projectCover(item);
      thumb.alt = projectTitle(item);
    }
    if (thumbWrap) {
      thumbWrap.classList.remove("is-tint");
      thumbWrap.style.background = "";
    }
  }

  function wrapReelIfNeeded() {
    const n = reelState.items.length;
    if (!n) return;
    if (reelState.position >= n) {
      reelState.position -= n;
      setReelTransform(false);
    } else if (reelState.position < 0) {
      reelState.position += n;
      setReelTransform(false);
    }
  }

  function reelGoTo(delta) {
    if (!reelState.items.length) return;
    reelState.position += delta;
    setReelTransform(true);
    updateReelLabelFromPosition();
    window.setTimeout(wrapReelIfNeeded, 620);
  }

  function activateReelSlide(index) {
    openReelProject(index);
  }

  function openReelProject(index) {
    if (state.activeFilter !== "all") {
      state.activeFilter = "all";
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-filter") === "all");
      });
      renderOrbit();
    }
    const node = document.querySelector(`.orbit-node[data-index="${index}"]`);
    if (node) openProjectModal(index, node);
  }

  function buildReelSlides() {
    const track = document.getElementById("reel-track");
    if (!track) return;
    const wrapper = document.getElementById("reel-wrapper");
    buildProjectReelSlides(track);

    // Mise en scène d'entrée : le cylindre apparaît (fade + léger scale) une fois ses slides prêtes.
    if (wrapper && !wrapper.classList.contains("is-ready")) {
      requestAnimationFrame(() => requestAnimationFrame(() => wrapper.classList.add("is-ready")));
    }
  }

  function buildProjectReelSlides(track) {
    const items = getAllProjects().filter((p) => projectCover(p));
    reelState.items = items;

    if (!items.length) {
      track.innerHTML = "";
      return;
    }

    const doubled = [...items, ...items];
    track.innerHTML = doubled
      .map(
        (p, i) => `
        <div class="reel-slide" data-index="${i % items.length}" style="--slide-tint:${REEL_TINTS[i % REEL_TINTS.length]}">
          <img src="${projectCover(p)}" alt="${projectTitle(p)}" loading="lazy">
          <p class="reel-slide-title">${projectTitle(p)}</p>
        </div>`
      )
      .join("");

    reelState.position = 0;
    measureReelStep();
    updateReelLabelFromPosition();
  }

  function initReelDrag() {
    const reel = document.getElementById("reel");
    if (!reel) return;

    reel.addEventListener("pointerdown", (e) => {
      if (!reelState.items.length) return;
      reelState.dragging = true;
      reelState.dragMoved = 0;
      reelState.dragStartX = e.clientX;
      reelState.dragStartPos = reelState.position;
      reelState.pressedSlide = e.target.closest(".reel-slide");
      reel.setPointerCapture(e.pointerId);
    });

    reel.addEventListener("pointermove", (e) => {
      if (!reelState.dragging || !reelState.stepPx) return;
      const deltaX = e.clientX - reelState.dragStartX;
      reelState.dragMoved = deltaX;
      reelState.position = reelState.dragStartPos - deltaX / reelState.stepPx;
      setReelTransform(false);
    });

    // setPointerCapture() retargète le pointerup (et le click qui en découle) vers #reel :
    // on ne peut donc pas compter sur un simple listener "click" posé sur chaque .reel-slide.
    // On détecte ici l'intention (clic vs drag) via la distance parcourue depuis le pointerdown.
    function endDrag() {
      if (!reelState.dragging) return;
      reelState.dragging = false;
      reelState.position = Math.round(reelState.position);
      setReelTransform(true);
      updateReelLabelFromPosition();
      window.setTimeout(wrapReelIfNeeded, 620);

      if (Math.abs(reelState.dragMoved) <= 6 && reelState.pressedSlide) {
        activateReelSlide(parseInt(reelState.pressedSlide.getAttribute("data-index"), 10));
      }
      reelState.pressedSlide = null;
    }
    reel.addEventListener("pointerup", endDrag);
    reel.addEventListener("pointercancel", endDrag);

    reel.addEventListener("mouseenter", () => {
      reelState.hovered = true;
    });
    reel.addEventListener("mouseleave", () => {
      reelState.hovered = false;
    });
    reel.addEventListener("focus", () => {
      reelState.hovered = true;
    });
    reel.addEventListener("blur", () => {
      reelState.hovered = false;
    });
  }

  function initReelKeyboard() {
    const reel = document.getElementById("reel");
    if (!reel) return;
    reel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        reelGoTo(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        reelGoTo(-1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateReelSlide(currentReelIndex());
      }
    });
  }

  function initReelControls() {
    const prevBtn = document.getElementById("reel-prev");
    const nextBtn = document.getElementById("reel-next");
    const toggleBtn = document.getElementById("reel-toggle");
    if (prevBtn) prevBtn.addEventListener("click", () => reelGoTo(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => reelGoTo(1));
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        reelState.manualPause = !reelState.manualPause;
        toggleBtn.setAttribute("aria-pressed", String(reelState.manualPause));
        toggleBtn.setAttribute(
          "aria-label",
          reelState.manualPause ? "Reprendre la rotation" : "Mettre en pause la rotation"
        );
      });
    }
    initReelDrag();
  }

  function startReelAuto() {
    if (state.reducedMotion || !document.getElementById("reel")) return;
    let acc = 0;
    let prevTs = null;
    function tick(ts) {
      reelState.autoRAF = requestAnimationFrame(tick);
      if (prevTs == null) prevTs = ts;
      const dt = ts - prevTs;
      prevTs = ts;
      if (reelState.dragging || reelState.hovered || reelState.manualPause || !reelState.items.length) {
        acc = 0;
        return;
      }
      acc += dt;
      if (acc >= REEL_AUTO_MS) {
        acc = 0;
        reelGoTo(1);
      }
    }
    reelState.autoRAF = requestAnimationFrame(tick);
  }

  /* ============ TRANSITION PLEIN ÉCRAN VERS UNE AUTRE PAGE ============ */
  function navigateToPage(href) {
    const overlay = document.createElement("div");
    overlay.className = "section-overlay is-active section-overlay--hero";
    document.body.appendChild(overlay);
    window.setTimeout(() => {
      window.location.href = href;
    }, 260);
  }

  /* ============ HERO D'ACCUEIL — carte scoreboard (liste de nav + pile de preview) ============ */
  function getMoiProfile() {
    if (!state.data) return [];
    const moi = (state.data.moi && state.data.moi[0]) || null;
    if (!moi) return [];
    const photo = Array.isArray(moi["Photo"]) && moi["Photo"][0] ? moi["Photo"][0].url : "";
    const subtitle = [moi["Age"] ? `${moi["Age"]} ans` : "", moi["Lieu"] || ""].filter(Boolean).join(" · ");
    return [{ title: moi["Nom"] || "Adrien Benichou", subtitle, coverUrl: photo, index: null }];
  }

  function getSoftwaresSorted() {
    if (!state.data) return [];
    return [...(state.data.softwares || [])].sort((a, b) => (a["Rang"] || 0) - (b["Rang"] || 0));
  }
  function softwareLogo(sw) {
    const logo = sw["Logo"];
    return Array.isArray(logo) && logo[0] ? logo[0].url : "";
  }

  function getDiplomesSorted() {
    if (!state.data) return [];
    return [...(state.data.diplomes || [])].sort((a, b) => {
      const dateA = new Date(a["Date"] || a["Date pas texte"] || 0);
      const dateB = new Date(b["Date"] || b["Date pas texte"] || 0);
      return dateA - dateB;
    });
  }

  function getBenevolatList() {
    if (!state.data) return [];
    return state.data.benevolat || [];
  }

  // Cartes de la pile du hero, normalisées par section — même ordre que celui utilisé
  // pour construire les data-hero-index de chaque page de section (deep-link ?open=).
  function getHeroItemsFor(sectionId) {
    if (sectionId === "apropos") return getMoiProfile();
    if (sectionId === "projets") {
      return getAllProjects().map((p, i) => ({ title: projectTitle(p), subtitle: projectByline(p), coverUrl: projectCover(p), index: i }));
    }
    if (sectionId === "softwares") {
      return getSoftwaresSorted().map((sw, i) => ({ title: sw["Logiciel"] || "", subtitle: sw["Type"] || "", coverUrl: softwareLogo(sw), index: i }));
    }
    if (sectionId === "diplomes") {
      return getDiplomesSorted().map((d, i) => ({ title: d["Nom"] || "", subtitle: d["Etablissement"] || "", coverUrl: "", index: i }));
    }
    if (sectionId === "benevolat") {
      return getBenevolatList().map((b, i) => ({ title: b["Mission"] || "", subtitle: b["Etiquette"] || "", coverUrl: "", index: i }));
    }
    return [];
  }

  function heroCardHref(section, item) {
    return item.index == null ? section.href : `${section.href}?open=${item.index}`;
  }

  const HERO_AUTO_DRIFT_RATE = 0.00045; // px de cycle / ms — même rythme que le design handoff

  const heroState = {
    sectionIndex: 0,
    items: [],
    pos: 0,
    stepPx: 90,
    dragging: false,
    navButtons: [],
    slots: [],
  };

  function isCompactHeroNav() {
    return window.matchMedia("(max-width: 860px)").matches;
  }

  function initHomeHero() {
    const navEl = document.getElementById("hero-nav");
    const stackEl = document.getElementById("hero-stack");
    const stackWrap = document.getElementById("hero-stack-wrap");
    if (!navEl || !stackEl || !stackWrap) return; // page sans hero (sous-pages)

    navEl.insertAdjacentHTML(
      "beforeend",
      NAV_SECTIONS.map(
        (section, i) => `
      <button type="button" class="hero-nav-item" data-index="${i}" style="--tint:${section.tint}">
        <span class="hero-nav-item-dot"></span>
        <p class="hero-nav-item-label" data-i18n="${section.labelKey}">${I18N[state.lang][section.labelKey]}</p>
      </button>`
      ).join("")
    );
    heroState.navButtons = Array.from(navEl.querySelectorAll(".hero-nav-item"));

    heroState.slots = Array.from({ length: 6 }).map(() => {
      const card = document.createElement("div");
      card.className = "hero-stack-card";
      card.style.display = "none";
      card.innerHTML = `
        <div class="hero-stack-card-media">
          <span class="hero-stack-card-media-dot"></span>
          <span class="hero-stack-card-media-line1"></span>
          <span class="hero-stack-card-media-line2"></span>
        </div>
        <div class="hero-stack-card-footer">
          <div>
            <p class="hero-stack-card-title"></p>
            <p class="hero-stack-card-subtitle"></p>
          </div>
        </div>`;
      card.addEventListener("click", () => activateHeroCard(card));
      stackEl.appendChild(card);
      return card;
    });

    heroState.navButtons.forEach((btn, i) => {
      btn.addEventListener("mouseenter", () => {
        if (!isCompactHeroNav()) setHeroSection(i);
      });
      btn.addEventListener("click", () => {
        setHeroSection(i);
        if (!isCompactHeroNav()) navigateToPage(NAV_SECTIONS[i].href);
      });
    });
    navEl.addEventListener("keydown", (e) => {
      const n = NAV_SECTIONS.length;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setHeroSection((heroState.sectionIndex + 1) % n);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setHeroSection((heroState.sectionIndex - 1 + n) % n);
      } else if (e.key === "Enter") {
        navigateToPage(NAV_SECTIONS[heroState.sectionIndex].href);
      }
    });

    initHeroNavDrag(navEl);
    initHeroStackDrag(stackWrap);

    stackWrap.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        heroState.pos = Math.round(heroState.pos) - 1;
        renderHeroStack();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        heroState.pos = Math.round(heroState.pos) + 1;
        renderHeroStack();
      }
    });

    window.addEventListener("resize", () => {
      measureHeroNavBubble();
      measureHeroStackStep();
    });

    const cta = document.getElementById("hero-all-cta");
    if (cta) {
      cta.addEventListener("click", (e) => {
        e.preventDefault();
        navigateToPage(cta.getAttribute("href"));
      });
    }

    setHeroSection(0);
    startHeroAutoDrift();
  }

  function setHeroSection(index) {
    heroState.sectionIndex = index;
    heroState.pos = 0;
    heroState.items = getHeroItemsFor(NAV_SECTIONS[index].id);
    heroState.navButtons.forEach((btn, i) => btn.classList.toggle("is-active", i === index));
    measureHeroNavBubble();
    renderHeroStack();
    measureHeroStackStep();
  }

  function measureHeroNavBubble() {
    const bubble = document.getElementById("hero-nav-bubble");
    const navEl = document.getElementById("hero-nav");
    const btn = heroState.navButtons[heroState.sectionIndex];
    if (!bubble || !btn || !navEl) return;
    bubble.style.left = `${btn.offsetLeft}px`;
    bubble.style.width = `${btn.offsetWidth}px`;
    const btnRight = btn.offsetLeft + btn.offsetWidth;
    if (btn.offsetLeft < navEl.scrollLeft) navEl.scrollLeft = Math.max(0, btn.offsetLeft - 6);
    else if (btnRight > navEl.scrollLeft + navEl.clientWidth) navEl.scrollLeft = btnRight - navEl.clientWidth + 6;
  }

  function measureHeroStackStep() {
    const card = heroState.slots[0];
    if (!card) return;
    const h = card.getBoundingClientRect().height || card.offsetHeight;
    if (h) heroState.stepPx = h * 0.237;
    renderHeroStack();
  }

  // Empile les cartes de preview verticalement autour de la position de cycle courante
  // (formule identique au design handoff : profondeur = décalage à l'entier de la position).
  function renderHeroStack() {
    const items = heroState.items;
    const total = items.length;
    const section = NAV_SECTIONS[heroState.sectionIndex];

    if (!total) {
      heroState.slots.forEach((card) => { card.style.display = "none"; });
      return;
    }

    if (total <= 1) {
      heroState.slots.forEach((card, i) => {
        if (i > 0) { card.style.display = "none"; return; }
        card.style.display = "flex";
        applyHeroCardContent(card, items[0], section);
        card.style.transform = "translate(-50%, -50%)";
        card.style.opacity = "1";
        card.style.zIndex = "10";
      });
      return;
    }

    const pos = heroState.pos;
    const base = Math.floor(pos) - 2;
    heroState.slots.forEach((card, i) => {
      const k = base + i;
      const itemIndex = ((k % total) + total) % total;
      const depth = k - pos;
      const ty = -depth * heroState.stepPx;
      const scale = Math.max(0.55, 1 - Math.abs(depth) * 0.14);
      const opacity = Math.abs(depth) < 0.15 ? 1 : Math.max(0, 1 - (Math.abs(depth) - 0.15) * 0.42);
      const zIndex = 100 - Math.round(Math.abs(depth) * 10);
      card.style.display = "flex";
      applyHeroCardContent(card, items[itemIndex], section);
      card.style.transform = `translate(-50%, -50%) translate(0px, ${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      card.style.opacity = String(opacity);
      card.style.zIndex = String(zIndex);
    });
  }

  function applyHeroCardContent(card, item, section) {
    card._href = heroCardHref(section, item);
    const cacheKey = item.title + "|" + item.coverUrl + "|" + item.subtitle;
    if (card.dataset.cachedKey === cacheKey) return;
    card.dataset.cachedKey = cacheKey;
    card.style.setProperty("--tint", section.tint);
    card.classList.toggle("has-cover", !!item.coverUrl);
    card.querySelector(".hero-stack-card-media").style.backgroundImage = item.coverUrl ? `url("${item.coverUrl}")` : "none";
    card.querySelector(".hero-stack-card-title").textContent = item.title;
    card.querySelector(".hero-stack-card-subtitle").textContent = item.subtitle || "";
  }

  function activateHeroCard(card) {
    if (card._href) navigateToPage(card._href);
  }

  function initHeroStackDrag(wrap) {
    let startY = 0;
    let startPos = 0;
    let moved = false;
    wrap.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      startY = e.clientY;
      startPos = heroState.pos;
      moved = false;
      heroState.dragging = true;
      wrap.classList.add("is-dragging");
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!heroState.dragging || heroState.items.length <= 1) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 4) moved = true;
      heroState.pos = startPos + dy / heroState.stepPx;
      renderHeroStack();
    });
    const end = () => {
      if (!heroState.dragging) return;
      heroState.dragging = false;
      wrap.classList.remove("is-dragging");
      if (heroState.items.length > 1) {
        heroState.pos = Math.round(heroState.pos);
        renderHeroStack();
      }
      if (moved) {
        // un vrai drag a eu lieu — on avale le click qui suit pour ne pas déclencher une navigation
        const suppressClick = (ce) => { ce.stopPropagation(); ce.preventDefault(); };
        document.addEventListener("click", suppressClick, { capture: true, once: true });
      }
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
  }

  function initHeroNavDrag(navEl) {
    navEl.addEventListener("pointerdown", (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return; // tactile : défilement natif (touch-action: pan-x)
      if (!isCompactHeroNav()) return;
      const startX = e.clientX;
      const startScroll = navEl.scrollLeft;
      let moved = false;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        navEl.scrollLeft = startScroll - dx;
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        if (moved) {
          const suppressClick = (ce) => { ce.stopPropagation(); ce.preventDefault(); };
          document.addEventListener("click", suppressClick, { capture: true, once: true });
        }
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  }

  function startHeroAutoDrift() {
    let prevTs = null;
    function tick(ts) {
      requestAnimationFrame(tick);
      if (prevTs == null) prevTs = ts;
      const dt = Math.min(ts - prevTs, 100);
      prevTs = ts;
      if (heroState.dragging || heroState.items.length <= 1) return;
      heroState.pos += HERO_AUTO_DRIFT_RATE * dt;
      renderHeroStack();
    }
    requestAnimationFrame(tick);
  }

  /* ============ CHARGEMENT DES DONNÉES ============ */
  async function loadData() {
    try {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error(`data.json introuvable (${res.status})`);
      state.data = await res.json();
      renderAll();
    } catch (err) {
      console.error("Erreur de chargement de data.json :", err);
    }
  }

  function renderAll() {
    renderApropos();
    renderProjets();
    renderSoftwares();
    renderDiplomes();
    renderBenevolat();
  }

  /* ============ À PROPOS ============ */
  function renderApropos() {
    const descEl = document.getElementById("apropos-description");
    if (!descEl) return; // page sans section À propos

    const moi = (state.data.moi && state.data.moi[0]) || {};

    setText("apropos-description", moi["Description"]);
    setText("apropos-lieu", moi["Lieu"]);
    setText("lang-fr", moi["Français"]);
    setText("lang-en", moi["Anglais"]);
    setText("lang-de", moi["Allemand"]);

    const mailEl = document.getElementById("apropos-mail");
    const email = moi["Email"] || moi["Mail"];
    if (email && mailEl) {
      mailEl.textContent = email;
      mailEl.href = `mailto:${email}`;
    }

    const photoEl = document.getElementById("hero-photo-img");
    if (photoEl && moi["Photo"] && moi["Photo"][0]) {
      photoEl.src = moi["Photo"][0].url;
    }

    // Timeline : expériences "terrain" (pro/stage/job/césure) triées de la plus récente à la plus ancienne
    const timelineEl = document.getElementById("apropos-timeline");
    const experiences = [
      ...(state.data.projetsPro || []),
      ...(state.data.projetsStage || []),
      ...(state.data.projetsJob || []),
      ...(state.data.projetsCesure || []),
    ].sort((a, b) => new Date(b["Date"] || 0) - new Date(a["Date"] || 0));

    timelineEl.innerHTML = experiences
      .map(
        (exp) => `
        <li class="timeline-item">
          <p class="timeline-date">${projectDateText(exp)}</p>
          <p class="timeline-title">${projectTitle(exp)}</p>
          <p class="timeline-desc">${projectByline(exp)}</p>
        </li>`
      )
      .join("");

    // Compétences groupées (extraites des projets)
    const allSkills = new Set();
    [...experiences, ...(state.data.projetsEtudiant || [])].forEach((exp) => {
      const skills = exp["Compétences"];
      if (Array.isArray(skills)) skills.forEach((s) => allSkills.add(s));
    });
    const skillsEl = document.getElementById("apropos-skills");
    skillsEl.innerHTML = `
      <div>
        <p class="skills-group-title">Compétences clés</p>
        <div class="skills-list">
          ${[...allSkills].map((s) => `<span class="skill-tag">${s}</span>`).join("")}
        </div>
      </div>`;
  }

  /* ============ PROJETS : ORBITE + MODAL ÉDITORIAL ============ */
  // Miroir exact de la formule CSS de .orbit-nav (--orbit-outer / --orbit-size / --orbit-label-gap)
  function getOrbitRadius() {
    const outer = Math.max(240, Math.min(700, window.innerHeight * 0.74, window.innerWidth * 0.84));
    const size = outer * 0.74;
    const gap = outer * 0.058;
    return size / 2 + gap;
  }

  const orbitState = {
    projects: [],
    activeIndex: 0,
  };
  const modalState = {
    isOpen: false,
    originNode: null,
  };

  function getAllProjects() {
    const pro = (state.data.projetsPro || []).map((p) => ({ ...p, _cat: "pro" }));
    const stage = (state.data.projetsStage || []).map((p) => ({ ...p, _cat: "stage" }));
    const job = (state.data.projetsJob || []).map((p) => ({ ...p, _cat: "job" }));
    const cesure = (state.data.projetsCesure || []).map((p) => ({ ...p, _cat: "cesure" }));
    const etudiant = (state.data.projetsEtudiant || []).map((p) => ({ ...p, _cat: "etudiant" }));
    return [...pro, ...stage, ...job, ...cesure, ...etudiant];
  }

  // Le nom exact du champ "titre" varie légèrement entre tables Airtable ;
  // on essaie toutes les variantes rencontrées plutôt que de supposer une seule table.
  function projectTitle(p) {
    return p["Titre"] || p["Nom du projet"] || p["Titre du projet"] || p["Titre du post"] || "Projet";
  }

  function projectCover(p) {
    const cover = p["Cover"] || p["Photo"] || p["Photos"];
    if (Array.isArray(cover) && cover[0]) return cover[0].url;
    return "";
  }

  // Idem pour la date affichée : certaines tables ont "Date text"/"Date Texte", d'autres "Date (texte)".
  function projectDateText(p) {
    return p["Date text"] || p["Date Text"] || p["Date Texte"] || p["Date (texte)"] || p["Date"] || "";
  }

  // Les tables pro/stage/job/césure ont "Entreprise" ; la table académique a "Etude" à la place.
  function projectByline(p) {
    return p["Entreprise"] || p["Etude"] || "";
  }

  const CATEGORY_I18N_KEY = {
    pro: "projets.filterPro",
    stage: "projets.filterStage",
    job: "projets.filterJob",
    cesure: "projets.filterCesure",
    etudiant: "projets.filterEtudiant",
  };
  function categoryLabel(cat) {
    const key = CATEGORY_I18N_KEY[cat];
    return key ? I18N[state.lang][key] : "";
  }

  function renderProjets() {
    const clientsEl = document.getElementById("projets-clients");
    if (!clientsEl) return; // page sans section Projets

    const clients = ["AS Monaco", "CNOSF", "Paris 2024", "Centre Français"];
    clientsEl.innerHTML = clients.map((c) => `<li>${c}</li>`).join("");

    renderOrbit();
    buildReelSlides();
    initProjetsAllGrid();

    // Lien profond depuis une carte de la pile du hero (?open=<index>) : ouvre directement
    // la fiche du projet correspondant, avec la même animation "shared element" qu'un clic.
    const openIndex = getOpenParamIndex();
    if (openIndex != null && orbitState.projects[openIndex]) {
      const node = document.querySelector(`.orbit-node[data-index="${openIndex}"]`);
      openProjectModal(openIndex, node);
    }

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.activeFilter = btn.getAttribute("data-filter");
        renderOrbit();
      });
    });
  }

  function renderOrbit() {
    let projects = getAllProjects();

    if (state.activeFilter !== "all") {
      projects = projects.filter((p) => p._cat === state.activeFilter);
    }

    orbitState.projects = projects;
    orbitState.activeIndex = 0;

    const track = document.getElementById("projets-orbit-track");
    const step = 360 / Math.max(projects.length, 1);

    track.innerHTML = projects
      .map(
        (p, i) => `
        <button
          type="button"
          class="orbit-node"
          data-index="${i}"
          data-angle="${i * step}"
          role="option"
          aria-selected="false"
        >
          <span>${projectTitle(p)}</span>
        </button>`
      )
      .join("");

    applyOrbitLayout();

    track.querySelectorAll(".orbit-node").forEach((node, i) => {
      node.addEventListener("mouseenter", () => showOrbitPreview(i));
      node.addEventListener("focus", () => showOrbitPreview(i));
      node.addEventListener("mouseleave", () => showOrbitPreview(orbitState.activeIndex));
      node.addEventListener("blur", () => showOrbitPreview(orbitState.activeIndex));
      node.addEventListener("click", () => openProjectModal(i, node));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProjectModal(i, node);
        }
      });
    });

    if (projects.length) showOrbitPreview(0);
  }

  // Grille filtrable "Tous mes projets" — remplace l'orbite en dessous de 720px (voir CSS).
  // Filtres multi-sélection par Type / Compétence / Organisation, à partir des champs
  // Airtable réels (Date text, Compétences, Entreprise/Etude) déjà utilisés par l'orbite.
  const projetsAllGridState = { filterType: [], filterComp: [], filterOrg: [], openGroup: null };

  function openProjectFromCard(index, originEl) {
    if (state.activeFilter !== "all") {
      state.activeFilter = "all";
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-filter") === "all");
      });
      renderOrbit();
    }
    openProjectModal(index, originEl);
  }

  function initProjetsAllGrid() {
    const filterBar = document.getElementById("projets-mobile-filterbar");
    const grid = document.getElementById("projets-mobile-grid");
    if (!filterBar || !grid) return; // page sans grille mobile

    filterBar.addEventListener("click", (e) => {
      const groupBtn = e.target.closest(".projets-mobile-filter-btn");
      const chip = e.target.closest(".projets-mobile-filter-chip");
      const reset = e.target.closest(".projets-mobile-reset");
      if (groupBtn) {
        const key = groupBtn.getAttribute("data-group");
        projetsAllGridState.openGroup = projetsAllGridState.openGroup === key ? null : key;
        renderProjetsAllGrid();
      } else if (chip) {
        const key = chip.getAttribute("data-group");
        const value = chip.getAttribute("data-value");
        const list = projetsAllGridState[key];
        const idx = list.indexOf(value);
        if (idx === -1) list.push(value);
        else list.splice(idx, 1);
        renderProjetsAllGrid();
      } else if (reset) {
        projetsAllGridState.filterType = [];
        projetsAllGridState.filterComp = [];
        projetsAllGridState.filterOrg = [];
        projetsAllGridState.openGroup = null;
        renderProjetsAllGrid();
      }
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".projets-mobile-card");
      if (!card) return;
      openProjectFromCard(parseInt(card.getAttribute("data-index"), 10), card);
    });

    document.addEventListener("click", (e) => {
      if (!projetsAllGridState.openGroup) return;
      if (!e.target.closest(".projets-mobile-filter-group")) {
        projetsAllGridState.openGroup = null;
        renderProjetsAllGrid();
      }
    });

    renderProjetsAllGrid();
  }

  function renderProjetsAllGrid() {
    const filterBar = document.getElementById("projets-mobile-filterbar");
    const grid = document.getElementById("projets-mobile-grid");
    if (!filterBar || !grid) return;

    const all = getAllProjects();
    const s = projetsAllGridState;
    const groups = [
      { key: "filterType", title: "Type", values: Array.from(new Set(all.map(projectDateText).filter(Boolean))) },
      { key: "filterComp", title: "Compétence", values: Array.from(new Set(all.flatMap((p) => p["Compétences"] || []))) },
      { key: "filterOrg", title: "Organisation", values: Array.from(new Set(all.map(projectByline).filter(Boolean))) },
    ];
    const activeCount = s.filterType.length + s.filterComp.length + s.filterOrg.length;

    filterBar.innerHTML =
      groups
        .map((g) => {
          const active = s[g.key];
          const isOpen = s.openGroup === g.key;
          return `
        <div class="projets-mobile-filter-group">
          <button type="button" class="projets-mobile-filter-btn${active.length ? " is-active" : ""}" data-group="${g.key}">
            ${g.title}${active.length ? ` (${active.length})` : ""} <span class="projets-mobile-filter-chevron">▾</span>
          </button>
          ${
            isOpen
              ? `<div class="projets-mobile-filter-menu">${g.values
                  .map(
                    (v) => `<button type="button" class="projets-mobile-filter-chip${active.includes(v) ? " is-active" : ""}" data-group="${g.key}" data-value="${v}">${v}</button>`
                  )
                  .join("")}</div>`
              : ""
          }
        </div>`;
        })
        .join("") + (activeCount ? `<button type="button" class="projets-mobile-reset">Réinitialiser</button>` : "");

    const filtered = all
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !s.filterType.length || s.filterType.includes(projectDateText(p)))
      .filter(({ p }) => !s.filterOrg.length || s.filterOrg.includes(projectByline(p)))
      .filter(({ p }) => !s.filterComp.length || (p["Compétences"] || []).some((c) => s.filterComp.includes(c)));

    grid.innerHTML = filtered
      .map(({ p, i }) => {
        const cover = projectCover(p);
        return `
        <button type="button" class="projets-mobile-card" data-index="${i}">
          <div class="projets-mobile-card-media"${cover ? ` style="background-image:url('${cover}')"` : ""}></div>
          <p class="projets-mobile-card-title">${projectTitle(p)}</p>
          <p class="projets-mobile-card-meta">${projectDateText(p)}</p>
        </button>`;
      })
      .join("");
  }

  function applyOrbitLayout() {
    const radius = getOrbitRadius();
    document.querySelectorAll(".orbit-node").forEach((node) => {
      node.style.setProperty("--angle", `${node.getAttribute("data-angle")}deg`);
      node.style.setProperty("--radius", `${radius}px`);
    });
  }

  function showOrbitPreview(index) {
    const project = orbitState.projects[index];
    if (!project) return;

    document.querySelectorAll(".orbit-node").forEach((node, i) => {
      const isActive = i === orbitState.activeIndex;
      node.classList.toggle("is-active", isActive);
      node.setAttribute("aria-selected", String(isActive));
    });

    const img = document.getElementById("orbit-center-img");
    const cover = projectCover(project);
    if (cover) {
      img.src = cover;
      img.alt = projectTitle(project);
      img.classList.add("is-visible");
    } else {
      img.classList.remove("is-visible");
    }

    document.getElementById("orbit-center-cat").textContent = categoryLabel(project._cat);
    document.getElementById("orbit-center-title").textContent = projectTitle(project);
    document.getElementById("orbit-center-meta").textContent = [projectByline(project), projectDateText(project)]
      .filter(Boolean)
      .join(" · ");
    document.querySelector(".orbit-center-text").classList.add("is-visible");
  }

  /* ---- Modal éditorial plein écran (ouverture "shared element" depuis le nœud cliqué) ---- */
  function getModalEls() {
    return {
      modal: document.getElementById("projet-modal"),
      content: document.getElementById("projet-modal-content"),
      scroll: document.getElementById("projet-modal-scroll"),
      img: document.getElementById("projet-modal-img"),
      entreprise: document.getElementById("projet-modal-entreprise"),
      title: document.getElementById("projet-modal-title"),
      dates: document.getElementById("projet-modal-dates"),
      description: document.getElementById("projet-modal-description"),
      skills: document.getElementById("projet-modal-skills"),
      indexCurrent: document.getElementById("projet-modal-index-current"),
      indexTotal: document.getElementById("projet-modal-index-total"),
      prevBtn: document.getElementById("projet-modal-prev"),
      nextBtn: document.getElementById("projet-modal-next"),
    };
  }

  // Formatte la date ISO ("2023-06-01") en repère lisible ("juin 2023") ; les tables sans
  // date exacte (académique) n'ont que "Date text" et laissent ce chip de côté.
  function formatProjectDate(p) {
    const raw = p["Date"];
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(state.lang === "en" ? "en-US" : "fr-FR", { month: "short", year: "numeric" });
  }

  function fillModalContent(project, index) {
    const els = getModalEls();
    els.img.src = projectCover(project);
    els.img.alt = projectTitle(project);
    els.title.textContent = projectTitle(project);
    els.entreprise.textContent = projectByline(project);
    els.description.textContent = project["Description"] || "";

    const dateChips = [projectDateText(project), formatProjectDate(project)].filter(Boolean);
    els.dates.innerHTML = dateChips.map((d) => `<span class="projet-modal-date-chip">${d}</span>`).join("");

    const skills = project["Compétences"];
    els.skills.innerHTML = Array.isArray(skills)
      ? skills
          .map((s) => {
            const color = colorForCompetence(s);
            return `<li style="background:${color}1c; border:1px solid ${color}40; color:${color};">${emojiForCompetence(s)} ${s}</li>`;
          })
          .join("")
      : "";

    els.indexCurrent.textContent = index + 1;
    els.indexTotal.textContent = orbitState.projects.length;
    els.prevBtn.disabled = orbitState.projects.length <= 1;
    els.nextBtn.disabled = orbitState.projects.length <= 1;
    els.scroll.scrollTop = 0;
  }

  function flipOpen(content, fromRect) {
    const toRect = content.getBoundingClientRect();
    const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
    const scaleX = fromRect.width / toRect.width;
    const scaleY = fromRect.height / toRect.height;

    content.style.transition = "none";
    content.style.opacity = "0.4";
    content.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    // force reflow avant de lancer la transition
    // eslint-disable-next-line no-unused-expressions
    content.offsetHeight;
    content.style.transition = "transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out";
    content.style.transform = "translate(0, 0) scale(1, 1)";
    content.style.opacity = "1";
  }

  function openProjectModal(index, originNode) {
    const project = orbitState.projects[index];
    if (!project) return;

    orbitState.activeIndex = index;
    showOrbitPreview(index);

    const els = getModalEls();
    fillModalContent(project, index);

    modalState.isOpen = true;
    modalState.originNode = originNode || null;
    els.modal.hidden = false;
    document.body.style.overflow = "hidden";

    if (state.reducedMotion) {
      requestAnimationFrame(() => els.modal.classList.add("is-open"));
      return;
    }

    const fromRect = (originNode || els.content).getBoundingClientRect();
    requestAnimationFrame(() => {
      els.modal.classList.add("is-open");
      flipOpen(els.content, fromRect);
    });
  }

  function closeProjectModal() {
    if (!modalState.isOpen) return;
    const els = getModalEls();
    const originNode =
      document.querySelector(`.orbit-node[data-index="${orbitState.activeIndex}"]`) || modalState.originNode;

    els.modal.classList.remove("is-open");

    if (state.reducedMotion || !originNode) {
      els.modal.hidden = true;
      document.body.style.overflow = "";
      modalState.isOpen = false;
      return;
    }

    const toRect = originNode.getBoundingClientRect();
    const fromRect = els.content.getBoundingClientRect();
    const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
    const scaleX = toRect.width / fromRect.width;
    const scaleY = toRect.height / fromRect.height;

    els.content.style.transition = "transform 0.32s cubic-bezier(0.6, 0, 0.8, 0.2), opacity 0.28s ease-in";
    els.content.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    els.content.style.opacity = "0.3";

    const onEnd = () => {
      els.modal.hidden = true;
      document.body.style.overflow = "";
      els.content.style.transition = "none";
      els.content.style.transform = "";
      els.content.style.opacity = "";
      modalState.isOpen = false;
      els.content.removeEventListener("transitionend", onEnd);
    };
    els.content.addEventListener("transitionend", onEnd);
  }

  function navigateProject(delta) {
    if (!modalState.isOpen || orbitState.projects.length <= 1) return;
    const total = orbitState.projects.length;
    const newIndex = (orbitState.activeIndex + delta + total) % total;
    const els = getModalEls();
    const direction = delta > 0 ? "is-swiping-next" : "is-swiping-prev";

    els.content.classList.add(direction);
    window.setTimeout(() => {
      orbitState.activeIndex = newIndex;
      showOrbitPreview(newIndex);
      fillModalContent(orbitState.projects[newIndex], newIndex);
      els.content.classList.remove(direction);
    }, 220);
  }

  function initModal() {
    const modalEl = document.getElementById("projet-modal");
    if (!modalEl) return; // page sans modal projet

    const els = getModalEls();

    document.querySelectorAll("[data-modal-close]").forEach((el) => {
      el.addEventListener("click", closeProjectModal);
    });
    els.prevBtn.addEventListener("click", () => navigateProject(-1));
    els.nextBtn.addEventListener("click", () => navigateProject(1));

    document.addEventListener("keydown", (e) => {
      if (!modalState.isOpen) return;
      if (e.key === "Escape") closeProjectModal();
      else if (e.key === "ArrowRight") navigateProject(1);
      else if (e.key === "ArrowLeft") navigateProject(-1);
    });

    // Swipe horizontal (mobile / tablette)
    let touchStartX = 0;
    let touchStartY = 0;
    els.content.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );
    els.content.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          navigateProject(dx < 0 ? 1 : -1);
        }
      },
      { passive: true }
    );
  }

  /* ============ SOFTWARES ============ */
  function renderSoftwares() {
    const grid = document.getElementById("softwares-grid");
    if (!grid) return; // page sans section Softwares

    const softwares = getSoftwaresSorted();
    const grouped = {};
    softwares.forEach((sw, i) => {
      const type = sw["Type"] || "Autres";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({ ...sw, _heroIndex: i });
    });

    grid.innerHTML = Object.entries(grouped)
      .map(
        ([type, items]) => `
        <div class="skills-group-title" style="grid-column: 1 / -1;">${type}</div>
        ${items
          .map(
            (sw) => `
          <div class="software-item" data-hero-index="${sw._heroIndex}">
            <img src="${softwareLogo(sw)}" alt="${sw["Logiciel"]}">
            <p class="software-item-name">${sw["Logiciel"]}</p>
          </div>`
          )
          .join("")}`
      )
      .join("");
    applyDeepLinkHighlight();
  }

  /* ============ DIPLÔMES ============ */
  function renderDiplomes() {
    const timelineEl = document.getElementById("diplomes-timeline");
    if (!timelineEl) return; // page sans section Diplômes

    const diplomes = getDiplomesSorted();

    timelineEl.innerHTML = diplomes
      .map(
        (d, i) => `
        <li class="timeline-item" data-hero-index="${i}">
          <p class="timeline-date">${d["Date (texte)"] || ""}</p>
          <p class="timeline-title">${d["Nom"] || ""}</p>
          <p class="timeline-desc">${d["Etablissement"] || ""} — ${d["Description"] || ""}</p>
        </li>`
      )
      .join("");
    applyDeepLinkHighlight();
  }

  /* ============ BÉNÉVOLAT ============ */
  function renderBenevolat() {
    const grid = document.getElementById("benevolat-grid");
    if (!grid) return; // page sans section Bénévolat

    const benevolat = getBenevolatList();
    grid.innerHTML = benevolat
      .map(
        (b, i) => `
        <div class="benevolat-card" data-hero-index="${i}">
          <span class="benevolat-card-tag">${b["Etiquette"] || ""}</span>
          <p class="benevolat-card-mission">${b["Mission"] || ""}</p>
          <p class="benevolat-card-meta">${b["Lieu"] || ""} · ${b["Date (texte)"] || b["Date"] || ""}</p>
          <p class="benevolat-card-desc">${b["Description"] || ""}</p>
        </div>`
      )
      .join("");
    applyDeepLinkHighlight();
  }

  // Lien profond depuis la pile du hero (?open=<index>) vers un élément déjà visible sur la
  // page : ces pages n'ont pas de fiche cachée, donc on scrolle vers l'élément et on le surligne
  // brièvement plutôt que d'inventer une modale sans contenu supplémentaire à montrer.
  function applyDeepLinkHighlight() {
    const idx = getOpenParamIndex();
    if (idx == null) return;
    const el = document.querySelector(`[data-hero-index="${idx}"]`);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: state.reducedMotion ? "auto" : "smooth", block: "center" });
      el.classList.add("is-deep-link-target");
      setTimeout(() => el.classList.remove("is-deep-link-target"), 1600);
    });
  }

  /* ============ CONTACT ============ */
  function renderContact() {
    const contactMail = document.getElementById("contact-mail");
    if (!contactMail) return; // page sans section Contact

    const moi = (state.data && state.data.moi && state.data.moi[0]) || {};
    const email = moi["Email"] || moi["Mail"];
    if (email) {
      contactMail.href = `mailto:${email}`;
    }
  }

  /* ============ HELPER ============ */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  /* ============ SCROLL REVEALS ============ */
  function initScrollReveals() {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.remove("is-visible"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));

    if (window.AOS) {
      window.AOS.init({ duration: 500, once: true, offset: 60 });
    }
  }

  /* ============ RESIZE ============ */
  function initResizeHandling() {
    window.addEventListener("resize", () => {
      cancelAnimationFrame(state.resizeRAF);
      state.resizeRAF = requestAnimationFrame(() => {
        applyOrbitLayout();
        measureReelStep();
      });
    });
  }

  /* ============ REBOND VERTICAL DU NOM EN FOND DE HERO (façon balle de basket) ============ */
  // Au chargement, le nom tombe légèrement, touche le sol (sa position naturelle) et rebondit
  // avec élasticité jusqu'à stabilisation. Survoler/bouger la souris injecte de l'énergie
  // (plus on stimule, plus le rebond est ample) ; sans interaction, l'amplitude redescend
  // progressivement. La hauteur est toujours plafonnée pour ne jamais sortir de l'écran.
  const BOUNCE_GRAVITY = 0.0022; // px/ms² — accélère le retour vers le sol (y = 0)
  const BOUNCE_RESTITUTION = 0.6; // fraction de vitesse conservée à chaque rebond
  const BOUNCE_MAX_RISE = -40; // px — plafond absolu (sécurité anti-débordement d'écran)
  const BOUNCE_KICK_PER_PXMS = 0.007; // impulsion ajoutée par vitesse de la souris (par événement)
  const BOUNCE_MAX_KICK = 0.15; // impulsion max par événement (évite un rebond trop violent)
  const BOUNCE_ENTER_KICK = 0.12; // petite impulsion pour "réveiller" le rebond à l'entrée de la souris
  // Une force continue ne ferait que lutter contre la gravité sans jamais faire grandir le rebond
  // (comme pousser une balançoire en continu au lieu de la relancer au bon moment) : on booste donc
  // la vitesse à chaque contact avec le sol tant que la souris survole, comme quand on fait rebondir
  // un ballon de basket à la main.
  const BOUNCE_HOVER_BOOST = 0.09; // px/ms ajoutés à la vitesse de rebond à chaque contact, si survolé
  const BOUNCE_SETTLE_EPS_Y = 0.05;
  const BOUNCE_SETTLE_EPS_V = 0.01;

  function initHeroNameBounce() {
    const nameEl = document.getElementById("hero-bg-name");
    if (!nameEl || state.reducedMotion) return;

    let y = -18; // légère chute d'entrée depuis au-dessus de la position naturelle
    let vy = 0;
    let hovered = false;
    let lastMoveX = null;
    let lastMoveY = null;
    let lastMoveTs = 0;
    let bounceRAF = null;
    let prevTickTs = null;
    let maxRise = BOUNCE_MAX_RISE;

    function computeMaxRise() {
      const rect = nameEl.getBoundingClientRect();
      // Ne jamais laisser le nom dépasser le haut du viewport, même sur un écran très court.
      const available = Math.max(0, rect.top - 12);
      maxRise = -Math.min(-BOUNCE_MAX_RISE, available);
    }
    computeMaxRise();
    window.addEventListener("resize", computeMaxRise);

    function settle() {
      y = 0;
      vy = 0;
      bounceRAF = null;
      prevTickTs = null;
      nameEl.style.transform = "";
    }

    function tick(ts) {
      const dt = Math.min(ts - (prevTickTs || ts), 48);
      prevTickTs = ts;

      vy += BOUNCE_GRAVITY * dt;
      y += vy * dt;

      if (y >= 0) {
        y = 0;
        if (vy > 0) {
          vy = -(vy * BOUNCE_RESTITUTION + (hovered ? BOUNCE_HOVER_BOOST : 0));
        }
      }
      if (y < maxRise) {
        y = maxRise;
        if (vy < 0) vy = 0;
      }

      if (!hovered && Math.abs(y) < BOUNCE_SETTLE_EPS_Y && Math.abs(vy) < BOUNCE_SETTLE_EPS_V) {
        settle();
        return;
      }

      nameEl.style.transform = `translateY(${y.toFixed(2)}px)`;
      bounceRAF = requestAnimationFrame(tick);
    }

    function ensureRunning() {
      if (!bounceRAF) bounceRAF = requestAnimationFrame(tick);
    }

    ensureRunning();

    nameEl.addEventListener("mouseenter", () => {
      hovered = true;
      // Si le nom est déjà parfaitement immobile, une petite impulsion relance le rebond
      // (sinon il n'y a pas de contact au sol sur lequel appliquer le boost de survol).
      if (Math.abs(vy) < BOUNCE_SETTLE_EPS_V && Math.abs(y) < BOUNCE_SETTLE_EPS_Y) {
        vy = -BOUNCE_ENTER_KICK;
      }
      ensureRunning();
    });

    nameEl.addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (lastMoveX != null) {
        const dt = Math.max(now - lastMoveTs, 1);
        const speed = Math.hypot(e.clientX - lastMoveX, e.clientY - lastMoveY) / dt;
        vy -= Math.min(speed * BOUNCE_KICK_PER_PXMS, BOUNCE_MAX_KICK);
      }
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
      lastMoveTs = now;
      ensureRunning();
    });

    nameEl.addEventListener("mouseleave", () => {
      hovered = false;
      lastMoveX = null;
      lastMoveY = null;
    });
  }

  /* ============ INIT ============ */
  document.addEventListener("DOMContentLoaded", () => {
    state.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    applyI18n();
    initLangSwitcher();
    initCustomCursor();
    initReelControls();
    initReelKeyboard();
    startReelAuto();
    initModal();
    initScrollReveals();
    initResizeHandling();
    initHeroNameBounce();

    // Chaque page (y compris l'accueil) a besoin de data.json : le hero affiche désormais
    // de vraies cartes de preview (projets/softwares/diplômes/bénévolat) dans sa pile.
    loadData().then(() => {
      initHomeHero();
      renderContact();
    });
  });
})();
