const {MessageEmbed} = require("discord.js");
const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "forwarddms",
            group: "botadmin",
            memberName: "forwarddms",
            description: "Toggles sending DMs to the owner.",
            ownerOnly: true,
            hidden: true
        });
    }

    onMessage(message) {
         // Ignore guild messages or messages from owner
        if (message.guild || this.client.isOwner(message.author)) return;

        // Ignore commands or responses to prompts
        if (!this.client.dispatcher.shouldHandleMessage(message)) return;
        if (this.client.dispatcher.parseMessage(message)) return;

        // Check if it should be forwarded
        const shouldForward = this.client.settings.get("forwarddms", true);
        if (!shouldForward) return;
        
        const owner = this.client.owners[0];
        const embed = new MessageEmbed();
        embed.setAuthor(message.author.tag, message.author.displayAvatarURL());
        embed.setDescription(message.content);
        message.attachments.each((att, id) => {
            embed.addField(`${att.name} (${id})`, `[${att.url}](${att.url})`);
        });
        owner.send(embed);
    }
    
    async run(msg) {
        const isForwarding = this.client.settings.get("forwarddms", true);
        const willForward = !isForwarding;
        await msg.success(`DMs will ${willForward ? "now" : "no longer"} be forwarded.`);
        await this.client.settings.set("forwarddms", willForward);
    }
};