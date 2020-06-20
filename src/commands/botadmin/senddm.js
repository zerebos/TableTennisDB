const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "senddm",
            group: "botadmin",
            memberName: "senddm",
            description: "Sends a DM to a user by ID.",
            ownerOnly: true,
            hidden: true,
            argsType: "multiple",
            argsCount: 2
        });
    }
    
    async run(msg, [id, message]) {
        const user = this.client.users.cache.get(id);
        if (!user) return await msg.failure(`Could not find user with ID \`${id}\``);
        try {
            await user.send(message);
            await msg.success(`Message sent to ${user.tag}`);
        }
        catch {
            await msg.failure(`Could not send message to ${user.tag}`);
        }
    }
};