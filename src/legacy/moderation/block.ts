const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "block",
            group: "moderation",
            memberName: "block",
            description: "Blocks a user from using the bot.",
            guildOnly: true,
            userPermissions: ["KICK_MEMBERS"],
            args: [
                {
                    key: "user",
                    prompt: "Who should be blocked from using the bot?",
                    type: "member"
                }
            ]
        });
    }
    
    async run(msg, {user}) {
        const blocked = msg.guild.settings.get("blockedUsers", {});
        if (blocked[user.id]) return await msg.failure(`User ${user} is already blocked!`);
        if (user.hasPermission("KICK_MEMBERS") || this.client.isOwner(user)) return await msg.failure(`User ${user} cannot be blocked!`);
        blocked[user.id] = true;
        await msg.success(`User ${user} is now blocked!`);
        await msg.guild.settings.set("blockedUsers", blocked);
    }
};