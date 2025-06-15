const {Command} = require("discord.js-commando");

const fields = ["forehand", "backhand", "blade", "playstyle", "strengths", "weaknesses"];

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "editprofile",
            aliases: ["ettp"],
            group: "profiles",
            memberName: "editprofile",
            format: "<field>",
            description: "Lets you modify your profile without the full setup.",
            details: "You can either pass the field with the command (e.g. `editprofile forehand`) or let the bot prompt you for the field.",
            args: [
                {
                    key: "field",
                    type: "string",
                    prompt: "What field do you want to change? (forehand, backhand, blade, playstyle, strengths, weaknesses)"
                }
            ],
            examples: ["editprofile forehand", "editprofile weaknesses"]
        });
    }
    
    async run(msg, {field}) {
        const profiles = this.client.settings.get("profiles", {});
        const profile = profiles[msg.author.id];
        if (!profile) return await msg.failure(`You don't have a profile setup.`);

        if (!fields.includes(field.toLowerCase())) return await msg.failure(`No such field \`${field}\`.`);

        await msg.say(`Okay, what should be the new value for ${field.toLowerCase()}`);
        const response = (await msg.channel.awaitMessages(m => m.author.id === msg.author.id, {max: 1, time: 10000})).first();
        if (!response) return await msg.failure("Profile edit has timed out.");

        profile[field.toLowerCase()] = response.content.trim();
        profiles[msg.author.id] = profile;

        await this.client.settings.set("profiles", profiles);
        await msg.success(`Your profile has been successfully updated.`);
    }
};