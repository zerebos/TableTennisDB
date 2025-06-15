const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "clearprofile",
            aliases: ["cttp", "dttp"],
            group: "profiles",
            memberName: "clearprofile",
            description: "Clears your TT profile.",
            details: "This will prompt you to ask if you are sure, this operation cannot be undone."
        });
    }
    
    async run(msg) {
        const profiles = this.client.settings.get("profiles", {});
        if (!profiles[msg.author.id]) return await msg.failure(`You don't have a profile setup.`);

        await msg.say(`This cannot be undone. Are you sure? (y/n)`);
        const response = (await msg.channel.awaitMessages(m => m.author.id === msg.author.id, {max: 1, time: 10000})).first();
        if (!response) return await msg.failure("Profile clearing has timed out.");

        const answer = response.content.toLowerCase().trim();
        const doDelete = answer === "y" || answer === "yes";
        const dontDelete = answer === "n" || answer === "not";

        if (!doDelete || !dontDelete) return await msg.failure(`Did not understand input \`${response.content}\`.`);
        if (dontDelete) return await msg.success(`Profile clearing cancelled.`);

        delete profiles[msg.author.id];
        await this.client.settings.set("profiles", profiles);
        await msg.success(`Your profile has been successfully cleared.`);
    }
};