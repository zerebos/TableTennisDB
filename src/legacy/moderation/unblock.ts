const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "unblock",
            group: "moderation",
            memberName: "unblock",
            description: "Unblocks a user from using the bot.",
            guildOnly: true,
            userPermissions: ["KICK_MEMBERS"],
            args: [
                {
                    key: "user",
                    prompt: "Who should be unblocked from using the bot?",
                    type: "user"
                }
            ]
        });
    }
    
    async run(msg, {user}) {
        const blocked = msg.guild.settings.get("blockedUsers", {});
        if (!blocked[user.id]) return await msg.failure(`User ${user} is not blocked!`);
        delete blocked[user.id];
        await msg.success(`User ${user} is no longer blocked!`);
        await msg.guild.settings.set("blockedUsers", blocked);
    }
};