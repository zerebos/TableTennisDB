import {integer, primaryKey, sqliteTable, text} from "drizzle-orm/sqlite-core";

/**
 * Stores user table-tennis gear and skill profiles.
 * Keyed by Discord user ID.
 */
export const profiles = sqliteTable("profiles", {
    userId: text("user_id").primaryKey(),
    forehand: text("forehand"),
    backhand: text("backhand"),
    blade: text("blade"),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    playstyle: text("playstyle"),
});

/**
 * Tracks per-command usage counts, grouped by guild ID (or bot user ID for DMs).
 * Each row represents a single command within a single guild/DM context.
 */
export const commandStats = sqliteTable("command_stats", {
    key: text("key").notNull(),
    command: text("command").notNull(),
    count: integer("count").notNull().default(0),
}, table => [
    primaryKey({columns: [table.key, table.command]}),
]);

/**
 * Tracks which users have already been shown the "user-installable" notice,
 * so it is only displayed once per user.
 */
export const userInstallNotices = sqliteTable("user_install_notices", {
    userId: text("user_id").primaryKey(),
});

/**
 * Cache for RevSpin equipment data (categories of gear with their page hrefs).
 * Intended to replace the in-memory JSON file cache in the future.
 */
export const revspinCache = sqliteTable("revspin_cache", {
    id: integer("id").primaryKey({autoIncrement: true}),
    category: text("category").notNull(),
    name: text("name").notNull(),
    href: text("href").notNull(),
});
