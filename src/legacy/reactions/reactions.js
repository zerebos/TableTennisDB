const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "reactions",
            aliases: ["lcr"],
            group: "reactions",
            memberName: "reactions",
            description: "Get a list of all auto-reactions.",
            guildOnly: true,
            userPermissions: ["MANAGE_MESSAGES"]
        });
    }

    onMessage(message) {
        if (!message.guild) return;
        if (!this.client.dispatcher.shouldHandleMessage(message)) return;
        if (this.client.dispatcher.parseMessage(message)) return;

        const reactions = message.guild.settings.get("autoReactions", {});
        for (const reactor in reactions) {
            const reaction = reactions[reactor];
            if (!message.content.includes(reactor)) continue;
            if (reaction.response) message.channel.send(reaction.response);
            for (const emoji of reaction.reactions) message.react(emoji);
        }
    }
    
    async run(msg) {
        const existingReactions = msg.guild.settings.get("autoReactions", {});
        const reactors = Object.keys(existingReactions);
        if (!reactors.length) return await msg.failure(`This server has no reactions set up!`);
        await msg.embed({description: reactors.map((r, i) => `${i + 1}. \`${r}\``).join("\n")});
    }
};