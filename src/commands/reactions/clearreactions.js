const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "clearreactions",
            aliases: ["ccr"],
            group: "reactions",
            memberName: "clearreactions",
            description: "Clears all auto-reactions for this server.",
            guildOnly: true,
            userPermissions: ["MANAGE_MESSAGES"]
        });
    }
    
    async run(msg) {
        msg.guild.settings.set("autoReactions", {});
        await msg.success(`Reactions for the server have been cleared.`);
    }
};