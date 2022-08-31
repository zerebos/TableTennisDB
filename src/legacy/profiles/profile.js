const {MessageEmbed, Constants} = require("discord.js");
const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "profile",
            aliases: ["ttp"],
            group: "profiles",
            memberName: "profile",
            format: "[user]",
            description: "Gets the TT profile for a user.",
            details: `This cannot be used in private messages. If you don't specify a user then the info returned will be yours.`,
            args: [
                {
                    key: "user",
                    type: "user",
                    prompt: "Whose profile do you want to view?",
                    defaultValue: msg => msg.author
                }
            ],
            examples: ["profile", "profile @myFriend", "profile 249746236008169473"]
        });
    }
    
    async run(msg, {user}) {
        const profiles = this.client.settings.get("profiles", {});
        const profile = profiles[user.id];
        if (!profile) return await msg.failure(`${user === msg.author ? "You don't" : `${user.tag} doesn't`} have a profile setup.`);

        const profileEmbed = new MessageEmbed();
        profileEmbed.setAuthor(`${user.username}'s Profile`, user.displayAvatarURL());
        profileEmbed.setColor(Constants.Colors.INFO);
        profileEmbed.addField("Forehand", profile.forehand, true);
        profileEmbed.addField("Backhand", profile.backhand, true);
        profileEmbed.addField("Blade", profile.blade, true);

        profileEmbed.addField("Playstyle", profile.playstyle, true);
        profileEmbed.addField("Strengths", profile.strengths, true);
        profileEmbed.addField("Weaknesses", profile.weaknesses, true);
        await msg.embed(profileEmbed);
    }
};