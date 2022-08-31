const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder} = require("discord.js");
const Similarity = require("string-similarity");
const https = require("https");
const Cheerio = require("cheerio");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("revspin")
        .setDescription("Gets information from RevSpin.net!")
        .addSubcommand(cmd => cmd.setName("search").setDescription("Searches revspin for equipment").addStringOption(opt => opt.setName("query").setDescription("What to search for, can also include a category!").setRequired(true)))
        .addSubcommand(cmd => cmd.setName("stats").setDescription("Gets stats for the equipment from RevSpin").addStringOption(opt => opt.setName("query").setDescription("What to search for, can also include a category!").setRequired(true))),

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async execute(interaction) {
        let query = interaction.options.getString("query").toLowerCase();
        const categories = Object.keys(interaction.client.revspin);
        const category = categories.find(c => c === query.split(" ")[0]);
        if (category) query = query.split(" ").slice(1).join(" ");

        
        const all = Object.keys(interaction.client.revspin).map(c => interaction.client.revspin[c]).flat();
        all.forEach(i => {i.similarity = 0;}); // Reset similarity scores

        const group = category ? interaction.client.revspin[category] : all;
        const results = group.sort((a, b) => {
            a.similarity = Similarity.compareTwoStrings(query, a.name.toLowerCase()) * 100;
            b.similarity = Similarity.compareTwoStrings(query, b.name.toLowerCase()) * 100;
            if (a.similarity === b.similarity) return 0;
            else if (a.similarity < b.similarity) return 1;
            return -1;
        });

        const command = interaction.options.getSubcommand();
        if (command === "search") return await this.search(interaction, {query, category, results});
        if (command === "stats") return await this.stats(interaction, {query, category, results});
    },

    /** 
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async search(interaction, {query, category, results}) {
        const top = results.slice(0, 5).map(r => `${r.name} - ${r.similarity.toFixed(2)}%`);
        // {title: `Top results for \`${query}\``, description: top.join("\n")}
        await interaction.reply({embeds: [new EmbedBuilder().setTitle(`Top results for \`${query}\` in \`${category ?? "all"}\``).setDescription(top.join("\n"))]});
    },

    /** 
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async stats(interaction, {query, category, results}) {
        const top = results[0];
        const passes = category ? top.similarity > 50 : top.similarity > 70;
        if (!passes) return await interaction.reply({content: `Could not find a definitive result for \`${query}\`, please be more specific.`, ephemeral: true});

        const url = `https://revspin.net/${top.href}`;
        const html = await new Promise(resolve => {
            https.get(url).on("response", function (response) {
                let body = "";
                response.on("data", (chunk) => body += chunk);
                response.on("end", () => resolve(body));
            });
        });
        const $ = Cheerio.load(html);
        const name = $("h1").text().trim();
        const price = $("#price_show").text().trim();
        const img = `https://revspin.net${$(".product_detail_image").attr("src")}`;
        const [user, manufacturer] = $(".ratingtable").map((_, ele) => 
            $(ele).find("tr").map((__, tr) => {
                tr = $(tr);
                const label = tr.find(".cell_label").text().trim();
                const value = tr.find(".cell_rating").text().trim();
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
        await interaction.reply({embeds: [infoEmbed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("See on RevSpin.net").setStyle(ButtonStyle.Link).setURL(url))]});
    },
};
