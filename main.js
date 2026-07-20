/* ============================================
   main.js — Portfolio Adrien Benichou
   Hero scoreboard (nav + pile de preview), orbite/bandeau projets,
   fiche plein écran partagée (design Claude Design), données Airtable
   (data.json), i18n, filtres
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

  function activateReelSlide(index, originEl) {
    const project = reelState.items[index];
    if (project) openProjectFiche(project, originEl);
  }

  // Ouvre la fiche d'un projet depuis n'importe quel point d'entrée (orbite, bandeau, grille
  // filtrable mobile) — tint fixe de la section "Mes projets", indépendant du filtre actif.
  function openProjectFiche(project, originEl) {
    const tint = NAV_SECTIONS.find((s) => s.id === "projets").tint;
    openFiche(buildProjectFiche(project, tint), originEl);
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
        activateReelSlide(parseInt(reelState.pressedSlide.getAttribute("data-index"), 10), reelState.pressedSlide);
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

  /* ============ FICHE — modal détail plein écran (copie du composant Claude Design) ============ */
  // Un item de fiche est un objet normalisé, identique quelle que soit la section d'origine
  // (Airtable expose des colonnes différentes par table) — c'est ce qui alimente à la fois la
  // pile du hero, les grilles/listes de chaque page, et la fiche elle-même.

  function attachmentList(field) {
    if (!Array.isArray(field)) return [];
    return field.map((a) => ({ url: a.url, label: a.filename || "Document" })).filter((a) => a.url);
  }
  function attachmentUrls(field) {
    return attachmentList(field).map((a) => a.url);
  }
  // Le champ Airtable "Missions" est un texte long, une puce "• " par ligne (comme "Description").
  function splitBulletField(text) {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    return text
      .split(/\n+/)
      .map((l) => l.trim().replace(/^[•\-]\s+/, ""))
      .filter(Boolean);
  }

  // Segments **gras** / <a href="">liens</a> pour un rendu inline fidèle au texte Airtable
  // (mêmes conventions que celles tapées dans les champs longs : gras markdown, liens HTML).
  function parseInline(text) {
    if (!text) return [];
    const t = String(text).replace(/<\/?u>/g, "");
    const segments = [];
    const regex = /<a\s+href="([^"]*)">([^<]*)<\/a>|\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let m;
    while ((m = regex.exec(t))) {
      if (m.index > lastIndex) segments.push({ kind: "text", text: t.slice(lastIndex, m.index) });
      if (m[1] !== undefined) segments.push({ kind: "link", text: m[2], href: m[1] });
      else segments.push({ kind: "bold", text: m[3] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < t.length) segments.push({ kind: "text", text: t.slice(lastIndex) });
    return segments;
  }

  function inlineHtml(segments) {
    return segments
      .map((s) => {
        const safe = s.text;
        if (s.kind === "bold") return `<strong>${safe}</strong>`;
        if (s.kind === "link") return `<a href="${s.href}" target="_blank" rel="noopener">${safe}</a>`;
        return safe;
      })
      .join("");
  }

  // Repère "Description" combiné (pas d'Aperçu/Missions séparés dans Airtable) en blocs
  // intro / puces missions / clôture — même heuristique que le composant Claude Design.
  function splitDescriptionIntoBlocks(description) {
    const blocks = (description || "").split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
    const introParagraphs = [];
    const missions = [];
    const closingParagraphs = [];
    let seenMissions = false;
    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isBulletBlock = lines.some((l) => /^[•\-]\s+/.test(l));
      const strippedBlock = block.replace(/<\/?u>/g, "").trim();
      const isHeadingOnly = strippedBlock.length < 60 && /^[a-zàâéèêëîïôûù\s]+:?$/i.test(strippedBlock) && /mission/i.test(strippedBlock);
      if (isHeadingOnly) {
        seenMissions = true;
        continue;
      }
      if (isBulletBlock) {
        seenMissions = true;
        for (const l of lines) {
          if (/^[•\-]\s+/.test(l)) missions.push(l.replace(/^[•\-]\s+/, ""));
          else if (missions.length) missions[missions.length - 1] += " " + l;
        }
        continue;
      }
      if (!seenMissions) introParagraphs.push(block);
      else closingParagraphs.push(block);
    }
    return { introParagraphs, missions, closingParagraphs };
  }

  // Construit les onglets de la fiche (Aperçu, Missions, À propos, Documents) à partir d'un
  // objet "brut" normalisé — ne garde que les onglets qui ont réellement du contenu.
  function buildFicheTabs(raw) {
    let introParagraphs = [];
    let missions = [];
    let closingParagraphs = [];
    if (raw.apercu || (raw.missions && raw.missions.length)) {
      introParagraphs = (raw.apercu || "").split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
      missions = raw.missions || [];
    } else {
      const split = splitDescriptionIntoBlocks(raw.description);
      introParagraphs = split.introParagraphs;
      missions = split.missions;
      closingParagraphs = split.closingParagraphs;
    }

    const toBlocks = (paras) => paras.map((p) => ({ isMission: false, segments: parseInline(p) }));
    const missionBlocks = missions.map((m) => ({ isMission: true, segments: parseInline(m) }));

    const aboutLines = [];
    if (raw.entrepriseDescription) aboutLines.push(raw.entrepriseDescription);
    (raw.links || []).forEach((l) => {
      if (!l.url) return;
      const label = l.label || l.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      aboutLines.push(`${l.emoji || "🔗"} <a href="${l.url}">${label}</a>`);
    });
    const aboutBlocks = aboutLines.map((p) => ({ isMission: false, segments: parseInline(p) }));

    const tabs = [];
    const apercuBlocks = [...toBlocks(introParagraphs), ...toBlocks(closingParagraphs)];
    if (apercuBlocks.length) tabs.push({ key: "apercu", label: "Aperçu", kind: "text", dotColor: "#FF6B35", blocks: apercuBlocks });
    if (missionBlocks.length) tabs.push({ key: "missions", label: "Missions", kind: "text", dotColor: "#0E7C86", blocks: missionBlocks });
    if (aboutBlocks.length) {
      tabs.push({ key: "apropos", label: raw.kicker ? `À propos · ${raw.kicker}` : "À propos", kind: "text", dotColor: "#1B4FDB", blocks: aboutBlocks });
    }
    const hasDocs = (raw.documentPhotos && raw.documentPhotos.length) || (raw.documentPdfs && raw.documentPdfs.length);
    if (hasDocs) {
      tabs.push({ key: "documents", label: "Documents", kind: "documents", dotColor: "#D6336C", photos: raw.documentPhotos || [], pdfs: raw.documentPdfs || [] });
    }
    return tabs;
  }

  // Assemble l'objet fiche final (affichage + onglets) à partir d'un objet brut normalisé.
  function finalizeFiche(raw) {
    return {
      title: raw.title || "",
      kicker: raw.kicker || "",
      subtitle: raw.subtitle || "",
      coverUrl: raw.coverUrl || "",
      isProfile: !!raw.isProfile,
      tint: raw.tint,
      dateChips: raw.dateChips || [],
      lieu: raw.lieu || "",
      competences: raw.competences || [],
      tabs: buildFicheTabs(raw),
    };
  }

  function getMoiProfile() {
    if (!state.data) return [];
    const moi = (state.data.moi && state.data.moi[0]) || null;
    if (!moi) return [];
    const cover = attachmentUrls(moi["Cover"])[0] || attachmentUrls(moi["Photo"])[0] || "";
    const photo = attachmentUrls(moi["Photo"])[0] || "";
    const subtitle = [moi["Age"] ? `${moi["Age"]} ans` : "", moi["Lieu"] || ""].filter(Boolean).join(" · ");
    const competences = [
      moi["Français"] ? `Français — ${moi["Français"]}` : "",
      moi["Anglais"] ? `Anglais — ${moi["Anglais"]}` : "",
      moi["Allemand"] ? `Allemand — ${moi["Allemand"]}` : "",
    ].filter(Boolean);
    return [{ title: moi["Nom"] || "Adrien Benichou", subtitle, cover, photo, description: moi["Description"] || "", competences }];
  }

  function getSoftwaresSorted() {
    if (!state.data) return [];
    return [...(state.data.softwares || [])].sort((a, b) => (a["Rang"] || 0) - (b["Rang"] || 0));
  }
  function softwareLogo(sw) {
    return attachmentUrls(sw["Logo"])[0] || "";
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

  // Formatte la date ISO ("2023-06-01") en repère lisible ("juin 2023") ; les tables sans
  // date exacte (académique) n'ont que "Date text" et laissent ce chip de côté.
  function formatProjectDate(p) {
    const raw = p["Date"];
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(state.lang === "en" ? "en-US" : "fr-FR", { month: "short", year: "numeric" });
  }

  function buildProjectFiche(p, tint) {
    const kicker = projectByline(p);
    const links = [];
    if (p["Lien"]) links.push({ url: p["Lien"], emoji: "🔗" });
    return finalizeFiche({
      title: projectTitle(p),
      kicker,
      subtitle: kicker,
      coverUrl: projectCover(p),
      isProfile: false,
      tint,
      dateChips: [projectDateText(p), formatProjectDate(p)].filter(Boolean),
      lieu: p["Lieu"] || "",
      competences: p["Compétences"] || [],
      apercu: p["Aperçu"] || "",
      missions: splitBulletField(p["Missions"]),
      description: p["Description"] || "",
      entrepriseDescription: p["Description de l'entreprise"] || "",
      links,
      documentPdfs: attachmentList(p["Document"]).concat(attachmentList(p["PDF"])).concat(attachmentList(p["Fichiers"])),
      documentPhotos: attachmentUrls(p["Photo"]),
    });
  }

  // Items de fiche normalisés pour une section — même source pour la pile du hero et pour
  // les listes/grilles de chaque page (data-hero-index y référence cet ordre).
  function getFicheItemsFor(sectionId) {
    const section = NAV_SECTIONS.find((s) => s.id === sectionId);
    const tint = section ? section.tint : "#1B4FDB";
    if (sectionId === "apropos") {
      return getMoiProfile().map((m) =>
        finalizeFiche({
          title: m.title,
          subtitle: m.subtitle,
          coverUrl: m.cover,
          isProfile: true,
          tint,
          dateChips: m.subtitle ? [m.subtitle] : [],
          competences: m.competences,
          description: m.description,
        })
      );
    }
    if (sectionId === "projets") return getAllProjects().map((p) => buildProjectFiche(p, tint));
    if (sectionId === "softwares") {
      return getSoftwaresSorted().map((sw) =>
        finalizeFiche({
          title: sw["Logiciel"] || "",
          kicker: sw["Type"] || "",
          subtitle: sw["Type"] || "",
          coverUrl: softwareLogo(sw),
          tint,
          description: sw["Exemples"] || "",
          links: sw["Lien"] ? [{ url: sw["Lien"], emoji: "🔗" }] : [],
          documentPdfs: attachmentList(sw["PDF"]),
        })
      );
    }
    if (sectionId === "diplomes") {
      return getDiplomesSorted().map((d) =>
        finalizeFiche({
          title: d["Nom"] || "",
          kicker: d["Etablissement"] || "",
          subtitle: d["Etablissement"] || "",
          coverUrl: attachmentUrls(d["Cover de file"])[0] || "",
          tint,
          dateChips: [d["Date (texte)"]].filter(Boolean),
          competences: d["Etiquettes"] || [],
          description: d["Description"] || "",
          links: d["Site web"] ? [{ url: d["Site web"], emoji: "🔗" }] : [],
          documentPdfs: attachmentList(d["PDF"]).concat(attachmentList(d["Fichiers"])),
        })
      );
    }
    if (sectionId === "benevolat") {
      return getBenevolatList().map((b) =>
        finalizeFiche({
          title: b["Mission"] || "",
          kicker: b["Etiquette"] || "",
          subtitle: b["Etiquette"] || "",
          coverUrl: attachmentUrls(b["Cover"])[0] || "",
          tint,
          dateChips: [b["Date (texte)"] || b["Date"]].filter(Boolean),
          lieu: b["Lieu"] || "",
          description: b["Description"] || "",
          links: [
            b["Site web"] ? { url: b["Site web"], emoji: "🔗" } : null,
            b["Vidéo"] ? { url: b["Vidéo"], emoji: "🎥", label: "Vidéo" } : null,
          ].filter(Boolean),
        })
      );
    }
    return [];
  }

  // Modal "fiche" partagée par toutes les pages — injectée une fois dans le <body>, ouverte
  // avec une transition FLIP (shared element) depuis la carte cliquée, comme dans le design.
  function initFicheModal() {
    if (document.getElementById("fiche-modal")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "fiche-backdrop";
    backdrop.className = "fiche-backdrop";
    backdrop.hidden = true;
    backdrop.addEventListener("click", closeFiche);

    const modal = document.createElement("div");
    modal.id = "fiche-modal";
    modal.className = "fiche-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <button type="button" class="fiche-close-btn" aria-label="Fermer">✕</button>
      <div class="fiche-cover"></div>
      <div class="fiche-body">
        <div class="fiche-header-row">
          <div class="fiche-photo"></div>
          <div class="fiche-header-text">
            <p class="fiche-kicker"></p>
            <p class="fiche-title"></p>
          </div>
        </div>
        <div class="fiche-date-row"></div>
        <div class="fiche-meta-row"></div>
        <div class="fiche-competences-row"></div>
        <div class="fiche-divider"></div>
        <div class="fiche-tab-bar"></div>
        <div class="fiche-panel-box"></div>
      </div>`;
    modal.querySelector(".fiche-close-btn").addEventListener("click", closeFiche);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeFiche();
    });
  }

  function renderFicheContent(item) {
    const modal = document.getElementById("fiche-modal");
    if (!modal) return;
    modal._item = item;
    modal._activeTab = 0;

    const cover = modal.querySelector(".fiche-cover");
    cover.style.background = item.coverUrl ? `#1a1c22 url("${item.coverUrl}") center/cover no-repeat` : `linear-gradient(160deg, ${item.tint || "#1B4FDB"}, #0d0e12)`;

    modal.querySelector(".fiche-header-row").classList.toggle("is-profile", !!item.isProfile);
    const photo = modal.querySelector(".fiche-photo");
    photo.style.display = item.isProfile ? "block" : "none";
    photo.style.backgroundImage = item.isProfile && item.coverUrl ? `url("${item.coverUrl}")` : "none";

    const kickerEl = modal.querySelector(".fiche-kicker");
    kickerEl.textContent = item.kicker || "";
    kickerEl.style.display = item.kicker ? "" : "none";

    modal.querySelector(".fiche-title").textContent = item.title || "";

    const dateRow = modal.querySelector(".fiche-date-row");
    dateRow.innerHTML = (item.dateChips || []).map((d) => `<span class="fiche-date-chip">${d}</span>`).join("");
    dateRow.style.display = (item.dateChips || []).length ? "flex" : "none";

    const metaRow = modal.querySelector(".fiche-meta-row");
    metaRow.innerHTML = item.lieu ? `<span class="fiche-meta-item">📍 ${item.lieu}</span>` : "";
    metaRow.style.display = item.lieu ? "flex" : "none";

    const compRow = modal.querySelector(".fiche-competences-row");
    compRow.innerHTML = (item.competences || [])
      .map((c) => {
        const color = colorForCompetence(c);
        return `<span class="fiche-chip" style="background:${color}1c; border:1px solid ${color}40; color:${color};">${emojiForCompetence(c)} ${c}</span>`;
      })
      .join("");
    compRow.style.display = (item.competences || []).length ? "flex" : "none";

    renderFicheTabBar(modal);
    renderFichePanel(modal);
  }

  function renderFicheTabBar(modal) {
    const tabs = modal._item.tabs;
    const tabBar = modal.querySelector(".fiche-tab-bar");
    if (!tabs.length) {
      tabBar.style.display = "none";
      tabBar.innerHTML = "";
      return;
    }
    tabBar.style.display = "flex";
    tabBar.innerHTML = tabs
      .map((t, i) => {
        const active = i === modal._activeTab;
        return `<button type="button" class="fiche-tab${active ? " is-active" : ""}" data-tab-index="${i}">
          <span class="fiche-tab-dot" style="background:${t.dotColor}; opacity:${active ? 1 : 0.5};"></span>
          <span>${t.label}</span>
        </button>`;
      })
      .join("");
    tabBar.querySelectorAll(".fiche-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        modal._activeTab = parseInt(btn.getAttribute("data-tab-index"), 10);
        renderFicheTabBar(modal);
        renderFichePanel(modal);
      });
    });
  }

  function renderFichePanel(modal) {
    const tabs = modal._item.tabs;
    const panelBox = modal.querySelector(".fiche-panel-box");
    const tab = tabs[modal._activeTab];
    if (!tab) {
      panelBox.innerHTML = "";
      return;
    }
    if (tab.kind === "documents") {
      const photosHtml = tab.photos.length
        ? `<div class="fiche-doc-grid">${tab.photos.map((url) => `<div class="fiche-doc-photo" style="background-image:url('${url}')"></div>`).join("")}</div>`
        : "";
      const pdfsHtml = tab.pdfs
        .map((pdf) => `<a href="${pdf.url}" target="_blank" rel="noopener" class="fiche-doc-pdf-row"><span class="fiche-doc-pdf-icon">📄</span><span class="fiche-doc-pdf-label">${pdf.label}</span></a>`)
        .join("");
      panelBox.innerHTML = photosHtml + pdfsHtml;
      return;
    }
    panelBox.innerHTML = tab.blocks
      .map((b) => {
        const html = inlineHtml(b.segments);
        if (b.isMission) return `<div class="fiche-mission-row"><span class="fiche-mission-dot"></span><p class="fiche-text-block">${html}</p></div>`;
        return `<p class="fiche-text-block">${html}</p>`;
      })
      .join("");
  }

  function openFiche(item, originEl) {
    if (!item) return;
    const modal = document.getElementById("fiche-modal");
    const backdrop = document.getElementById("fiche-backdrop");
    if (!modal || !backdrop) return;

    renderFicheContent(item);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = originEl ? originEl.getBoundingClientRect() : null;
    const fromTransform = rect
      ? `translate(${rect.left}px, ${rect.top}px) scale(${(rect.width / vw).toFixed(4)}, ${(rect.height / vh).toFixed(4)})`
      : `translate(${vw / 2 - 60}px, ${vh / 2 - 40}px) scale(0.02, 0.02)`;

    modal._fromTransform = fromTransform;
    modal.scrollTop = 0;
    document.body.style.overflow = "hidden";
    modal.hidden = false;
    backdrop.hidden = false;
    modal.style.transition = "none";
    backdrop.style.transition = "none";
    modal.style.transform = fromTransform;
    modal.style.borderRadius = "18px";
    backdrop.style.opacity = "0";
    // force reflow avant de relâcher la transition, sinon le navigateur regroupe les deux états
    // eslint-disable-next-line no-unused-expressions
    modal.offsetHeight;

    requestAnimationFrame(() => {
      modal.style.transition = "";
      backdrop.style.transition = "";
      modal.style.transform = "translate(0px, 0px) scale(1, 1)";
      modal.style.borderRadius = "0px";
      backdrop.style.opacity = "0.72";
    });
  }

  function closeFiche() {
    const modal = document.getElementById("fiche-modal");
    const backdrop = document.getElementById("fiche-backdrop");
    if (!modal || modal.hidden) return;

    modal.style.transform = modal._fromTransform || "translate(0px, 0px) scale(1, 1)";
    modal.style.borderRadius = "18px";
    backdrop.style.opacity = "0";

    clearTimeout(modal._closeTimer);
    modal._closeTimer = setTimeout(() => {
      modal.hidden = true;
      backdrop.hidden = true;
      document.body.style.overflow = "";
    }, 620);
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
        openAllProjects();
      });
    }

    setHeroSection(0);
    startHeroAutoDrift();
  }

  function setHeroSection(index) {
    heroState.sectionIndex = index;
    heroState.pos = 0;
    heroState.items = getFicheItemsFor(NAV_SECTIONS[index].id);
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
    card._item = item;
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
    if (card._item) openFiche(card._item, card);
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
        (exp, i) => `
        <li class="timeline-item" data-hero-index="${i}">
          <p class="timeline-date">${projectDateText(exp)}</p>
          <p class="timeline-title">${projectTitle(exp)}</p>
          <p class="timeline-desc">${projectByline(exp)}</p>
        </li>`
      )
      .join("");
    timelineEl.querySelectorAll(".timeline-item").forEach((el) => {
      el.addEventListener("click", () => openProjectFiche(experiences[parseInt(el.getAttribute("data-hero-index"), 10)], el));
    });

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
      node.addEventListener("click", () => openProjectFiche(projects[i], node));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProjectFiche(projects[i], node);
        }
      });
    });

    if (projects.length) showOrbitPreview(0);
  }

  // Écran "Tous mes projets" — overlay plein écran global (injecté une fois, comme la fiche),
  // ouvert depuis le CTA du hero mobile. Filtres multi-sélection par Type / Compétence /
  // Organisation à partir des champs Airtable réels déjà utilisés par l'orbite.
  const allProjectsState = { filterType: [], filterComp: [], filterOrg: [], openGroup: null };

  function initAllProjectsOverlay() {
    if (document.getElementById("all-projects-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "all-projects-overlay";
    overlay.className = "all-projects-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="all-projects-header">
        <button type="button" class="all-projects-back" aria-label="Fermer">←</button>
        <p class="all-projects-title">Tous mes projets</p>
      </div>
      <div class="all-projects-filterbar" id="all-projects-filterbar"></div>
      <div class="all-projects-grid" id="all-projects-grid"></div>`;
    document.body.appendChild(overlay);

    overlay.querySelector(".all-projects-back").addEventListener("click", closeAllProjects);

    const filterBar = overlay.querySelector("#all-projects-filterbar");
    filterBar.addEventListener("click", (e) => {
      const groupBtn = e.target.closest(".all-projects-filter-btn");
      const chip = e.target.closest(".all-projects-filter-chip");
      const reset = e.target.closest(".all-projects-reset");
      if (groupBtn) {
        const key = groupBtn.getAttribute("data-group");
        allProjectsState.openGroup = allProjectsState.openGroup === key ? null : key;
        renderAllProjectsGrid();
      } else if (chip) {
        const key = chip.getAttribute("data-group");
        const value = chip.getAttribute("data-value");
        const list = allProjectsState[key];
        const idx = list.indexOf(value);
        if (idx === -1) list.push(value);
        else list.splice(idx, 1);
        renderAllProjectsGrid();
      } else if (reset) {
        allProjectsState.filterType = [];
        allProjectsState.filterComp = [];
        allProjectsState.filterOrg = [];
        allProjectsState.openGroup = null;
        renderAllProjectsGrid();
      }
    });

    overlay.querySelector("#all-projects-grid").addEventListener("click", (e) => {
      const card = e.target.closest(".all-projects-card");
      if (!card) return;
      const project = getAllProjects()[parseInt(card.getAttribute("data-index"), 10)];
      if (project) openProjectFiche(project, card);
    });

    document.addEventListener("click", (e) => {
      if (!allProjectsState.openGroup) return;
      if (!e.target.closest(".all-projects-filter-group")) {
        allProjectsState.openGroup = null;
        renderAllProjectsGrid();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllProjects();
    });
  }

  function openAllProjects() {
    const overlay = document.getElementById("all-projects-overlay");
    if (!overlay) return;
    renderAllProjectsGrid();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAllProjects() {
    const overlay = document.getElementById("all-projects-overlay");
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  function renderAllProjectsGrid() {
    const filterBar = document.getElementById("all-projects-filterbar");
    const grid = document.getElementById("all-projects-grid");
    if (!filterBar || !grid) return;

    const all = getAllProjects();
    const s = allProjectsState;
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
        <div class="all-projects-filter-group">
          <button type="button" class="all-projects-filter-btn${active.length ? " is-active" : ""}" data-group="${g.key}">
            <span>${g.title}${active.length ? ` (${active.length})` : ""}</span> <span class="all-projects-filter-chevron">▾</span>
          </button>
          ${
            isOpen
              ? `<div class="all-projects-filter-menu">${g.values
                  .map(
                    (v) => `<button type="button" class="all-projects-filter-chip${active.includes(v) ? " is-active" : ""}" data-group="${g.key}" data-value="${v}">${v}</button>`
                  )
                  .join("")}</div>`
              : ""
          }
        </div>`;
        })
        .join("") + (activeCount ? `<button type="button" class="all-projects-reset">Réinitialiser</button>` : "");

    const filtered = all
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !s.filterType.length || s.filterType.includes(projectDateText(p)))
      .filter(({ p }) => !s.filterOrg.length || s.filterOrg.includes(projectByline(p)))
      .filter(({ p }) => !s.filterComp.length || (p["Compétences"] || []).some((c) => s.filterComp.includes(c)));

    grid.innerHTML = filtered
      .map(({ p, i }) => {
        const cover = projectCover(p);
        return `
        <button type="button" class="all-projects-card" data-index="${i}">
          <div class="all-projects-card-media"${cover ? ` style="background-image:url('${cover}')"` : ""}></div>
          <p class="all-projects-card-title">${projectTitle(p)}</p>
          <p class="all-projects-card-meta">${projectDateText(p)}</p>
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

  /* ============ SOFTWARES ============ */
  function renderSoftwares() {
    const grid = document.getElementById("softwares-grid");
    if (!grid) return; // page sans section Softwares

    const items = getFicheItemsFor("softwares");
    const softwares = getSoftwaresSorted();
    const grouped = {};
    softwares.forEach((sw, i) => {
      const type = sw["Type"] || "Autres";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({ ...sw, _index: i });
    });

    grid.innerHTML = Object.entries(grouped)
      .map(
        ([type, group]) => `
        <div class="skills-group-title" style="grid-column: 1 / -1;">${type}</div>
        ${group
          .map(
            (sw) => `
          <div class="software-item" data-hero-index="${sw._index}">
            <img src="${softwareLogo(sw)}" alt="${sw["Logiciel"]}">
            <p class="software-item-name">${sw["Logiciel"]}</p>
          </div>`
          )
          .join("")}`
      )
      .join("");

    grid.querySelectorAll(".software-item").forEach((el) => {
      el.addEventListener("click", () => openFiche(items[parseInt(el.getAttribute("data-hero-index"), 10)], el));
    });
  }

  /* ============ DIPLÔMES ============ */
  function renderDiplomes() {
    const timelineEl = document.getElementById("diplomes-timeline");
    if (!timelineEl) return; // page sans section Diplômes

    const items = getFicheItemsFor("diplomes");
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

    timelineEl.querySelectorAll(".timeline-item").forEach((el) => {
      el.addEventListener("click", () => openFiche(items[parseInt(el.getAttribute("data-hero-index"), 10)], el));
    });
  }

  /* ============ BÉNÉVOLAT ============ */
  function renderBenevolat() {
    const grid = document.getElementById("benevolat-grid");
    if (!grid) return; // page sans section Bénévolat

    const items = getFicheItemsFor("benevolat");
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

    grid.querySelectorAll(".benevolat-card").forEach((el) => {
      el.addEventListener("click", () => openFiche(items[parseInt(el.getAttribute("data-hero-index"), 10)], el));
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
    initFicheModal();
    initAllProjectsOverlay();
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
