import {Database} from "bun:sqlite";
import path from "node:path";
import {fileURLToPath} from "node:url";
import type {ProfileData} from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// One connection to the same settings file the bot has always used.
export const db = new Database(path.resolve(__dirname, "..", "settings.sqlite3"));
db.exec("PRAGMA journal_mode = WAL;");

db.run(`CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    data    TEXT NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS install_notices (
    user_id TEXT PRIMARY KEY
)`);

db.run(`CREATE TABLE IF NOT EXISTS command_stats (
    scope   TEXT NOT NULL,
    command TEXT NOT NULL,
    count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (scope, command)
)`);


/* -------------------------------------------------------------- profiles */

const selectProfile = db.query<{data: string}, [string]>(`SELECT data FROM profiles WHERE user_id = ?`);
const upsertProfile = db.query(`
    INSERT INTO profiles (user_id, data) VALUES ($user, $data)
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data
`);

export function getProfile(userId: string): ProfileData | undefined {
    const row = selectProfile.get(userId);
    return row ? JSON.parse(row.data) as ProfileData : undefined;
}

export function setProfile(userId: string, profile: ProfileData): void {
    upsertProfile.run({$user: userId, $data: JSON.stringify(profile)});
}


/* ------------------------------------------------------- install notices */

const selectNotice = db.query<{user_id: string}, [string]>(`SELECT user_id FROM install_notices WHERE user_id = ?`);
const insertNotice = db.query(`INSERT OR IGNORE INTO install_notices (user_id) VALUES (?)`);

export function hasSeenInstallNotice(userId: string): boolean {
    return selectNotice.get(userId) !== null;
}

export function markInstallNoticeSeen(userId: string): void {
    insertNotice.run(userId);
}


/* --------------------------------------------------------- command stats */

// Atomic increment — no read-modify-write, so concurrent commands in the
// same scope can't lose an update the way the old keyv object rewrite could.
const incrementStat = db.query(`
    INSERT INTO command_stats (scope, command, count) VALUES ($scope, $command, 1)
    ON CONFLICT(scope, command) DO UPDATE SET count = count + 1
`);
const selectTotals = db.query<{command: string, total: number}, []>(`
    SELECT command, SUM(count) AS total FROM command_stats GROUP BY command
`);

export function recordCommand(scope: string, command: string): void {
    incrementStat.run({$scope: scope, $command: command});
}

// Grand total per command across every scope, in a single aggregate query
// instead of reading each guild's blob one at a time.
export function getCommandTotals(): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const row of selectTotals.all()) totals[row.command] = row.total;
    return totals;
}
