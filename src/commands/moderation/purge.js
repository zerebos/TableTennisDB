const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "purge",
            group: "moderation",
            memberName: "purge",
            description: "Purges a number of messages from the channel.",
            guildOnly: true,
            userPermissions: ["MANAGE_MESSAGES"],
            args: [
                {
                    key: "count",
                    prompt: "How many messages should be purged?",
                    type: "integer"
                }
            ]
        });
    }
    
    async run(msg, {count}) {
        await msg.channel.bulkDelete(count);
        await msg.success(`Successfully purged ${count} messages.`);
    }
};