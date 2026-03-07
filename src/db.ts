import path from "path";
import {fileURLToPath} from "url";
import {Database} from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {eq, sql} from "drizzle-orm";
import * as schema from "./schema";
import type {ProfileData, CommandStats} from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "..", "settings.sqlite3");

// Open (or create) the SQLite database file
const sqlite = new Database(dbPath, {create: true});

// Enable WAL mode for better concurrent read performance
sqlite.exec("PRAGMA journal_mode = WAL;");

// Create tables if they do not already exist
sqlite.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
        user_id   TEXT PRIMARY KEY,
        forehand  TEXT,
        backhand  TEXT,
        blade     TEXT,
        strengths TEXT,
        weaknesses TEXT,
        playstyle TEXT
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

export const db = drizzle(sqlite, {schema});

// ---------------------------------------------------------------------------
// Profile helpers
// ---------------------------------------------------------------------------

/** Retrieve a user's table-tennis profile, or `undefined` if none exists. */
export function getProfile(userId: string): ProfileData | undefined {
    const row = db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).get();
    if (!row) return undefined;
    const {forehand, backhand, blade, strengths, weaknesses, playstyle} = row;
    return {forehand: forehand ?? undefined, backhand: backhand ?? undefined, blade: blade ?? undefined, strengths: strengths ?? undefined, weaknesses: weaknesses ?? undefined, playstyle: playstyle ?? undefined};
}

/** Persist (insert or replace) a user's profile. */
export function setProfile(userId: string, data: ProfileData): void {
    db.insert(schema.profiles)
        .values({userId, ...data})
        .onConflictDoUpdate({
            target: schema.profiles.userId,
            set: {
                forehand: data.forehand ?? null,
                backhand: data.backhand ?? null,
                blade: data.blade ?? null,
                strengths: data.strengths ?? null,
                weaknesses: data.weaknesses ?? null,
                playstyle: data.playstyle ?? null,
            },
        })
        .run();
}

// ---------------------------------------------------------------------------
// Command stats helpers
// ---------------------------------------------------------------------------

/** Retrieve all command counts for a guild (or DM context), or `undefined`. */
export function getStats(key: string): CommandStats | undefined {
    const rows = db.select().from(schema.commandStats).where(eq(schema.commandStats.key, key)).all();
    if (!rows.length) return undefined;
    const commands: NonNullable<CommandStats["commands"]> = {};
    for (const row of rows) commands[row.command] = row.count;
    return {commands};
}

/**
 * Atomically increment the usage counter for a command within a given
 * guild / DM context.  Uses an upsert to avoid a separate read round-trip.
 */
export function incrementStat(key: string, commandName: string): void {
    db.insert(schema.commandStats)
        .values({key, command: commandName, count: 1})
        .onConflictDoUpdate({
            target: [schema.commandStats.key, schema.commandStats.command],
            set: {count: sql`count + 1`},
        })
        .run();
}

// ---------------------------------------------------------------------------
// User-install notice helpers
// ---------------------------------------------------------------------------

/** Returns `true` if the user has already been shown the install notice. */
export function hasSeenNotice(userId: string): boolean {
    const row = db.select().from(schema.userInstallNotices).where(eq(schema.userInstallNotices.userId, userId)).get();
    return row !== undefined;
}

/** Record that the install notice has been shown to a user. */
export function markNoticeSeen(userId: string): void {
    db.insert(schema.userInstallNotices).values({userId}).onConflictDoNothing().run();
}
