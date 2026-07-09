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

  /* ============ NAVIGATION PRINCIPALE (cylindre de la page d'accueil) ============ */
  const NAV_SECTIONS = [
    { labelKey: "nav.apropos", href: "apropos.html", tint: "#1B4FDB" },
    { labelKey: "nav.projets", href: "projets.html", tint: "#FF6B35" },
    { labelKey: "nav.softwares", href: "softwares.html", tint: "#0E7C86" },
    { labelKey: "nav.diplomes", href: "diplomes.html", tint: "#12379E" },
    { labelKey: "nav.benevolat", href: "benevolat.html", tint: "#E91E8C" },
  ];

  /* ============ TRADUCTIONS (labels d'interface uniquement) ============ */
  const I18N = {
    fr: {
      "hero.eyebrow": "Sport × Digital",
      "hero.tagline": "Je fais rimer performance sportive et stratégie digitale.",
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

      const orbitNode = e.target.closest(".orbit-node");
      const reelSlide = e.target.closest(".reel-slide");
      const interactive = e.target.closest("a, button, .software-item, .orbit-node, .reel-slide");

      if (interactive) cursor.classList.add("is-hover");
      // Le cylindre de nav (accueil) reste muet : seul le showcase projets affiche un label au survol.
      const isNav = reelSlide && reelSlide.classList.contains("reel-slide--nav");
      if (orbitNode || (reelSlide && !isNav)) {
        cursor.classList.add("is-label");
        cursor.setAttribute("data-cursor-label", "VOIR");
      }
    });

    document.addEventListener("mouseout", (e) => {
      if (hero && hero.contains(e.target) && !hero.contains(e.relatedTarget)) {
        cursor.classList.remove("is-dark");
      }
      const interactive = e.target.closest("a, button, .software-item, .orbit-node, .reel-slide");
      if (interactive && !interactive.contains(e.relatedTarget)) {
        cursor.classList.remove("is-hover");
        cursor.classList.remove("is-label");
        cursor.removeAttribute("data-cursor-label");
      }
    });
  }

  /* ============ BANDEAU-CYLINDRE ROTATIF (nav d'accueil ou showcase projets) ============ */
  const REEL_TINTS = ["#1B4FDB", "#FF6B35", "#E91E8C", "#12379E", "#0E7C86"];
  const REEL_AUTO_MS = 3400;
  const reelState = {
    mode: "projects", // "nav" (accueil, redirige vers une page) ou "projects" (showcase projets)
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

    if (reelState.mode === "nav") {
      if (label) label.textContent = I18N[state.lang][item.labelKey];
      if (thumb) thumb.src = "";
      if (thumbWrap) {
        thumbWrap.classList.add("is-tint");
        thumbWrap.style.background = item.tint;
      }
    } else {
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
    if (reelState.mode === "nav") {
      const section = NAV_SECTIONS[index];
      if (section) navigateToPage(section.href);
    } else {
      openReelProject(index);
    }
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
    reelState.mode = wrapper && wrapper.getAttribute("data-reel-mode") === "nav" ? "nav" : "projects";

    if (reelState.mode === "nav") {
      buildNavReelSlides(track);
    } else {
      buildProjectReelSlides(track);
    }

    // Mise en scène d'entrée : le cylindre apparaît (fade + léger scale) une fois ses slides prêtes.
    if (wrapper && !wrapper.classList.contains("is-ready")) {
      requestAnimationFrame(() => requestAnimationFrame(() => wrapper.classList.add("is-ready")));
    }
  }

  function buildNavReelSlides(track) {
    reelState.items = NAV_SECTIONS;
    const n = NAV_SECTIONS.length;
    const doubled = [...NAV_SECTIONS, ...NAV_SECTIONS];
    track.innerHTML = doubled
      .map((section, i) => {
        const idx = i % n;
        return `
        <div class="reel-slide reel-slide--nav" data-index="${idx}" style="--slide-tint:${section.tint}">
          <p class="reel-slide-title reel-slide-title--nav" data-i18n="${section.labelKey}">${I18N[state.lang][section.labelKey]}</p>
        </div>`;
      })
      .join("");

    reelState.position = 0;
    measureReelStep();
    updateReelLabelFromPosition();
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

  function fillModalContent(project, index) {
    const els = getModalEls();
    els.img.src = projectCover(project);
    els.img.alt = projectTitle(project);
    els.title.textContent = projectTitle(project);
    els.entreprise.textContent = projectByline(project);
    els.dates.textContent = projectDateText(project);
    els.description.textContent = project["Description"] || "";

    const skills = project["Compétences"];
    els.skills.innerHTML = Array.isArray(skills) ? skills.map((s) => `<li>${s}</li>`).join("") : "";

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

    const softwares = [...(state.data.softwares || [])].sort((a, b) => (a["Rang"] || 0) - (b["Rang"] || 0));
    const grouped = {};
    softwares.forEach((sw) => {
      const type = sw["Type"] || "Autres";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(sw);
    });

    grid.innerHTML = Object.entries(grouped)
      .map(
        ([type, items]) => `
        <div class="skills-group-title" style="grid-column: 1 / -1;">${type}</div>
        ${items
          .map(
            (sw) => `
          <div class="software-item">
            <img src="${sw["Logo"] && sw["Logo"][0] ? sw["Logo"][0].url : ""}" alt="${sw["Logiciel"]}">
            <p class="software-item-name">${sw["Logiciel"]}</p>
          </div>`
          )
          .join("")}`
      )
      .join("");
  }

  /* ============ DIPLÔMES ============ */
  function renderDiplomes() {
    const timelineEl = document.getElementById("diplomes-timeline");
    if (!timelineEl) return; // page sans section Diplômes

    const diplomes = [...(state.data.diplomes || [])].sort((a, b) => {
      const dateA = new Date(a["Date"] || a["Date pas texte"] || 0);
      const dateB = new Date(b["Date"] || b["Date pas texte"] || 0);
      return dateA - dateB;
    });

    timelineEl.innerHTML = diplomes
      .map(
        (d) => `
        <li class="timeline-item">
          <p class="timeline-date">${d["Date (texte)"] || ""}</p>
          <p class="timeline-title">${d["Nom"] || ""}</p>
          <p class="timeline-desc">${d["Etablissement"] || ""} — ${d["Description"] || ""}</p>
        </li>`
      )
      .join("");
  }

  /* ============ BÉNÉVOLAT ============ */
  function renderBenevolat() {
    const grid = document.getElementById("benevolat-grid");
    if (!grid) return; // page sans section Bénévolat

    const benevolat = state.data.benevolat || [];
    grid.innerHTML = benevolat
      .map(
        (b) => `
        <div class="benevolat-card">
          <span class="benevolat-card-tag">${b["Etiquette"] || ""}</span>
          <p class="benevolat-card-mission">${b["Mission"] || ""}</p>
          <p class="benevolat-card-meta">${b["Lieu"] || ""} · ${b["Date (texte)"] || b["Date"] || ""}</p>
          <p class="benevolat-card-desc">${b["Description"] || ""}</p>
        </div>`
      )
      .join("");
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

  /* ============ EFFET DE VAGUE LIQUIDE AU SURVOL DU NOM EN FOND DE HERO ============ */
  // Le nom est déformé via un filtre SVG (turbulence + displacement map, voir index.html) :
  // chaque mouvement de souris ajoute de l'énergie à la vague (proportionnelle à la vitesse
  // du curseur), qui se dissipe ensuite en continu ; plus on bouge, plus ça vague fort.
  const WAVE_MAX_SCALE = 34; // amplitude max de la déformation (unités du displacement map)
  const WAVE_DECAY_MS = 650; // constante de dissipation de l'énergie
  const WAVE_BUMP_PER_PXMS = 0.9; // énergie ajoutée par unité de vitesse du curseur (px/ms)
  const WAVE_FLOW_SPEED = 0.05; // vitesse de "l'écoulement" du bruit sous le texte
  const WAVE_EPSILON = 0.004;

  function initHeroNameWave() {
    const nameEl = document.getElementById("hero-bg-name");
    const displacementMap = document.getElementById("hero-name-wave-map");
    const noiseFlow = document.querySelector("#hero-name-wave feOffset");
    if (!nameEl || !displacementMap || !noiseFlow) return;
    if (state.reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let energy = 0;
    let phase = 0;
    let lastMoveX = null;
    let lastMoveY = null;
    let lastMoveTs = 0;
    let waveRAF = null;
    let prevTickTs = null;

    function tick(ts) {
      const dt = Math.min(ts - (prevTickTs || ts), 48);
      prevTickTs = ts;

      energy *= Math.exp(-dt / WAVE_DECAY_MS);
      phase += dt * WAVE_FLOW_SPEED * (0.3 + 0.7 * energy);

      if (energy < WAVE_EPSILON) {
        displacementMap.setAttribute("scale", "0");
        waveRAF = null;
        prevTickTs = null;
        return;
      }

      displacementMap.setAttribute("scale", (energy * WAVE_MAX_SCALE).toFixed(2));
      noiseFlow.setAttribute("dx", phase.toFixed(2));
      noiseFlow.setAttribute("dy", (phase * 0.6).toFixed(2));
      waveRAF = requestAnimationFrame(tick);
    }

    nameEl.addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (lastMoveX != null) {
        const dt = Math.max(now - lastMoveTs, 1);
        const speed = Math.hypot(e.clientX - lastMoveX, e.clientY - lastMoveY) / dt;
        energy = Math.min(1, energy + speed * WAVE_BUMP_PER_PXMS);
      }
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
      lastMoveTs = now;
      if (!waveRAF) waveRAF = requestAnimationFrame(tick);
    });

    nameEl.addEventListener("mouseleave", () => {
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
    initHeroNameWave();

    if (document.body.dataset.page === "home") {
      buildReelSlides();
    } else {
      loadData().then(renderContact);
    }
  });
})();
