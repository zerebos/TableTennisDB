const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "viewreaction",
            aliases: ["vcr"],
            group: "reactions",
            memberName: "viewreaction",
            description: "Views a specific auto-reaction.",
            guildOnly: true,
            userPermissions: ["MANAGE_MESSAGES"],
            args: [
                {
                    key: "keyword",
                    prompt: "What reaction would you like to view?",
                    type: "string"
                }
            ]
        });
    }
    
    async run(msg, args) {
        const reactor = args.keyword.trim();
        const existingReactions = msg.guild.settings.get("autoReactions", {});
        if (!existingReactions[reactor]) return await msg.failure(`Reaction \`${reactor}\` does not exist!`);

        const reaction = existingReactions[reactor];
        if (reaction.response) await msg.say(`In response to \`${reactor}\` I will say: "${reaction.response}"`);
        if (reaction.reactions.length) {
            const message = await msg.say(`I will react to this message with the reactions I will add for \`${reactor}\`.`);
            for (const emoji of reaction.reactions) await message.react(emoji);
        }
    }
};