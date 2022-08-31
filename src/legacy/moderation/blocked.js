const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "blocked",
            group: "moderation",
            memberName: "blocked",
            description: "Get a list of all blocked users.",
            guildOnly: true,
            userPermissions: ["KICK_MEMBERS"]
        });
    }

    inhibitor(msg) {
        if (!msg.guild) return;
        if (msg.member.hasPermission("KICK_MEMBERS") || this.client.isOwner(msg.author)) return false;
        const blocked = msg.guild.settings.get("blocked", {});
        if (blocked[msg.author.id]) return "blocked";
        return false;
    }
    
    async run(msg) {
        const blocked = msg.guild.settings.get("blockedUsers", {});
        const users = Object.keys(blocked);
        if (!users.length) return await msg.failure(`This server has no blocked users!`);
        await msg.embed({title: "Blocked Users", description: users.map((r, i) => `${i + 1}. <@!${r}>`).join("\n")});
    }
};