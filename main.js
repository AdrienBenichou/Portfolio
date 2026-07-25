/* ============================================
   main.js — Portfolio Adrien Benichou
   Écran unique fidèle au design Claude Design : hero scoreboard (nav + pile de
   preview), fiche plein écran, overlay "Tous mes X", données Airtable (data.json).
   ============================================ */

(function () {
  "use strict";

  /* ============ ÉTAT GLOBAL ============ */
  const state = {
    data: null,
    reducedMotion: false,
  };

  /* ============ NAVIGATION PRINCIPALE (hero scoreboard, écran unique) ============ */
  // Comme dans le design Claude Design : cliquer une section change juste ce qui s'affiche
  // dans le hero (pile de preview), sans jamais changer de page.
  const NAV_SECTIONS = [
    { id: "apropos", label: "À propos de moi", tint: "#1B4FDB" },
    { id: "projets", label: "Mes projets", tint: "#FF6B35" },
    { id: "softwares", label: "Softwares", tint: "#0E7C86" },
    { id: "diplomes", label: "Diplômes", tint: "#12379E" },
    { id: "benevolat", label: "Bénévolat", tint: "#E91E8C" },
  ];
  const ALL_OVERLAY_LABELS = { projets: "Tous mes projets", softwares: "Tous mes softwares", diplomes: "Tous mes diplômes", benevolat: "Tous mes bénévolats" };

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
    return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
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
          competences: [b["Etiquette"]].filter(Boolean),
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
      <div class="fiche-body">
        <div class="fiche-header-row">
          <div class="fiche-cover"></div>
          <div class="fiche-photo"></div>
          <div class="fiche-header-text">
            <p class="fiche-kicker"></p>
            <p class="fiche-title"></p>
            <div class="fiche-date-row"></div>
            <div class="fiche-meta-row"></div>
          </div>
        </div>
        <div class="fiche-competences-widget">
          <div class="fiche-competences-circle" role="button" tabindex="0" aria-label="Voir les compétences"></div>
          <div class="fiche-competences-burst"></div>
          <div class="fiche-competences-row"></div>
        </div>
        <div class="fiche-divider"></div>
        <div class="fiche-tab-bar">
          <div class="fiche-tab-bubble"></div>
        </div>
        <div class="fiche-panel-box"></div>
      </div>`;
    modal.querySelector(".fiche-close-btn").addEventListener("click", closeFiche);

    const circle = modal.querySelector(".fiche-competences-circle");
    const chipsRow = modal.querySelector(".fiche-competences-row");
    circle.addEventListener("click", () => toggleFicheCompetences(modal));
    circle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFicheCompetences(modal); }
    });
    chipsRow.addEventListener("click", () => toggleFicheCompetences(modal));

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const photoLightbox = document.createElement("div");
    photoLightbox.id = "fiche-photo-lightbox";
    photoLightbox.className = "fiche-photo-lightbox";
    photoLightbox.hidden = true;
    photoLightbox.innerHTML = `
      <button type="button" class="fiche-photo-lightbox-close" aria-label="Fermer">✕</button>
      <div class="fiche-photo-lightbox-img"></div>`;
    photoLightbox.addEventListener("click", closeFichePhotoLightbox);
    photoLightbox.querySelector(".fiche-photo-lightbox-close").addEventListener("click", closeFichePhotoLightbox);
    photoLightbox.querySelector(".fiche-photo-lightbox-img").addEventListener("click", (e) => e.stopPropagation());
    document.body.appendChild(photoLightbox);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeFichePhotoLightbox();
        closeFiche();
      }
    });
  }

  function openFichePhotoLightbox(url) {
    const lightbox = document.getElementById("fiche-photo-lightbox");
    if (!lightbox) return;
    lightbox.querySelector(".fiche-photo-lightbox-img").style.backgroundImage = `url("${url}")`;
    lightbox.hidden = false;
  }
  function closeFichePhotoLightbox() {
    const lightbox = document.getElementById("fiche-photo-lightbox");
    if (lightbox) lightbox.hidden = true;
  }

  /* ---- Widget compétences : orbes flottantes qui rebondissent, éclatent au clic ---- */
  const FICHE_ORBIT_R = 44;
  const FICHE_ORBIT_BALL_R = 12;

  function stopFicheOrbit(modal) {
    if (modal._orbitRAF) cancelAnimationFrame(modal._orbitRAF);
    modal._orbitRAF = null;
    modal._orbitBalls = null;
    modal._orbitLastTs = null;
  }

  function startFicheOrbit(modal, ballEls) {
    const maxDist = FICHE_ORBIT_R - FICHE_ORBIT_BALL_R - 2;
    const minD = FICHE_ORBIT_BALL_R * 2 * 0.9;
    modal._orbitBalls = ballEls.map(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * maxDist * 0.6;
      const speed = 4 + Math.random() * 3;
      const dir = Math.random() * Math.PI * 2;
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed };
    });

    const step = (ts) => {
      if (modal._orbitLastTs == null) modal._orbitLastTs = ts;
      const dt = Math.min(0.05, (ts - modal._orbitLastTs) / 1000);
      modal._orbitLastTs = ts;
      const balls = modal._orbitBalls;
      if (balls) {
        for (const b of balls) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          const dist = Math.hypot(b.x, b.y);
          if (dist > maxDist) {
            const nx = b.x / dist, ny = b.y / dist;
            const vn = b.vx * nx + b.vy * ny;
            b.vx -= 2 * vn * nx;
            b.vy -= 2 * vn * ny;
            b.vx *= 0.96; b.vy *= 0.96;
            b.vx += (Math.random() - 0.5) * 0.6;
            b.vy += (Math.random() - 0.5) * 0.6;
            b.x = nx * maxDist;
            b.y = ny * maxDist;
          }
        }
        for (let i = 0; i < balls.length; i++) {
          for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], c = balls[j];
            const dx = c.x - a.x, dy = c.y - a.y;
            const d = Math.hypot(dx, dy) || 0.001;
            if (d < minD) {
              const nx = dx / d, ny = dy / d;
              const overlap = (minD - d) / 2;
              a.x -= nx * overlap; a.y -= ny * overlap;
              c.x += nx * overlap; c.y += ny * overlap;
              const avn = a.vx * nx + a.vy * ny;
              const cvn = c.vx * nx + c.vy * ny;
              a.vx += (cvn - avn) * nx; a.vy += (cvn - avn) * ny;
              c.vx += (avn - cvn) * nx; c.vy += (avn - cvn) * ny;
              a.vx += (Math.random() - 0.5) * 0.4; a.vy += (Math.random() - 0.5) * 0.4;
              c.vx += (Math.random() - 0.5) * 0.4; c.vy += (Math.random() - 0.5) * 0.4;
            }
          }
        }
        balls.forEach((b, i) => {
          const el = ballEls[i];
          if (el) el.style.transform = `translate(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px)`;
        });
      }
      modal._orbitRAF = requestAnimationFrame(step);
    };
    modal._orbitRAF = requestAnimationFrame(step);
  }

  function renderFicheCompetencesWidget(modal, competences) {
    const widget = modal.querySelector(".fiche-competences-widget");
    const circle = modal.querySelector(".fiche-competences-circle");
    const chipsRow = modal.querySelector(".fiche-competences-row");
    const headerText = modal.querySelector(".fiche-header-text");

    stopFicheOrbit(modal);
    modal._competencesOpen = false;
    circle.classList.remove("is-open");
    chipsRow.classList.remove("is-open");

    const has = (competences || []).length > 0;
    widget.classList.toggle("is-visible", has);
    headerText.classList.toggle("has-competences", has);
    if (!has) {
      circle.innerHTML = "";
      chipsRow.innerHTML = "";
      return;
    }

    circle.innerHTML = competences
      .map((c) => {
        const color = colorForCompetence(c);
        return `<div class="fiche-competences-ball" style="background:${color}33; border:1px solid ${color}55;">${emojiForCompetence(c)}</div>`;
      })
      .join("");
    chipsRow.innerHTML = competences
      .map((c) => {
        const color = colorForCompetence(c);
        return `<span class="fiche-chip" style="background:${color}1c; border:1px solid ${color}40; color:${color};">${emojiForCompetence(c)} ${c}</span>`;
      })
      .join("");

    startFicheOrbit(modal, Array.from(circle.querySelectorAll(".fiche-competences-ball")));
  }

  function toggleFicheCompetences(modal) {
    const circle = modal.querySelector(".fiche-competences-circle");
    const chipsRow = modal.querySelector(".fiche-competences-row");
    const burst = modal.querySelector(".fiche-competences-burst");
    const open = !modal._competencesOpen;
    modal._competencesOpen = open;
    circle.classList.toggle("is-open", open);
    chipsRow.classList.toggle("is-open", open);

    if (open) {
      const droplets = Array.from({ length: 12 }).map((_, i) => {
        const angle = ((360 / 12) * i) * (Math.PI / 180);
        const dist = 30 + ((i * 37) % 24);
        const dx = Math.round(Math.cos(angle) * dist);
        const dy = Math.round(Math.sin(angle) * dist + 4);
        const size = 3 + ((i * 13) % 7);
        const rot = ((i * 47) % 140) - 70;
        const delay = ((i * 19) % 9) * 0.012;
        const duration = 0.55 + ((i * 7) % 5) * 0.05;
        return `<span class="fiche-competences-droplet" style="--dx:${dx}px; --dy:${dy}px; --rot:${rot}deg; --dur:${duration}s; --delay:${delay}s; width:${size}px; height:${size}px;"></span>`;
      }).join("");
      burst.innerHTML = `<span class="fiche-competences-ring"></span><span class="fiche-competences-flash"></span>${droplets}`;
    } else {
      burst.innerHTML = "";
    }
  }

  function renderFicheContent(item) {
    const modal = document.getElementById("fiche-modal");
    if (!modal) return;
    modal._item = item;
    modal._activeTab = 0;

    const cover = modal.querySelector(".fiche-cover");
    cover.style.display = item.isProfile ? "none" : "block";
    cover.style.background = item.coverUrl ? `#1a1c22 url("${item.coverUrl}") center/cover no-repeat` : `linear-gradient(160deg, ${item.tint || "#1B4FDB"}, #0d0e12)`;

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

    renderFicheCompetencesWidget(modal, item.competences || []);

    renderFicheTabBar(modal);
    renderFichePanel(modal);
  }

  function renderFicheTabBar(modal) {
    const tabs = modal._item.tabs;
    const tabBar = modal.querySelector(".fiche-tab-bar");
    if (!tabs.length) {
      tabBar.style.display = "none";
      return;
    }
    tabBar.style.display = "flex";
    tabBar.innerHTML =
      `<div class="fiche-tab-bubble"></div>` +
      tabs
        .map(
          (t, i) => `<button type="button" class="fiche-tab" data-tab-index="${i}">
          <span class="fiche-tab-dot" style="background:${t.dotColor};"></span>
          <span>${t.label}</span>
        </button>`
        )
        .join("");
    tabBar.querySelectorAll(".fiche-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        modal._activeTab = parseInt(btn.getAttribute("data-tab-index"), 10);
        updateFicheTabBar(modal);
        renderFichePanel(modal);
      });
    });
    updateFicheTabBar(modal);
  }

  // Met à jour l'onglet actif sans recréer les boutons — la bulle en verre doit rester le
  // même nœud DOM d'un onglet à l'autre pour que sa transition CSS (left/top/width) glisse
  // réellement au lieu de sauter (un élément recréé n'a pas d'état de départ à animer depuis).
  function updateFicheTabBar(modal) {
    const tabBar = modal.querySelector(".fiche-tab-bar");
    tabBar.querySelectorAll(".fiche-tab").forEach((btn, i) => {
      const active = i === modal._activeTab;
      btn.classList.toggle("is-active", active);
      btn.querySelector(".fiche-tab-dot").style.opacity = active ? "1" : "0.5";
    });
    measureFicheTabBubble(modal);
  }

  function measureFicheTabBubble(modal) {
    const tabBar = modal.querySelector(".fiche-tab-bar");
    const bubble = modal.querySelector(".fiche-tab-bubble");
    const activeBtn = tabBar.querySelector(".fiche-tab.is-active");
    if (!bubble || !activeBtn) return;
    bubble.style.left = `${activeBtn.offsetLeft}px`;
    bubble.style.top = `${activeBtn.offsetTop}px`;
    bubble.style.width = `${activeBtn.offsetWidth}px`;
    bubble.style.height = `${activeBtn.offsetHeight}px`;
    bubble.classList.add("is-visible");
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
        ? `<div class="fiche-doc-grid">${tab.photos.map((url, i) => `<div class="fiche-doc-photo" data-photo-index="${i}" style="background-image:url('${url}')"></div>`).join("")}</div>`
        : "";
      const pdfsHtml = tab.pdfs
        .map((pdf) => `<a href="${pdf.url}" target="_blank" rel="noopener" class="fiche-doc-pdf-row"><span class="fiche-doc-pdf-icon">📄</span><span class="fiche-doc-pdf-label">${pdf.label}</span></a>`)
        .join("");
      panelBox.innerHTML = photosHtml + pdfsHtml;
      panelBox.querySelectorAll(".fiche-doc-photo").forEach((el) => {
        const url = tab.photos[parseInt(el.getAttribute("data-photo-index"), 10)];
        el.addEventListener("click", () => openFichePhotoLightbox(url));
      });
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
    measureFicheTabBubble(modal); // le modal était hidden lors du 1er rendu, offsetWidth valait 0
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

    closeFichePhotoLightbox();
    stopFicheOrbit(modal);

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
    switchTimer: null,
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
        <p class="hero-nav-item-label">${section.label}</p>
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
      btn.addEventListener("click", () => {
        setHeroSection(i);
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
        openAllOverlay(NAV_SECTIONS[heroState.sectionIndex].id);
      });
    }

    setHeroSection(0);
    startHeroAutoDrift();
  }

  function setHeroSection(index) {
    heroState.sectionIndex = index;
    heroState.pos = 0;
    const sectionId = NAV_SECTIONS[index].id;
    heroState.items = getFicheItemsFor(sectionId);
    heroState.navButtons.forEach((btn, i) => btn.classList.toggle("is-active", i === index));
    measureHeroNavBubble();

    // Anime seulement ce changement de section ponctuel — la dérive continue qui suit
    // (startHeroAutoDrift) doit rester sans transition CSS pour ne pas saccader.
    const stackEl = document.getElementById("hero-stack");
    if (stackEl) {
      stackEl.classList.add("is-switching");
      clearTimeout(heroState.switchTimer);
      heroState.switchTimer = setTimeout(() => stackEl.classList.remove("is-switching"), 520);
    }
    renderHeroStack();
    measureHeroStackStep();

    // CTA "Tous mes X" : jamais affiché pour "À propos" (un seul item, pas de grille à ouvrir),
    // libellé adapté à la section active — comme mobileAllCtaVisible/mobileAllCtaLabel du design.
    const cta = document.getElementById("hero-all-cta");
    if (cta) {
      const visible = sectionId !== "apropos";
      cta.classList.toggle("is-visible", visible);
      if (visible) cta.textContent = `${ALL_OVERLAY_LABELS[sectionId]} →`;
    }
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
    let pressedCard = null;
    wrap.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      startY = e.clientY;
      startPos = heroState.pos;
      moved = false;
      pressedCard = e.target.closest(".hero-stack-card");
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
      } else if (pressedCard) {
        // setPointerCapture route le "click" natif vers `wrap` plutôt que vers la carte
        // survolée (y compris pour les cartes du fond, pas seulement celle du dessus) —
        // on ouvre donc la fiche nous-mêmes ici, plutôt que de compter sur un click
        // individuel par carte qui ne se déclenche jamais en pratique.
        activateHeroCard(pressedCard);
      }
      pressedCard = null;
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
    } catch (err) {
      console.error("Erreur de chargement de data.json :", err);
    }
  }

  /* ============ PROJETS : données brutes (pile du hero, fiche, overlay "Tous mes X") ============ */
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

  // Écran "Tous mes X" — overlay plein écran global (injecté une fois, comme la fiche), ouvert
  // depuis le CTA du hero pour la section active. Filtres multi-sélection adaptés à la section,
  // comme mobileAllFilterGroups du design : Type+Compétence+Organisation pour projets/diplômes,
  // Type seul (depuis le champ "Type") pour softwares, Type seul (depuis les compétences) pour
  // bénévolat. Toujours construit à partir des items de fiche déjà normalisés (getFicheItemsFor),
  // pas des champs Airtable bruts — une seule source de vérité par item, quelle que soit la table.
  const allOverlayState = { sectionId: null, filterType: [], filterComp: [], filterOrg: [], openGroup: null };

  // Ordre fixe des types de mission (identique au design : typeOrder), plutôt que l'ordre
  // d'apparition brut des données.
  const TYPE_ORDER = ["Projet pro", "Stage", "Job étudiant", "Étude", "Césure"];
  function sortByTypeOrder(values) {
    return [...values.filter((v) => TYPE_ORDER.includes(v)).sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)), ...values.filter((v) => !TYPE_ORDER.includes(v))];
  }

  function getOverlayFilterGroups(sectionId) {
    if (sectionId === "softwares") {
      return [{ key: "filterType", title: "Type", source: (item) => (item.kicker ? [item.kicker] : []) }];
    }
    if (sectionId === "benevolat") {
      return [{ key: "filterType", title: "Type", source: (item) => item.competences || [] }];
    }
    return [
      { key: "filterType", title: "Type", source: (item) => ((item.dateChips || [])[0] ? [item.dateChips[0]] : []), sort: sortByTypeOrder },
      { key: "filterComp", title: "Compétence", source: (item) => item.competences || [] },
      { key: "filterOrg", title: "Organisation", source: (item) => (item.kicker ? [item.kicker] : []) },
    ];
  }

  function initAllOverlay() {
    if (document.getElementById("all-projects-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "all-projects-overlay";
    overlay.className = "all-projects-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="all-projects-header">
        <button type="button" class="all-projects-back" aria-label="Fermer">←</button>
        <p class="all-projects-title"></p>
      </div>
      <div class="all-projects-filterbar" id="all-projects-filterbar"></div>
      <div class="all-projects-grid" id="all-projects-grid"></div>`;
    document.body.appendChild(overlay);

    overlay.querySelector(".all-projects-back").addEventListener("click", closeAllOverlay);

    const filterBar = overlay.querySelector("#all-projects-filterbar");
    filterBar.addEventListener("click", (e) => {
      const groupBtn = e.target.closest(".all-projects-filter-btn");
      const chip = e.target.closest(".all-projects-filter-chip");
      const reset = e.target.closest(".all-projects-reset");
      if (groupBtn) {
        const key = groupBtn.getAttribute("data-group");
        allOverlayState.openGroup = allOverlayState.openGroup === key ? null : key;
        renderAllOverlayGrid();
      } else if (chip) {
        const key = chip.getAttribute("data-group");
        const value = chip.getAttribute("data-value");
        const list = allOverlayState[key];
        const idx = list.indexOf(value);
        if (idx === -1) list.push(value);
        else list.splice(idx, 1);
        renderAllOverlayGrid();
      } else if (reset) {
        allOverlayState.filterType = [];
        allOverlayState.filterComp = [];
        allOverlayState.filterOrg = [];
        allOverlayState.openGroup = null;
        renderAllOverlayGrid();
      }
    });

    overlay.querySelector("#all-projects-grid").addEventListener("click", (e) => {
      const card = e.target.closest(".all-projects-card");
      if (!card) return;
      const item = getFicheItemsFor(allOverlayState.sectionId)[parseInt(card.getAttribute("data-index"), 10)];
      if (item) openFiche(item, card);
    });

    document.addEventListener("click", (e) => {
      if (!allOverlayState.openGroup) return;
      if (!e.target.closest(".all-projects-filter-group")) {
        allOverlayState.openGroup = null;
        renderAllOverlayGrid();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllOverlay();
    });
  }

  function openAllOverlay(sectionId) {
    const overlay = document.getElementById("all-projects-overlay");
    if (!overlay) return;
    if (allOverlayState.sectionId !== sectionId) {
      allOverlayState.sectionId = sectionId;
      allOverlayState.filterType = [];
      allOverlayState.filterComp = [];
      allOverlayState.filterOrg = [];
      allOverlayState.openGroup = null;
    }
    overlay.querySelector(".all-projects-title").textContent = ALL_OVERLAY_LABELS[sectionId] || "";
    renderAllOverlayGrid();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAllOverlay() {
    const overlay = document.getElementById("all-projects-overlay");
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  function renderAllOverlayGrid() {
    const filterBar = document.getElementById("all-projects-filterbar");
    const grid = document.getElementById("all-projects-grid");
    if (!filterBar || !grid || !allOverlayState.sectionId) return;

    const all = getFicheItemsFor(allOverlayState.sectionId);
    const s = allOverlayState;
    const groups = getOverlayFilterGroups(s.sectionId).map((g) => ({
      ...g,
      values: g.sort ? g.sort(Array.from(new Set(all.flatMap(g.source)))) : Array.from(new Set(all.flatMap(g.source))),
    }));
    const groupByKey = Object.fromEntries(groups.map((g) => [g.key, g]));
    const activeCount = s.filterType.length + s.filterComp.length + s.filterOrg.length;

    filterBar.innerHTML =
      groups
        .map((g, gi) => {
          const active = s[g.key];
          const isOpen = s.openGroup === g.key;
          const align = gi === 0 ? "align-left" : gi === groups.length - 1 ? "align-right" : "align-center";
          return `
        <div class="all-projects-filter-group">
          <button type="button" class="all-projects-filter-btn${active.length ? " is-active" : ""}" data-group="${g.key}">
            <span>${g.title}</span> <span class="all-projects-filter-chevron">▾</span>
            ${active.length ? `<span class="all-projects-filter-badge">${active.length}</span>` : ""}
          </button>
          ${
            isOpen
              ? `<div class="all-projects-filter-menu ${align}">${g.values
                  .map((v) => {
                    const label = g.key === "filterComp" && COMPETENCE_EMOJI[v] ? `${COMPETENCE_EMOJI[v]} ${v}` : v;
                    return `<button type="button" class="all-projects-filter-chip${active.includes(v) ? " is-active" : ""}" data-group="${g.key}" data-value="${v}">${label}</button>`;
                  })
                  .join("")}</div>`
              : ""
          }
        </div>`;
        })
        .join("") + (activeCount ? `<button type="button" class="all-projects-reset">Réinitialiser</button>` : "");

    const filtered = all
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !s.filterType.length || !groupByKey.filterType || groupByKey.filterType.source(item).some((v) => s.filterType.includes(v)))
      .filter(({ item }) => !s.filterOrg.length || !groupByKey.filterOrg || groupByKey.filterOrg.source(item).some((v) => s.filterOrg.includes(v)))
      .filter(({ item }) => !s.filterComp.length || !groupByKey.filterComp || groupByKey.filterComp.source(item).some((v) => s.filterComp.includes(v)));

    grid.innerHTML = filtered
      .map(({ item, i }) => `
        <button type="button" class="all-projects-card" data-index="${i}" style="--tint:${(item.tint || "#1B4FDB") + "26"}">
          <div class="all-projects-card-media"${item.coverUrl ? ` style="background-image:url('${item.coverUrl}')"` : ""}></div>
          <p class="all-projects-card-title">${item.title}</p>
          <p class="all-projects-card-meta">${(item.dateChips || []).join(" · ")}</p>
        </button>`)
      .join("");
  }

  /* ============ HELPER ============ */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
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

    initFicheModal();
    initAllOverlay();
    initHeroNameBounce();

    loadData().then(() => {
      initHomeHero();
    });
  });
})();
