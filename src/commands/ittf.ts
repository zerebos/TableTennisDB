import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType} from "discord.js";
import {getText} from "../http";
import {load} from "cheerio";
import Paginator from "../paginator";

const eventChoices = [
    {name: "Men's Singles", value: "MS"},
    {name: "Women's Singles", value: "WS"},
    {name: "Men's Doubles Pairs", value: "MD"},
    {name: "Women's Doubles Pairs", value: "WD"},
    {name: "Men's Doubles Individuals", value: "MDI"},
    {name: "Women's Doubles Individuals", value: "WDI"},
    {name: "Mixed's Doubles Pairs", value: "XD"},
    {name: "Mixed's Doubles Individuals", value: "XDI"},
];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthChoices = months.map((m, i) => ({name: m, value: i}));

// https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
function getWeekNumber(d: Date) {

    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    // Calculate full weeks to nearest Thursday
    return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}

export default {
    data: new SlashCommandBuilder()
        .setName("ittf")
        .setDescription("Gets information from the ITTF website!")
        .addSubcommand(cmd =>
            cmd.setName("calendar")
                .setDescription("Shows yearly ITTF events!")
                .addNumberOption((/** @type {import("@discordjs/builders").SlashCommandNumberOption} */ option) =>
                    option.setName("month")
                        .setDescription("Which month's events to view")
                        .setRequired(false)
                        .addChoices(...monthChoices))
        )
        .addSubcommand(cmd =>
            cmd.setName("rankings")
                .setDescription("Gets the current world rankings!")
                .addStringOption((/** @type {import("@discordjs/builders").SlashCommandStringOption} */ option) =>
                    option.setName("type")
                        .setDescription("Which ranking type to view")
                        .setRequired(true)
                        .addChoices(...eventChoices))
        )
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

    /**
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async execute(interaction: ChatInputCommandInteraction) {
        const command = interaction.options.getSubcommand();
        if (command === "calendar") return await this.calendar(interaction);
        if (command === "rankings") return await this.rankings(interaction);
    },

    /**
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async calendar(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const today = new Date();
        const month = interaction.options.getNumber("month", false) ?? (today).getMonth();
        const monthName = months[month];
        const url = `https://www.ittf.com/${today.getFullYear()}-events-calendar/`;
        const html = await getText(url);
        const $ = load(html);
        const content = $(".content");
        const ul = $(content.find("ul").get(month));
        const description = ul.find("li").map((_, element) => {
            const el = $(element);
            const children = el.children("a");
            if (!children.length) return `- ${el.text()}`.trim();
            const link = children.attr("href");
            const text = children.text();
            return `- [${text}](${link})`.trim();
        }).get().join("\n");

        const eventEmbed = new EmbedBuilder().setColor("White").setAuthor({name: `Events in ${monthName}`, url: url, iconURL: "https://ranking.ittf.com/img/logos/ittf.png"}).setDescription(description);
        await interaction.editReply({embeds: [eventEmbed]});
    },

    /**
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async rankings(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const eventType = interaction.options.getString("type");
        const today = new Date();
        let year = today.getFullYear();
        let month = (today.getMonth() + 1).toString().padStart(2, "0");
        let week = getWeekNumber(today);
        // https://www.ittf.com/wp-content/uploads/2022/08/2022_35_SEN_MS.html
        const buildUrl = () => `https://www.ittf.com/wp-content/uploads/${year}/${month}/${year}_${week}_SEN_${eventType}.html`;
        let url = buildUrl();

        let html: string;
        try {
            html = await getText(url);
        }
        catch {
            // Something went wrong, no update? Try last week's data.
            today.setDate(today.getDate() - 7);
            year = today.getFullYear();
            month = (today.getMonth() + 1).toString().padStart(2, "0");
            week = getWeekNumber(today);
            url = buildUrl();
            try {
                html = await getText(url);
            }
            catch {
                return await interaction.editReply("Something went wrong trying to get the rankings!");
            }
        }
        const $ = load(html);
        const list = $("tbody");
        // console.log(list.children);
        const rankings = list.children().filter((_, el) => $(el).hasClass("rrow")).map((_, el) => {
            const cells = $(el).find("td");
            const rank = $(cells[0]).text().trim();
            const name = $(cells[1]).text().trim();
            const country = $(cells[2]).text().trim();
            const points = $(cells[3]).text().trim();
            return {rank, name, country, points};
        }).get();

        if (!rankings.length) {
            return await interaction.editReply("Something went wrong trying to get the rankings!");
        }

        const entries = rankings.map(p => `**${p.name}** | ${p.country} | ${p.points}`);
        const p = new Paginator(interaction, entries);
        p.embed = p.embed.setColor("White").setAuthor({name: `${eventChoices.find(c => c.value === eventType)!.name} for Week ${week} of ${year}`, url: url, iconURL: "https://ranking.ittf.com/img/logos/ittf.png"});
        await p.paginate();
    },
};
