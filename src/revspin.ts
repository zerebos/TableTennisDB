import path from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs/promises";
import Similarity from "string-similarity";
import {load as loadHtml} from "cheerio";
import {getText} from "./http";
import type {RevspinCacheEntry} from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheFolder = path.resolve(__dirname, "..", ".revspin");
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0";

export const categories = ["rubber", "blade", "pips", "table", "balls", "shoes", "sponge", "trainingdvd", "robot", "net", "premade"] as const;

// In-memory cache, loaded from .revspin/*.json at startup and after a refresh.
// Owned here rather than hung off the discord.js Client so there's one source
// of truth and no shared mutable state leaking through the client object.
let cache: Record<string, RevspinCacheEntry[]> = {};

export function categoryNames(): string[] {
    return Object.keys(cache);
}

// Load every cached category from disk into memory. Missing files are skipped
// rather than throwing, so a partial cache still boots.
export async function load(): Promise<void> {
    await fs.mkdir(cacheFolder, {recursive: true});
    const next: Record<string, RevspinCacheEntry[]> = {};
    for (const category of categories) {
        const file = Bun.file(path.join(cacheFolder, `${category}.json`));
        if (await file.exists()) next[category] = await file.json();
    }
    cache = next;
}

// Scrape one category from revspin.net and persist it to disk.
async function refreshCategory(category: string): Promise<void> {
    const html = await getText(`https://revspin.net/${category}/`, {"user-agent": USER_AGENT});
    const $ = loadHtml(html);
    const data = $("td.cell_name").map((_, el) => {
        const base = $(el);
        const link = base.find("a").attr("href");
        if (!link) return null;
        return {name: base.text().trim(), href: link};
    }).get().filter(i => i);
    await Bun.write(path.join(cacheFolder, `${category}.json`), JSON.stringify(data));
}

// Refresh every category (reporting progress if asked) then reload into memory.
export async function refresh(onProgress?: (category: string) => void | Promise<void>): Promise<void> {
    await fs.mkdir(cacheFolder, {recursive: true});
    for (const category of categories) {
        await onProgress?.(category);
        await refreshCategory(category);
    }
    await load();
}

// Rank cached entries by similarity to the query. Scores are computed into a
// fresh array so concurrent searches can't clobber each other through shared
// cache objects the way the old in-place sort did.
export function search(query: string, category?: string): RevspinCacheEntry[] {
    const group = category ? (cache[category] ?? []) : Object.values(cache).flat();
    return group
        .map(entry => ({...entry, similarity: Similarity.compareTwoStrings(query, entry.name.toLowerCase()) * 100}))
        .sort((a, b) => b.similarity - a.similarity);
}
