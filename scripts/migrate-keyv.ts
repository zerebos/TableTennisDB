// One-time, non-destructive migration from the old @keyv/sqlite storage to
// the typed tables in src/db.ts. The legacy `keyv` table lives in the same
// settings.sqlite3 file and is left completely untouched; this only reads it
// and writes the new tables, so it is safe to run (and safe to re-run — every
// write is an upsert). Run with: bun run migrate
import {db, setProfile, markInstallNoticeSeen} from "../src/db";
import type {ProfileData} from "../src/types";

const legacyExists = db.query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'keyv'`).get();
if (!legacyExists) {
    console.log("No legacy `keyv` table found — nothing to migrate.");
    process.exit(0);
}

// keyv wraps stored values as {"value": <data>, "expires": <ts|null>}; be
// defensive in case a raw value was stored without the envelope.
function unwrap(raw: string): unknown {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "value" in parsed) return (parsed as {value: unknown}).value;
        return parsed;
    }
    catch {
        return raw;
    }
}

// Sets an absolute count rather than incrementing, so re-running is idempotent.
const setStat = db.query(`
    INSERT INTO command_stats (scope, command, count) VALUES ($scope, $command, $count)
    ON CONFLICT(scope, command) DO UPDATE SET count = excluded.count
`);

const rows = db.query<{key: string, value: string}, []>(`SELECT key, value FROM keyv`).all();

let profiles = 0;
let notices = 0;
let statRows = 0;

for (const {key, value} of rows) {
    const sep = key.indexOf(":");
    if (sep === -1) continue;
    const namespace = key.slice(0, sep);
    const id = key.slice(sep + 1);
    const data = unwrap(value);

    if (namespace === "profiles" && data && typeof data === "object") {
        setProfile(id, data as ProfileData);
        profiles++;
    }
    else if (namespace === "userInstallNotices") {
        if (data) markInstallNoticeSeen(id);
        notices++;
    }
    else if (namespace === "stats" && data && typeof data === "object") {
        const commands = (data as {commands?: Record<string, number>}).commands ?? {};
        for (const [command, count] of Object.entries(commands)) {
            setStat.run({$scope: id, $command: command, $count: Number(count)});
            statRows++;
        }
    }
}

console.log(`✅ Migrated ${profiles} profiles, ${notices} install notices, and ${statRows} command-stat rows.`);
console.log("The legacy `keyv` table was left untouched; drop it manually once you've verified the new data.");
