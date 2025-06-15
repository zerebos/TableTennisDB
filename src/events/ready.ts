const fs = require("fs");
const path = require("path");

const {promisify} = require("util");
const loadFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const cacheFolder = path.resolve(__dirname, "..", "..", ".revspin");

const categories = ["rubber", "blade", "pips", "table", "balls", "shoes", "sponge", "trainingdvd", "robot", "net", "premade"];

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        client.cpuUsage = process.cpuUsage();
        client.readyAt = new Date();
        await this.__initializeCache(client);
    },
    async __initializeCache(client) {
        if (!(await exists(path.resolve(cacheFolder)))) return await mkdir(cacheFolder, () => {});
        client.revspin = {};
        for (const category of categories) {
            const data = await loadFile(path.join(cacheFolder, `${category}.json`));
            client.revspin[category] = JSON.parse(data.toString());
        }
    }
};