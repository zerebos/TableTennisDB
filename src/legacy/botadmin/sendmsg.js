const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "sendmsg",
            group: "botadmin",
            memberName: "sendmsg",
            description: "Sends a message to a channel by ID.",
            ownerOnly: true,
            hidden: true,
            argsType: "multiple",
            argsCount: 2
        });
    }
    
    async run(msg, [id, message]) {
        const channel = this.client.channels.cache.get(id);
        if (!channel) return await msg.failure(`Could not find channel with ID \`${id}\``);
        try {
            await channel.send(message);
            await msg.success(`Message sent to ${channel.name}`);
        }
        catch {
            await msg.failure(`Could not send message in channel <#${id}>.`);
        }
    }
};