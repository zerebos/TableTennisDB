const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "commandstats",
            group: "meta",
            memberName: "commandstats",
            description: "View command usage across servers.",
            ownerOnly: true,
            args: [
                {
                    key: "id",
                    prompt: "What guild is this about?",
                    type: "string",
                    defaultValue: msg => msg.guild ? msg.guild.id : "global"
                }
            ]
        });
    }

    onCommandRun(command, _, msg) {
        if (!msg.guild) return; // Only count commands run in guilds
        const stats = msg.guild.settings.get("commandstats", {});
        if (!stats[command.name]) stats[command.name] = 1;
        else stats[command.name] = stats[command.name] + 1;
        msg.guild.settings.set("commandstats", stats);
    }
    
    async run(msg, {id}) {
        const guild = msg.guild || this.client.guilds.cache.get(id);
        if (guild && id !== "global") {
            const stats = Object.entries(guild.settings.get("commandstats", {})).sort((a, b) => a[1] == b[1] ? 0 : a[1] < b[1] ? 1 : -1);
            return await msg.embed({title: `Stats for ${guild.name}`, description: stats.map((r, i) => `${i + 1}. \`${r[0]}\`: ${r[1]}`).join("\n")});
        }
        
        const cumulative = {};
        const guildStats = this.client.guilds.cache.map(g => g.settings.get("commandstats", {}));
        for (let g = 0; g < guildStats.length; g++) {
            const single = guildStats[g];
            for (const key in single) {
                if (!cumulative[key]) cumulative[key] = single[key];
                else cumulative[key] = cumulative[key] + single[key];
            }
        }
        const stats = Object.entries(cumulative).sort((a, b) => a[1] == b[1] ? 0 : a[1] < b[1] ? 1 : -1);
        await msg.embed({title: `Stats for ${this.client.user.username}`, description: stats.map((r, i) => `${i + 1}. \`${r[0]}\`: ${r[1]}`).join("\n")});
    }
};