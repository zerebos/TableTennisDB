import path from "path";
import {fileURLToPath} from "url";
import Keyv from "keyv";
import Sqlite from "@keyv/sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single SQLite connection string
const sqliteUri = "sqlite://" + path.resolve(__dirname, "..", "settings.sqlite3");

// Create one Sqlite store instance
const sqliteStore = new Sqlite(sqliteUri);

// Export pre-configured database instances sharing the same store
export const profiles = new Keyv(sqliteStore, {namespace: "profiles"});
export const stats = new Keyv(sqliteStore, {namespace: "stats"});
export const revspin = new Keyv(sqliteStore, {namespace: "revspin"}); // TODO: use this instead of the client.revspin cache
export const userInstallNotices = new Keyv(sqliteStore, {namespace: "userInstallNotices"});