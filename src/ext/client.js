const Commando = require("discord.js-commando");

class DiscordBot extends Commando.Client {
    constructor(options) {
        super(options);
        this.description = options.description;
        this.cpuUsage = process.cpuUsage();
        this.github = options.github;
    }
}

module.exports = () => {
    delete Commando.Client;
    Commando.Client = DiscordBot;
};