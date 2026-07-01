import {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder, ChatInputCommandInteraction, InteractionContextType, ApplicationIntegrationType} from "discord.js";
import {getText} from "../http";
import {load} from "cheerio";
import * as revspin from "../revspin";
import type {RevspinCacheEntry} from "../types";

export default {
    data: new SlashCommandBuilder()
        .setName("revspin")
        .setDescription("Gets information from RevSpin.net!")
        .addSubcommand(cmd => cmd.setName("search").setDescription("Searches revspin for equipment").addStringOption(opt => opt.setName("query").setDescription("What to search for, can also include a category!").setRequired(true)))
        .addSubcommand(cmd => cmd.setName("stats").setDescription("Gets stats for the equipment from RevSpin").addStringOption(opt => opt.setName("query").setDescription("What to search for, can also include a category!").setRequired(true)))
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        let query = interaction.options.getString("query", true).toLowerCase();
        const category = revspin.categoryNames().find(c => c === query.split(" ")[0]);
        if (category) query = query.split(" ").slice(1).join(" ");

        const results = revspin.search(query, category);

        const command = interaction.options.getSubcommand();
        if (command === "search") return await this.search(interaction, {query, category, results});
        if (command === "stats") return await this.stats(interaction, {query, category, results});
    },

    /**
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async search(interaction: ChatInputCommandInteraction, {query, category, results}: {query: string, category?: string, results: RevspinCacheEntry[]}) {
        const top = results.slice(0, 5).map(r => `${r.name} - ${r.similarity.toFixed(2)}%`);
        // {title: `Top results for \`${query}\``, description: top.join("\n")}
        await interaction.editReply({embeds: [new EmbedBuilder().setTitle(`Top results for \`${query}\` in \`${category ?? "all"}\``).setDescription(top.join("\n"))]});
    },

    /**
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async stats(interaction: ChatInputCommandInteraction, {query, category, results}: {query: string, category?: string, results: RevspinCacheEntry[]}) {
        const top = results[0];
        const passes = category ? top.similarity > 50 : top.similarity > 70;
        if (!passes) return await interaction.editReply({content: `Could not find a definitive result for \`${query}\`, please be more specific.`});

        const url = `https://revspin.net/${top.href}`;
        const html = await getText(url);
        const $ = load(html);
        const name = $("h1").text().trim();
        const price = $("#price_show").text().trim();
        const img = `https://revspin.net${$(".product_detail_image").attr("src")}`;
        const [user, manufacturer] = $(".ratingtable").map((_, ele) =>
            $(ele).find("tr").map((__, tr) => {
                const base = $(tr);
                const label = base.find(".cell_label").text().trim();
                const value = base.find(".cell_rating").text().trim();
                return {label, value: label == "Overall" ? value.replace(/\s+/, " / ") : value.replace(/\s+/, " ")};
            })
        ).get().map(e => e.get());

        const type = top.href.split("/")[0];
        const infoEmbed = new EmbedBuilder();
        infoEmbed.setAuthor({name, iconURL: "https://revspin.net/images/favicon-32x32.png", url});
        infoEmbed.setThumbnail(img);
        infoEmbed.addFields({name: "Type", value: type.split("")[0].toUpperCase() + type.slice(1), inline: true});
        infoEmbed.addFields({name: "Price", value: price, inline: true});
        if (user && user.length) infoEmbed.addFields({name: "User Ratings", value: user.map(r => `**${r.label}:** \`${r.value}\``).join("\n")});
        if (manufacturer && manufacturer.length) infoEmbed.addFields({name: "Manufacturer Ratings", value: manufacturer.map(r => `**${r.label}:** \`${r.value}\``).join("\n")});
        infoEmbed.setColor("Blue");
        infoEmbed.setFooter({text: "Data provided by RevSpin.net", iconURL: "https://revspin.net/images/favicon-32x32.png"});
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel("See on RevSpin.net").setStyle(ButtonStyle.Link).setURL(url));
        await interaction.editReply({embeds: [infoEmbed], components: [row]});
    },
};
