const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "unknown-command",
            group: "botadmin",
            memberName: "unknown-command",
            description: "Displays help information for when an unknown command is used.",
            examples: ["unknown-command kickeverybodyever"],
            unknown: true,
            hidden: true
        });
    }

    // Code adapted from Discord.js-Commando's version
    run(msg) {
        return msg.failure(
            `Unknown command. Use ${msg.anyUsage(
                "help",
                msg.guild ? undefined : null,
                msg.guild ? undefined : null
            )} for a list.`
        );
    }
};