const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "ping",
            group: "meta",
            memberName: "ping",
            description: "Check the ping of the bot to Discord's servers.",
            throttling: {
                usages: 5,
                duration: 10
            }
        });
    }
    
    // Code adapted from Discord.js-Commando's version
    async run(msg) {
        const pingMsg = await msg.say("Pinging the server...");
        const diff = (pingMsg.editedTimestamp || pingMsg.createdTimestamp) - (msg.editedTimestamp || msg.createdTimestamp);
        const heartbeat = this.client.ws.ping ? `The heartbeat ping is ${Math.round(this.client.ws.ping)}ms.` : "";
        await pingMsg.edit(`Pong! The message round-trip took ${diff}ms. ${heartbeat}`);
    }
};
