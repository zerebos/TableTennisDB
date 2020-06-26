const {Command} = require("discord.js-commando");
const {Collection} = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "addreaction",
            aliases: ["acr"],
            group: "reactions",
            memberName: "addreaction",
            description: "Sets up a keyword or phrase to react to.",
            guildOnly: true,
            userPermissions: ["MANAGE_MESSAGES"],
            args: [
                {
                    key: "keyword",
                    prompt: "What should I react to?",
                    type: "string"
                }
            ]
        });
    }
    
    async run(msg, args) {
        const reactor = args.keyword.trim();
        const existingReactions = msg.guild.settings.get("autoReactions", {});
        if (existingReactions[reactor]) return await msg.failure(`Reaction \`${reactor}\` already exists!`);

        await msg.say(`Okay, I'll react to \`${reactor}\`. What do you want me to say? (Or 🚫 for no response)`);
        const response = (await msg.channel.awaitMessages(m => m.author.id === msg.author.id, {max: 1, time: 10000})).first();
        if (!response) return await msg.failure("Reaction setup has timed out.");

        const reply = await msg.say(`Awesome! Now react to this message any reactions I should have to \`${reactor}\`. React ⏹️ when you're done.`);
        const reactions = new Collection();
        const reactionCollector = (r, u) => {
            if (u.id === msg.author.id && r.emoji.name == "⏹️") return true;
            reactions.set(r.emoji.id || r.emoji.name, r);
            return false;
        };
        await reply.awaitReactions(reactionCollector, {max: 1, time: 30000});

        if (reactions.size) {
            const unusable = [];
            for (const [key, reaction] of reactions) {
                const emoji = reaction.emoji;
                if (!emoji.id || this.client.emojis.cache.has(emoji.id)) continue;
                unusable.push(`${emoji}`);
                reactions.delete(key);
            }
            if (unusable.length) await msg.failure("Could not use these emojis: " + unusable.join(" "));
        }

        const reactionText = response.content.trim() == `🚫` ? null : response.content;
        if (!reactionText && !reactions.size) return await msg.failure("No reaction or response was set.");
        existingReactions[reactor] = {response: reactionText, reactions: reactions.keyArray()};
        msg.guild.settings.set("autoReactions", existingReactions);

        await msg.success(`Reaction \`${reactor}\` has been setup.`);
    }
};