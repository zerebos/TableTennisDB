const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "setupprofile",
            aliases: ["sttp"],
            group: "profiles",
            memberName: "setupprofile",
            format: "[forehand] [backhand] [blade] [playstyle] [strengths] [weaknesses]",
            description: "Sets up your TT profile.",
            details: "You can provide quoted arguments or let the bot walk you through setting it up.",
            args: [
                {key: "forehand", type: "string", prompt: "What rubber do you use on your forehand?"},
                {key: "backhand", type: "string", prompt: "What rubber do you use on your backhand?"},
                {key: "blade", type: "string", prompt: "What blade do you use?"},
                {key: "playstyle", type: "string", prompt: "What's your playstyle? (e.g. attacker, looper, etc.)"},
                {key: "strengths", type: "string", prompt: "What are your strengths?"},
                {key: "weaknesses", type: "string", prompt: "What are your weaknesses?"}
            ],
            examples: ["setupprofile", `setupprofile "butterfly sriver"`, `setupprofile "butterfly sriver" "yasaka rakza 7"`]
        });
    }
    
    async run(msg, {forehand, backhand, blade, playstyle, strengths, weaknesses}) {
        const profiles = this.client.settings.get("profiles", {});
        profiles[msg.author.id] = {forehand, backhand, blade, playstyle, strengths, weaknesses};
        await this.client.settings.set("profiles", profiles);
        await msg.success(`Your profile has been successfully setup.`);
    }
};