const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "join",
            group: "meta",
            memberName: "join",
            description: "Generate an invite link to invite this bot."
        });
    }
    
    async run(msg) {
        const link = await this.client.generateInvite(["SEND_MESSAGES", "ADD_REACTIONS", "USE_EXTERNAL_EMOJIS", "USE_VAD", "VIEW_CHANNEL", "EMBED_LINKS", "USE_EXTERNAL_EMOJIS", "ATTACH_FILES"]);
        await msg.author.send({embed: {title: "Thanks for inviting me!", description: `Click this link to add me to your server: ${link}`}});
    }
};
