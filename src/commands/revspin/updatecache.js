const {Command} = require("discord.js-commando");
const https = require("https");
const Cheerio = require("cheerio");
const {Constants} = require("discord.js");
const fs = require("fs");
const path = require("path");

const {promisify} = require("util");
const saveFile = promisify(fs.writeFile);
const loadFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

const cacheFolder = path.resolve(__dirname, "cache");

const categories = ["rubber", "blade", "pips", "table", "balls", "shoes", "sponge", "trainingdvd", "robot", "net", "premade"];

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "updatecache",
            group: "revspin",
            format: "<query>",
            memberName: "updatecache",
            description: "Updates the RevSpin.net index cache.",
            ownerOnly: true
        });

        // this.group.categories = categories;
        this.__initializeCache();
    }

    async __initializeCache() {
        if (!(await exists(path.resolve(cacheFolder)))) return await mkdir(cacheFolder, () => {});
        this.group.cache = {};
        for (const category of categories) {
            const data = await loadFile(path.join(cacheFolder, `${category}.json`));
            this.group.cache[category] = JSON.parse(data.toString());
        }
    }
    
    async run(msg) {
        const originalMsg = await msg.info("Updating cache for RevSpin.net");
        
        for (const category of categories) {
            await originalMsg.edit("", {embed: {description: `Updating cache for ${category}.`, color: Constants.Colors.INFO}});
            const url = `https://revspin.net/${category}/`;
            const html = await new Promise(resolve => {
                https.get(url).on("response", function (response) {
                    let body = "";
                    response.on("data", (chunk) => body += chunk);
                    response.on("end", () => resolve(body));
                });
            });
            const $ = Cheerio.load(html);
            const data = $("td.cell_name").map((_, el) => {
                el = $(el);
                const link = el.find("a").attr("href");
                if (!link) return null;
                return {name: el.text().trim(), href: link};
            }).get().filter(i => i);
            console.log(data);
            await saveFile(path.join(cacheFolder, `${category}.json`), JSON.stringify(data));
            await originalMsg.edit("", {embed: {description: `Cache updated for ${category}.`, color: Constants.Colors.INFO}});
        }

        await this.__initializeCache();
        await originalMsg.edit("", {embed: {description: `RevSpin cache updated!`, color: Constants.Colors.INFO}});
    }
};