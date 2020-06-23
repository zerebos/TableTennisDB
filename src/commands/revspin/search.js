const {Command} = require("discord.js-commando");
const Similarity = require("string-similarity");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "search",
            group: "revspin",
            format: "[<type>] <query>",
            memberName: "search",
            description: "Searches for matching equipment.",
            details: "Returns the 5 most matched items. You can specify a category as well",
            examples: ["stats", "stats rubber sriver", "stats butterfly primorac"],
        });
    }
    
    async run(msg, query) {
        query = query.toLowerCase();
        const categories = Object.keys(this.group.cache);
        const category = categories.find(c => c === query.split(" ")[0]);
        if (category) query = query.split(" ").slice(1).join(" ");

        
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
        const top = results.slice(0, 5).map(r => `${r.name} - ${r.similarity.toFixed(2)}%`);
        await msg.info({title: `Top results for \`${query}\``, description: top.join("\n")});
    }
};