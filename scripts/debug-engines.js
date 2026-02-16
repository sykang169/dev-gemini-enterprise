const { GoogleAuth } = require("google-auth-library");

const PROJECT_ID = "gen-lang-client-0132908516";
const PROJECT_NUM = "683327331998";

async function main() {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const headers = { "Authorization": "Bearer " + token.token };

  // 1. List all engines in different locations
  console.log("=== Listing engines ===\n");
  for (const loc of ["global", "us", "eu"]) {
    for (const endpoint of ["", `${loc}-`]) {
      const url = `https://${endpoint}discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/${loc}/collections/default_collection/engines`;
      try {
        const resp = await fetch(url, { headers });
        if (resp.ok) {
          const data = await resp.json();
          const engines = data.engines || [];
          if (engines.length > 0) {
            console.log(`Location: ${loc} (endpoint: ${endpoint || "default"})`);
            for (const e of engines) {
              console.log(`  Engine: ${e.displayName || "(no name)"}`);
              console.log(`    name: ${e.name}`);
              console.log(`    type: ${e.solutionType || e.searchEngineConfig?.searchTier || "unknown"}`);
            }
          }
        }
      } catch (err) {
        // skip
      }
    }
  }

  // 2. List sessions for each known engine, including v1alpha
  console.log("\n=== Checking sessions across API versions ===\n");
  const engineId = "gemini-enterprise-17706830_1770683046014";

  for (const ver of ["v1", "v1alpha"]) {
    for (const loc of ["global", "us"]) {
      const endpoint = loc === "global" ? "" : `${loc}-`;
      const url = `https://${endpoint}discoveryengine.googleapis.com/${ver}/projects/${PROJECT_ID}/locations/${loc}/collections/default_collection/engines/${engineId}/sessions?pageSize=20`;
      try {
        const resp = await fetch(url, { headers });
        if (resp.ok) {
          const data = await resp.json();
          const sessions = data.sessions || [];
          console.log(`${ver} / location=${loc}: ${sessions.length} sessions`);
          for (const s of sessions.slice(0, 5)) {
            console.log(`  - "${s.displayName}" (userPseudoId: ${s.userPseudoId || "none"})`);
          }
          if (sessions.length > 5) console.log(`  ... and ${sessions.length - 5} more`);
        } else {
          const errText = await resp.text();
          console.log(`${ver} / location=${loc}: ${resp.status} - ${errText.substring(0, 100)}`);
        }
      } catch (err) {
        console.log(`${ver} / location=${loc}: ERROR - ${err.message}`);
      }
    }
  }

  // 3. Check if there's a "gemini" or "default" engine
  console.log("\n=== Checking common engine patterns ===\n");
  const commonEngines = ["default", "gemini", "gemini-enterprise"];
  for (const eid of commonEngines) {
    for (const loc of ["global", "us"]) {
      const endpoint = loc === "global" ? "" : `${loc}-`;
      const url = `https://${endpoint}discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/${loc}/collections/default_collection/engines/${eid}/sessions?pageSize=5`;
      try {
        const resp = await fetch(url, { headers });
        if (resp.ok) {
          const data = await resp.json();
          const sessions = data.sessions || [];
          if (sessions.length > 0) {
            console.log(`Engine "${eid}" at ${loc}: ${sessions.length} sessions`);
            for (const s of sessions) {
              console.log(`  - "${s.displayName}" (userPseudoId: ${s.userPseudoId || "none"})`);
            }
          }
        }
      } catch (err) {
        // skip
      }
    }
  }

  // 4. Try listing data stores to find all apps
  console.log("\n=== Listing data stores ===\n");
  for (const loc of ["global", "us"]) {
    const endpoint = loc === "global" ? "" : `${loc}-`;
    const url = `https://${endpoint}discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/${loc}/collections/default_collection/dataStores`;
    try {
      const resp = await fetch(url, { headers });
      if (resp.ok) {
        const data = await resp.json();
        for (const ds of (data.dataStores || [])) {
          console.log(`  DataStore: ${ds.displayName} (${loc})`);
          console.log(`    name: ${ds.name}`);
        }
      }
    } catch (err) {
      // skip
    }
  }
}

main().catch(console.error);
