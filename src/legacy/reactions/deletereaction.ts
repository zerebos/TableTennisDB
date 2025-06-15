const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "deletereaction",
            aliases: ["dcr"],
            group: "reactions",
            memberName: "deletereaction",
            description: "Deletes an auto-reaction",
            guildOnly: true,
            userPermissions: ["MANAGE_MESSAGES"],
            args: [
                {
                    key: "keyword",
                    prompt: "Which reaction should be deleted?",
                    type: "string"
                }
            ]
        });
    }
    
    async run(msg, args) {
        const reactor = args.keyword.trim();
        const existingReactions = msg.guild.settings.get("autoReactions", {});
        if (!existingReactions[reactor]) return await msg.failure(`Reaction \`${reactor}\` does not exist!`);
        delete existingReactions[reactor];
        msg.guild.settings.set("autoReactions", existingReactions);
        await msg.success(`Reaction \`${reactor}\` has been deleted.`);
    }
};