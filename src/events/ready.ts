import type {Client} from "discord.js";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {promisify} from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const cacheFolder = path.resolve(__dirname, "..", "..", ".revspin");

const categories = ["rubber", "blade", "pips", "table", "balls", "shoes", "sponge", "trainingdvd", "robot", "net", "premade"];

export default {
    name: "ready",
    once: true,
    async execute(client: Client) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);
        client.cpuUsage = process.cpuUsage();
        await this.__initializeCache(client);
    },
    async __initializeCache(client: Client) {
        if (!(await exists(path.resolve(cacheFolder)))) return await mkdir(cacheFolder);
        client.revspin = {};
        for (const category of categories) {
            const data = await loadFile(path.join(cacheFolder, `${category}.json`));
            client.revspin[category] = JSON.parse(data.toString());
        }
    }
};