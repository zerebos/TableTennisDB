const {Command} = require("discord.js-commando");
const {MessageEmbed, Constants} = require("discord.js");
const https = require("https");
const Cheerio = require("cheerio");
const Similarity = require("string-similarity");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "stats",
            group: "revspin",
            format: "[<type>] <query>",
            memberName: "stats",
            description: "Gets stats for a piece of equipment.",
            details: "Gets information about the specified equipment from RevSpin.net. In most cases it should give user stats, manufacturer stats, a picture and an approximate price.",
            examples: ["stats", "stats rubber sriver", "stats butterfly primorac"],
        });
    }
    
    async run(msg, query) {
        if (!this.client.isOwner(msg.author)) return msg.failure("Sorry this command isn't quite ready yet.");
        query = query.toLowerCase();
        const categories = Object.keys(this.group.cache);
        const category = categories.find(c => c === query.split(" ")[0]);
        if (category) query = query.split(" ").slice(1).join(" ");

        // Reset similarity scores
        const all = Object.keys(this.group.cache).map(c => this.group.cache[c]).flat();
        all.forEach(i => {i.similarity = 0;}); // Reset similarity scores

        const group = category ? this.group.cache[category] : all;
        const results = group.sort((a, b) => {
            a.similarity = Similarity.compareTwoStrings(query, a.name.toLowerCase()) * 100;
            b.similarity = Similarity.compareTwoStrings(query, b.name.toLowerCase()) * 100;
            if (a.similarity === b.similarity) return 0;
            else if (a.similarity < b.similarity) return 1;
            return -1;
        });
        const top = results[0];
        const passes = category ? top.similarity > 50 : top.similarity > 70;
        if (!passes) return await msg.failure(`Could not find a definitive result for \`${query}\`, please be more specific.`);

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
        const infoEmbed = new MessageEmbed();
        infoEmbed.setAuthor(name, "https://revspin.net/images/layout/revspin-icon-xs.png", url);
        infoEmbed.setThumbnail(img);
        infoEmbed.addField("Type", type.split("")[0].toUpperCase()  + type.slice(1), true);
        infoEmbed.addField("Price", price, true);
        if (user && user.length) infoEmbed.addField("User Ratings", user.map(r => `**${r.label}:** \`${r.value}\``));
        if (manufacturer && manufacturer.length) infoEmbed.addField("Manufacturer Ratings", manufacturer.map(r => `**${r.label}:** \`${r.value}\``));
        infoEmbed.addField("See More", `[${url}](${url})`);
        infoEmbed.setColor(Constants.Colors.INFO);
        await msg.channel.send(infoEmbed);
    }
};