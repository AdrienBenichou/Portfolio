/* ============================================
   main.js — Portfolio Adrien Benichou
   Cercle rotatif, transitions, data Airtable (data.json), i18n, filtre, modal
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
      });
    });
  }

  /* ============ CURSEUR CUSTOM ============ */
  function initCustomCursor() {
    const cursor = document.getElementById("custom-cursor");
    if (!cursor || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    window.addEventListener("mousemove", (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });

    document.querySelectorAll("a, button, .projet-card, .software-item").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ============ CERCLE ROTATIF ============ */
  function setDialAngle(angle) {
    state.currentAngle = angle;
    document.getElementById("dial-track").style.setProperty("--dial-radius", "160px");
    document.querySelectorAll(".dial-option").forEach((opt) => {
      const baseAngle = parseFloat(opt.getAttribute("data-angle"));
      const finalAngle = baseAngle - angle;
      opt.style.setProperty("--angle", `${finalAngle}deg`);
      opt.style.setProperty("--dial-radius", "160px");
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
  }

  function rotateToIndex(index) {
    const targetAngle = -index * ANGLE_STEP;
    setDialAngle(targetAngle);
  }

  function initDial() {
    const nav = document.getElementById("dial-nav");
    const track = document.getElementById("dial-track");

    setDialAngle(0);

    // Drag souris
    nav.addEventListener("pointerdown", (e) => {
      state.isDragging = true;
      state.dragStartX = e.clientX;
      state.dragStartAngle = state.currentAngle;
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
      rotateToIndex(state.activeIndex);
    });

    // Molette
    nav.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        rotateToIndex((state.activeIndex + direction + SECTIONS.length) % SECTIONS.length);
      },
      { passive: false }
    );

    // Clavier
    nav.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        rotateToIndex((state.activeIndex + 1) % SECTIONS.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        rotateToIndex((state.activeIndex - 1 + SECTIONS.length) % SECTIONS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmSelection();
      }
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
    });

    document.getElementById("dial-back-btn").addEventListener("click", collapseDialBack);
  }

  function confirmSelection() {
    const sectionId = SECTIONS[state.activeIndex];
    triggerSectionTransition(sectionId);
  }

  /* ============ TRANSITION PLEIN ÉCRAN ============ */
  function triggerSectionTransition(sectionId) {
    const overlay = document.createElement("div");
    overlay.className = "section-overlay is-active";
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
    if (moi["Mail"]) {
      mailEl.textContent = moi["Mail"];
      mailEl.href = `mailto:${moi["Mail"]}`;
    }

    if (moi["Photo"] && moi["Photo"][0]) {
      document.getElementById("hero-photo-img").src = moi["Photo"][0].url;
    }

    // Timeline : fusion Diplômes (contexte pro) — ici on utilise les tables projets/bénévolat comme parcours
    const timelineEl = document.getElementById("apropos-timeline");
    const experiences = [
      ...(state.data.projetsStage || []),
      ...(state.data.projetsPro || []),
    ];
    timelineEl.innerHTML = experiences
      .map(
        (exp) => `
        <li class="timeline-item">
          <p class="timeline-date">${exp["Date"] || ""}</p>
          <p class="timeline-title">${exp["Titre du post"] || exp["Nom du projet"] || ""}</p>
          <p class="timeline-desc">${exp["Entreprise"] || ""}</p>
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

  /* ============ PROJETS ============ */
  function getAllProjects() {
    const pro = (state.data.projetsPro || []).map((p) => ({ ...p, _cat: "pro" }));
    const stage = (state.data.projetsStage || []).map((p) => ({ ...p, _cat: "stage" }));
    const etudiant = (state.data.projetsEtudiant || []).map((p) => ({ ...p, _cat: "etudiant" }));
    return [...pro, ...stage, ...etudiant];
  }

  function projectTitle(p) {
    return p["Nom du projet"] || p["Titre du post"] || p["Titre du projet"] || "Projet";
  }

  function projectCover(p) {
    const cover = p["Cover"] || p["Photo"] || p["Photos"];
    if (Array.isArray(cover) && cover[0]) return cover[0].url;
    return "";
  }

  function renderProjets() {
    const clients = ["AS Monaco", "CNOSF", "Paris 2024", "Centre Français"];
    document.getElementById("projets-clients").innerHTML = clients
      .map((c) => `<li>${c}</li>`)
      .join("");

    renderProjectsGrid();

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.activeFilter = btn.getAttribute("data-filter");
        renderProjectsGrid();
      });
    });
  }

  function renderProjectsGrid() {
    const grid = document.getElementById("projets-grid");
    let projects = getAllProjects();

    if (state.activeFilter !== "all") {
      projects = projects.filter((p) => {
        const type = (p["Type de projet"] || "").toLowerCase();
        return type.includes(state.activeFilter) || p._cat === state.activeFilter;
      });
    }

    grid.innerHTML = projects
      .map(
        (p, i) => `
        <div class="projet-card" tabindex="0" data-project-index="${i}" data-project-cat="${p._cat}">
          <span class="projet-card-tag">${p["Type de projet"] || ""}</span>
          <img src="${projectCover(p)}" alt="${projectTitle(p)}" loading="lazy">
          <div class="projet-card-overlay">
            <p class="projet-card-title">${projectTitle(p)}</p>
          </div>
        </div>`
      )
      .join("");

    grid.querySelectorAll(".projet-card").forEach((card, i) => {
      const openModal = () => openProjectModal(projects[i]);
      card.addEventListener("click", openModal);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal();
        }
      });
    });
  }

  function openProjectModal(project) {
    const modal = document.getElementById("projet-modal");
    document.getElementById("projet-modal-img").src = projectCover(project);
    document.getElementById("projet-modal-title").textContent = projectTitle(project);
    document.getElementById("projet-modal-entreprise").textContent = project["Entreprise"] || "";
    document.getElementById("projet-modal-dates").textContent = project["Date"] || "";
    document.getElementById("projet-modal-description").textContent = project["Description"] || "";

    const skills = project["Compétences"];
    document.getElementById("projet-modal-skills").innerHTML = Array.isArray(skills)
      ? skills.map((s) => `<li>${s}</li>`).join("")
      : "";

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeProjectModal() {
    document.getElementById("projet-modal").hidden = true;
    document.body.style.overflow = "";
  }

  function initModal() {
    document.querySelectorAll("[data-modal-close]").forEach((el) => {
      el.addEventListener("click", closeProjectModal);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeProjectModal();
    });
  }

  /* ============ SOFTWARES ============ */
  function renderSoftwares() {
    const softwares = state.data.softwares || [];
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
      const dateA = new Date(a["Date pas texte"] || 0);
      const dateB = new Date(b["Date pas texte"] || 0);
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
          <p class="benevolat-card-meta">${b["Lieu"] || ""} · ${b["Date"] || ""}</p>
          <p class="benevolat-card-desc">${b["Description"] || ""}</p>
        </div>`
      )
      .join("");
  }

  /* ============ CONTACT ============ */
  function renderContact() {
    const moi = (state.data && state.data.moi && state.data.moi[0]) || {};
    const contactMail = document.getElementById("contact-mail");
    if (moi["Mail"]) {
      contactMail.href = `mailto:${moi["Mail"]}`;
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

  /* ============ INIT ============ */
  document.addEventListener("DOMContentLoaded", () => {
    applyI18n();
    initLangSwitcher();
    initCustomCursor();
    initDial();
    initScrollCollapse();
    initModal();
    initScrollReveals();
    loadData().then(renderContact);
  });
})();