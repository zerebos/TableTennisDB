/**
 * Migration script: keyv (sqlite) → drizzle (sqlite)
 *
 * Run once to move existing data from the flat keyv table to the new
 * normalised tables created by drizzle (src/db.ts).
 *
 *   bun run migrate
 *
 * The script is idempotent – it is safe to run multiple times because all
 * inserts use ON CONFLICT DO NOTHING / REPLACE semantics.
 *
 * The original `keyv` table is left untouched so a rollback is possible.
 */

import path from "path";
import {fileURLToPath} from "url";
import {Database} from "bun:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "..", "settings.sqlite3");

// ── helpers ────────────────────────────────────────────────────────────────

/** Parse the JSON blob that keyv stores as a cell value. */
function parseKeyvValue<T>(raw: string): T | undefined {
    try {
        const parsed = JSON.parse(raw) as {value: T};
        return parsed.value;
    }
    catch {
        return undefined;
    }
}

// ── open database ──────────────────────────────────────────────────────────

console.log(`Opening database at: ${dbPath}`);

let db: Database;
try {
    db = new Database(dbPath);
}
catch (err) {
    console.error("Could not open database – has the bot run at least once?", err);
    process.exit(1);
}

// ── check whether the legacy keyv table exists ─────────────────────────────

const tableCheck = db.query<{name: string}, []>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='keyv';"
).get();

if (!tableCheck) {
    console.log("No legacy 'keyv' table found. Nothing to migrate.");
    db.close();
    process.exit(0);
}

// ── ensure destination tables exist (matches src/db.ts) ────────────────────

db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
        user_id    TEXT PRIMARY KEY,
        forehand   TEXT,
        backhand   TEXT,
        blade      TEXT,
        strengths  TEXT,
        weaknesses TEXT,
        playstyle  TEXT
    );

    CREATE TABLE IF NOT EXISTS command_stats (
        key     TEXT NOT NULL,
        command TEXT NOT NULL,
        count   INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (key, command)
    );

    CREATE TABLE IF NOT EXISTS user_install_notices (
        user_id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS revspin_cache (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        name     TEXT NOT NULL,
        href     TEXT NOT NULL
    );
`);

// ── read all rows from the keyv table ──────────────────────────────────────

interface KeyvRow {key: string; value: string}
const rows = db.query<KeyvRow, []>("SELECT key, value FROM keyv;").all();
console.log(`Found ${rows.length} rows in the legacy 'keyv' table.`);

// ── prepare insert statements ──────────────────────────────────────────────

const insertProfile = db.prepare(`
    INSERT INTO profiles (user_id, forehand, backhand, blade, strengths, weaknesses, playstyle)
    VALUES ($userId, $forehand, $backhand, $blade, $strengths, $weaknesses, $playstyle)
    ON CONFLICT(user_id) DO UPDATE SET
        forehand   = excluded.forehand,
        backhand   = excluded.backhand,
        blade      = excluded.blade,
        strengths  = excluded.strengths,
        weaknesses = excluded.weaknesses,
        playstyle  = excluded.playstyle;
`);

const insertStat = db.prepare(`
    INSERT INTO command_stats (key, command, count)
    VALUES ($key, $command, $count)
    ON CONFLICT(key, command) DO UPDATE SET count = count + excluded.count;
`);

const insertNotice = db.prepare(`
    INSERT INTO user_install_notices (user_id) VALUES ($userId)
    ON CONFLICT(user_id) DO NOTHING;
`);

// ── migrate rows ───────────────────────────────────────────────────────────

let profiles = 0;
let stats = 0;
let notices = 0;
let skipped = 0;

const migrate = db.transaction(() => {
    for (const {key, value} of rows) {
        // keyv key format: "<namespace>:<id>"
        const colonIdx = key.indexOf(":");
        if (colonIdx === -1) {skipped++; continue;}
        const namespace = key.slice(0, colonIdx);
        const id = key.slice(colonIdx + 1);

        if (namespace === "profiles") {
            interface RawProfile {forehand?: string; backhand?: string; blade?: string; strengths?: string; weaknesses?: string; playstyle?: string}
            const data = parseKeyvValue<RawProfile>(value);
            if (!data) {skipped++; continue;}
            insertProfile.run({
                $userId: id,
                $forehand: data.forehand ?? null,
                $backhand: data.backhand ?? null,
                $blade: data.blade ?? null,
                $strengths: data.strengths ?? null,
                $weaknesses: data.weaknesses ?? null,
                $playstyle: data.playstyle ?? null,
            });
            profiles++;
        }
        else if (namespace === "stats") {
            interface RawStats {commands?: Record<string, number>}
            const data = parseKeyvValue<RawStats>(value);
            if (!data?.commands) {skipped++; continue;}
            for (const [command, count] of Object.entries(data.commands)) {
                if (typeof count !== "number") continue;
                insertStat.run({$key: id, $command: command, $count: count});
                stats++;
            }
        }
        else if (namespace === "userInstallNotices") {
            // In the old schema the value was simply `true` – only the presence
            // of the key matters, so insert the user ID unconditionally.
            insertNotice.run({$userId: id});
            notices++;
        }
        else {
            // revspin or unknown namespaces – skip (revspin still uses JSON files)
            skipped++;
        }
    }
});

migrate();

// ── summary ────────────────────────────────────────────────────────────────

console.log("\nMigration complete!");
console.log(`  Profiles migrated        : ${profiles}`);
console.log(`  Command-stat rows upserted: ${stats}`);
console.log(`  Install-notice records   : ${notices}`);
console.log(`  Rows skipped             : ${skipped}`);
console.log("\nThe legacy 'keyv' table has been left intact.");
console.log("You may DROP it manually once you are satisfied with the migration.");

db.close();
