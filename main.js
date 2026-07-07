/* ============================================
   main.js — Portfolio Adrien Benichou
   Cercle rotatif hero, orbite projets + modal éditorial plein écran,
   transitions, data Airtable (data.json), i18n, filtre
   ============================================ */

(function () {
  "use strict";

  /* ============ ÉTAT GLOBAL ============ */
  const SECTIONS = ["apropos", "projets", "softwares", "diplomes", "benevolat"];
  const state = {
    lang: "fr",
    currentAngle: 0,
    activeIndex: 0,
    data: null,
    activeFilter: "all",
    isDragging: false,
    dragStartX: 0,
    dragStartAngle: 0,
    lastInteraction: 0,
    dialPaused: false,
    reducedMotion: false,
    idleRAF: null,
    resizeRAF: null,
  };

  const ANGLE_STEP = 360 / SECTIONS.length;

  /* ============ TRADUCTIONS (labels d'interface uniquement) ============ */
  const I18N = {
    fr: {
      "hero.eyebrow": "Sport × Digital",
      "hero.tagline": "Je fais rimer performance sportive et stratégie digitale.",
      "hero.dialHint": "Fais tourner le cercle (glisser, molette, ou flèches ← →) et valide avec Entrée",
      "nav.apropos": "À propos de moi",
      "nav.projets": "Mes projets",
      "nav.softwares": "Softwares",
      "nav.diplomes": "Diplômes",
      "nav.benevolat": "Bénévolat",
      "nav.back": "Retour",
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
      "hero.dialHint": "Spin the dial (drag, scroll, or ← → keys) and press Enter to confirm",
      "nav.apropos": "About me",
      "nav.projets": "My projects",
      "nav.softwares": "Softwares",
      "nav.diplomes": "Degrees",
      "nav.benevolat": "Volunteering",
      "nav.back": "Back",
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
        updateDialCenterLabel(state.activeIndex);
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

    // Délégation : fonctionne aussi pour les nœuds d'orbite/dial injectés dynamiquement
    document.addEventListener("mouseover", (e) => {
      if (hero.contains(e.target)) cursor.classList.add("is-dark");

      const dialOpt = e.target.closest(".dial-option");
      const orbitNode = e.target.closest(".orbit-node");
      const interactive = e.target.closest("a, button, .software-item, .orbit-node, .dial-option");

      if (interactive) cursor.classList.add("is-hover");
      if (dialOpt) {
        cursor.classList.add("is-label");
        cursor.setAttribute("data-cursor-label", "OUVRIR");
      } else if (orbitNode) {
        cursor.classList.add("is-label");
        cursor.setAttribute("data-cursor-label", "VOIR");
      }
    });

    document.addEventListener("mouseout", (e) => {
      if (hero.contains(e.target) && !hero.contains(e.relatedTarget)) {
        cursor.classList.remove("is-dark");
      }
      const interactive = e.target.closest("a, button, .software-item, .orbit-node, .dial-option");
      if (interactive && !interactive.contains(e.relatedTarget)) {
        cursor.classList.remove("is-hover");
        cursor.classList.remove("is-label");
        cursor.removeAttribute("data-cursor-label");
      }
    });
  }

  /* ============ CERCLE ROTATIF HERO ============ */
  // Miroir exact de la formule CSS de .hero (--dial-outer / --dial-size / --dial-label-gap)
  // pour que le rayon utilisé par le JS corresponde toujours au rendu réel.
  function getDialRadius() {
    const outer = Math.max(220, Math.min(1000, window.innerHeight - 408, window.innerWidth * 0.66));
    const ringSize = outer * 0.76;
    const gap = outer * 0.062;
    return ringSize / 2 + gap;
  }

  function setDialAngle(angle) {
    state.currentAngle = angle;
    const radius = getDialRadius();
    document.querySelectorAll(".dial-option").forEach((opt) => {
      const baseAngle = parseFloat(opt.getAttribute("data-angle"));
      const finalAngle = baseAngle - angle;
      opt.style.setProperty("--angle", `${finalAngle}deg`);
      opt.style.setProperty("--dial-radius", `${radius}px`);
    });
    updateActiveOption();
  }

  function updateActiveOption() {
    // L'option "active" = celle dont l'angle final est le plus proche de 0 (12h)
    let closestIndex = 0;
    let closestDelta = Infinity;

    document.querySelectorAll(".dial-option").forEach((opt, i) => {
      const baseAngle = parseFloat(opt.getAttribute("data-angle"));
      let finalAngle = (baseAngle - state.currentAngle) % 360;
      if (finalAngle > 180) finalAngle -= 360;
      if (finalAngle < -180) finalAngle += 360;
      const delta = Math.abs(finalAngle);
      if (delta < closestDelta) {
        closestDelta = delta;
        closestIndex = i;
      }
      opt.setAttribute("aria-selected", "false");
    });

    state.activeIndex = closestIndex;
    const options = document.querySelectorAll(".dial-option");
    options[closestIndex].setAttribute("aria-selected", "true");
    document
      .getElementById("dial-nav")
      .setAttribute("aria-activedescendant", options[closestIndex].id);

    if (!state.isDragging) updateDialCenterLabel(closestIndex);
  }

  function updateDialCenterLabel(index) {
    const options = document.querySelectorAll(".dial-option");
    const opt = options[index];
    const labelEl = document.getElementById("dial-center-label");
    if (!opt || !labelEl) return;
    const text = opt.querySelector("span").textContent;
    const total = String(SECTIONS.length).padStart(2, "0");
    const current = String(index + 1).padStart(2, "0");
    // Sur cercle très compact (mobile), l'index alourdit un texte déjà court à afficher
    labelEl.textContent = window.innerWidth <= 480 ? text : `${text} — ${current}/${total}`;
    labelEl.classList.add("is-visible");
  }

  function rotateToIndex(index) {
    const targetAngle = -index * ANGLE_STEP;
    setDialAngle(targetAngle);
  }

  function markInteraction() {
    state.lastInteraction = performance.now();
  }

  function initDial() {
    const nav = document.getElementById("dial-nav");

    setDialAngle(0);

    // Drag souris
    nav.addEventListener("pointerdown", (e) => {
      state.isDragging = true;
      state.dragStartX = e.clientX;
      state.dragStartAngle = state.currentAngle;
      markInteraction();
      nav.setPointerCapture(e.pointerId);
    });

    nav.addEventListener("pointermove", (e) => {
      if (!state.isDragging) return;
      const deltaX = e.clientX - state.dragStartX;
      const newAngle = state.dragStartAngle + deltaX * 0.4;
      setDialAngle(newAngle);
    });

    nav.addEventListener("pointerup", () => {
      state.isDragging = false;
      markInteraction();
      rotateToIndex(state.activeIndex);
    });

    // Molette
    nav.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        markInteraction();
        const direction = e.deltaY > 0 ? 1 : -1;
        rotateToIndex((state.activeIndex + direction + SECTIONS.length) % SECTIONS.length);
      },
      { passive: false }
    );

    // Clavier
    nav.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        markInteraction();
        rotateToIndex((state.activeIndex + 1) % SECTIONS.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        markInteraction();
        rotateToIndex((state.activeIndex - 1 + SECTIONS.length) % SECTIONS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmSelection();
      }
    });

    // Pause de la rotation idle au survol / focus du cercle
    nav.addEventListener("mouseenter", () => {
      state.dialPaused = true;
    });
    nav.addEventListener("mouseleave", () => {
      state.dialPaused = false;
      markInteraction();
    });
    nav.addEventListener("focusin", () => {
      state.dialPaused = true;
    });
    nav.addEventListener("focusout", () => {
      state.dialPaused = false;
      markInteraction();
    });

    // Clic sur une option = confirmation directe si déjà active, sinon la centre
    document.querySelectorAll(".dial-option").forEach((opt, i) => {
      opt.addEventListener("click", () => {
        if (state.activeIndex === i) {
          confirmSelection();
        } else {
          rotateToIndex(i);
        }
      });
      opt.addEventListener("mouseenter", () => updateDialCenterLabel(i));
      opt.addEventListener("mouseleave", () => updateDialCenterLabel(state.activeIndex));
      opt.addEventListener("focus", () => updateDialCenterLabel(i));
      opt.addEventListener("blur", () => updateDialCenterLabel(state.activeIndex));
    });

    document.getElementById("dial-back-btn").addEventListener("click", collapseDialBack);

    updateDialCenterLabel(0);
  }

  function confirmSelection() {
    const sectionId = SECTIONS[state.activeIndex];
    triggerSectionTransition(sectionId);
  }

  /* Rotation idle : très lente, en pause pendant le drag/hover/focus */
  const IDLE_DELAY_MS = 2600;
  const IDLE_TURN_MS = 38000;
  function startIdleRotation() {
    if (state.reducedMotion) return;
    let prevTs = null;
    function tick(ts) {
      state.idleRAF = requestAnimationFrame(tick);
      if (prevTs == null) prevTs = ts;
      const dt = ts - prevTs;
      prevTs = ts;
      if (state.isDragging || state.dialPaused) return;
      if (ts - state.lastInteraction < IDLE_DELAY_MS) return;
      setDialAngle(state.currentAngle + (360 / IDLE_TURN_MS) * dt);
    }
    state.idleRAF = requestAnimationFrame(tick);
  }

  /* Parallaxe discrète du cercle selon la position de la souris */
  function initDialParallax() {
    if (state.reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const nav = document.getElementById("dial-nav");
    const track = document.getElementById("dial-track");
    nav.addEventListener("mousemove", (e) => {
      const rect = nav.getBoundingClientRect();
      const dx = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 6;
      const dy = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 6;
      track.style.setProperty("--parallax-x", `${dx}px`);
      track.style.setProperty("--parallax-y", `${dy}px`);
    });
    nav.addEventListener("mouseleave", () => {
      track.style.setProperty("--parallax-x", "0px");
      track.style.setProperty("--parallax-y", "0px");
    });
  }

  /* ============ TRANSITION PLEIN ÉCRAN ============ */
  function triggerSectionTransition(sectionId) {
    const overlay = document.createElement("div");
    overlay.className = "section-overlay is-active section-overlay--hero";
    document.body.appendChild(overlay);

    setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
      collapseDial();
    }, 200);

    overlay.addEventListener("animationend", () => overlay.remove());
  }

  function collapseDial() {
    document.getElementById("dial-wrapper").classList.add("is-collapsed");
    document.getElementById("dial-back-btn").hidden = false;
  }

  function collapseDialBack() {
    document.getElementById("dial-wrapper").classList.remove("is-collapsed");
    document.getElementById("dial-back-btn").hidden = true;
    document.getElementById("hero").scrollIntoView({ behavior: "smooth" });
  }

  // Repli auto au scroll manuel (hors clic cercle)
  function initScrollCollapse() {
    const hero = document.getElementById("hero");
    const observer = new IntersectionObserver(
      ([entry]) => {
        const wrapper = document.getElementById("dial-wrapper");
        const backBtn = document.getElementById("dial-back-btn");
        if (entry.isIntersecting) {
          wrapper.classList.remove("is-collapsed");
          backBtn.hidden = true;
        } else {
          wrapper.classList.add("is-collapsed");
          backBtn.hidden = false;
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(hero);
  }

  /* ============ CHARGEMENT DES DONNÉES ============ */
  async function loadData() {
    try {
      const res = await fetch("/data.json");
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
    const moi = (state.data.moi && state.data.moi[0]) || {};

    setText("apropos-description", moi["Description"]);
    setText("apropos-lieu", moi["Lieu"]);
    setText("lang-fr", moi["Français"]);
    setText("lang-en", moi["Anglais"]);
    setText("lang-de", moi["Allemand"]);

    const mailEl = document.getElementById("apropos-mail");
    const email = moi["Email"] || moi["Mail"];
    if (email) {
      mailEl.textContent = email;
      mailEl.href = `mailto:${email}`;
    }

    if (moi["Photo"] && moi["Photo"][0]) {
      document.getElementById("hero-photo-img").src = moi["Photo"][0].url;
      document.getElementById("dial-center-img").src = moi["Photo"][0].url;
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
    const clients = ["AS Monaco", "CNOSF", "Paris 2024", "Centre Français"];
    document.getElementById("projets-clients").innerHTML = clients
      .map((c) => `<li>${c}</li>`)
      .join("");

    renderOrbit();

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
    const softwares = [...(state.data.softwares || [])].sort((a, b) => (a["Rang"] || 0) - (b["Rang"] || 0));
    const grouped = {};
    softwares.forEach((sw) => {
      const type = sw["Type"] || "Autres";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(sw);
    });

    const grid = document.getElementById("softwares-grid");
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
    const diplomes = [...(state.data.diplomes || [])].sort((a, b) => {
      const dateA = new Date(a["Date"] || a["Date pas texte"] || 0);
      const dateB = new Date(b["Date"] || b["Date pas texte"] || 0);
      return dateA - dateB;
    });

    document.getElementById("diplomes-timeline").innerHTML = diplomes
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
    const benevolat = state.data.benevolat || [];
    document.getElementById("benevolat-grid").innerHTML = benevolat
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
    const moi = (state.data && state.data.moi && state.data.moi[0]) || {};
    const contactMail = document.getElementById("contact-mail");
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
        setDialAngle(state.currentAngle);
        applyOrbitLayout();
      });
    });
  }

  /* ============ INIT ============ */
  document.addEventListener("DOMContentLoaded", () => {
    state.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.lastInteraction = performance.now();

    applyI18n();
    initLangSwitcher();
    initCustomCursor();
    initDial();
    initDialParallax();
    startIdleRotation();
    initScrollCollapse();
    initModal();
    initScrollReveals();
    initResizeHandling();
    loadData().then(renderContact);
  });
})();
