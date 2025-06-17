import {SlashCommandBuilder, ChatInputCommandInteraction, Client, MessageFlags} from "discord.js";
import https from "https";
import {load} from "cheerio";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {promisify} from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const saveFile = promisify(fs.writeFile);
const loadFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

const cacheFolder = path.resolve(__dirname, "..", "..", ".revspin");

const categories = ["rubber", "blade", "pips", "table", "balls", "shoes", "sponge", "trainingdvd", "robot", "net", "premade"];

export default {
    owner: true,
    data: new SlashCommandBuilder()
        .setName("update")
        .setDescription("Updates the RevSpin cache!"),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== process.env.BOT_OWNER_ID) return await interaction.reply({content: "Sorry this command is only usable by the owner!", flags: MessageFlags.Ephemeral});

        await interaction.reply("Updating cache for RevSpin.net");

        if (!(await exists(path.resolve(cacheFolder)))) return await mkdir(cacheFolder);

        for (const category of categories) {
            await interaction.editReply(`Updating cache for ${category}.`);
            const url = `https://revspin.net/${category}/`;
            const html = await new Promise<string>(resolve => {
                https.get(url).on("response", function (response) {
                    let body = "";
                    response.on("data", (chunk) => body += chunk);
                    response.on("end", () => resolve(body));
                });
            });
            const $ = load(html);
            const data = $("td.cell_name").map((_, el) => {
                const base = $(el);
                const link = base.find("a").attr("href");
                if (!link) return null;
                return {name: base.text().trim(), href: link};
            }).get().filter(i => i);

            await saveFile(path.join(cacheFolder, `${category}.json`), JSON.stringify(data));
            await interaction.editReply(`Cache updated for ${category}.`);
        }

        await this.__initializeCache(interaction.client);
        await interaction.editReply(`RevSpin cache updated!`);
    },

    // TODO: Refactor this to be a method of the client
    // thereby de-duping the code in the ready event
    async __initializeCache(client: Client) {
        if (!(await exists(path.resolve(cacheFolder)))) return await mkdir(cacheFolder);
        client.revspin = {};
        for (const category of categories) {
            const data = await loadFile(path.join(cacheFolder, `${category}.json`));
            client.revspin[category] = JSON.parse(data.toString());
        }
    }
};
