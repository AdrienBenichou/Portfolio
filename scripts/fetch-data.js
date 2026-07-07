/**
 * Script exécuté par Netlify AU BUILD (pas une function serverless classique).
 * Récupère toutes les tables Airtable en parallèle et écrit data.json
 * à la racine du site publié. main.js lira ce fichier statique en runtime,
 * aucun appel Airtable côté client.
 *
 * Variables d'environnement à définir dans Netlify (Site settings > Environment variables) :
 *   AIRTABLE_API_KEY  -> clé API / Personal Access Token Airtable
 *   AIRTABLE_BASE_ID  -> ID de la base (commence par "app...")
 *
 * NE JAMAIS écrire la clé API en dur ici.
 */

const fs = require("fs");
const path = require("path");

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error(
    "ERREUR: AIRTABLE_API_KEY ou AIRTABLE_BASE_ID manquant(s). " +
      "Ajoute-les dans Netlify > Site settings > Environment variables."
  );
  process.exit(1);
}

// Noms EXACTS des tables Airtable (respecter accents/espaces/parenthèses)
const TABLES = {
  moi: "Moi",
  diplomes: "Diplômes",
  softwares: "Softwares",
  benevolat: "Bénévolat",
  projetsPro: "Mes Projets (Projets Pro)",
  projetsStage: "Mes Projets (Stage)",
  projetsJob: "Mes Projets (Job étudiant)",
  projetsCesure: "Mes Projets (Césure)",
  projetsEtudiant: "Mes Projets (Projets étudiant)",
};

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

/**
 * Récupère TOUS les records d'une table, avec pagination (Airtable
 * plafonne à 100 records par page via `offset`).
 */
async function fetchAllRecords(tableName) {
  let records = [];
  let offset = null;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${encodeURIComponent(tableName)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Airtable a répondu ${res.status} pour la table "${tableName}": ${body}`
      );
    }

    const json = await res.json();
    records = records.concat(json.records.map((r) => ({ id: r.id, ...r.fields })));
    offset = json.offset || null;
  } while (offset);

  return records;
}

async function main() {
  console.log("Fetch Airtable en parallèle...");

  const entries = Object.entries(TABLES);
  const results = await Promise.allSettled(
    entries.map(([key, tableName]) => fetchAllRecords(tableName))
  );

  const data = {};
  let hasError = false;

  results.forEach((result, i) => {
    const [key, tableName] = entries[i];
    if (result.status === "fulfilled") {
      data[key] = result.value;
      console.log(`  OK  ${tableName} (${result.value.length} records)`);
    } else {
      hasError = true;
      data[key] = [];
      console.error(`  FAIL ${tableName} ->`, result.reason.message);
    }
  });

  data.generatedAt = new Date().toISOString();

  const outputPath = path.join(process.cwd(), "data.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`data.json écrit (${outputPath})`);

  if (hasError) {
    console.error("Au moins une table a échoué. Build interrompu.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});