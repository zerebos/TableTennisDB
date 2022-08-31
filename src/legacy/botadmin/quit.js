const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "quit",
            group: "botadmin",
            memberName: "quit",
            description: "Turns the bot off.",
            details: "Only the bot owner(s) may use this command.",
            ownerOnly: true
        });
    }
    
    async run(msg) {
        await msg.success("Bot shutting down.");
        this.client.destroy();
    }
};