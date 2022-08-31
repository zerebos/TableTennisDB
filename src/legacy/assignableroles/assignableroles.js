const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "assignableroles",
            aliases: ["lsar"],
            group: "assignableroles",
            memberName: "assignableroles",
            description: "Get a list of all self-assignable roles.",
            guildOnly: true
        });
    }
    
    async run(msg) {
        const assignable = Object.keys(msg.guild.settings.get("assignableroles", {})).filter(id => msg.guild.roles.cache.get(id));//.map(id => msg.guild.roles.cache.get(id) && msg.guild.roles.cache.get(id).name).filter(r => r);
        if (!assignable.length) return await msg.failure("There are no self-assignable roles on this server.");
        await msg.success({title: "Assignable Roles", description: assignable.map((r, i) => `${i + 1}. <@&${r}>`).join("\n")});
    }
};