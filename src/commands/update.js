const {SlashCommandBuilder} = require("discord.js");
const https = require("https");
const Cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const {promisify} = require("util");
const {owner} = require("../../config");
const saveFile = promisify(fs.writeFile);
const loadFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

const cacheFolder = path.resolve(__dirname, "..", "..", ".revspin");

const categories = ["rubber", "blade", "pips", "table", "balls", "shoes", "sponge", "trainingdvd", "robot", "net", "premade"];


module.exports = {
    owner: true,
    data: new SlashCommandBuilder()
        .setName("update")
        .setDescription("Updates the RevSpin cache!"),

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async execute(interaction) {
        if (interaction.user.id !== owner) return await interaction.reply({content: "Sorry this command is only usable by the owner!", ephemeral: true});

        await interaction.reply("Updating cache for RevSpin.net");

        if (!(await exists(path.resolve(cacheFolder)))) return await mkdir(cacheFolder, () => {});
        
        for (const category of categories) {
            await interaction.editReply(`Updating cache for ${category}.`);
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

            await saveFile(path.join(cacheFolder, `${category}.json`), JSON.stringify(data));
            await interaction.editReply(`Cache updated for ${category}.`);
        }

        await this.__initializeCache(interaction.client);
        await interaction.editReply(`RevSpin cache updated!`);
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
