const {MessageEmbed} = require("discord.js");
const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "info",
            group: "meta",
            memberName: "info",
            description: "Gets info about a user.",
            details: `This cannot be used in private messages. If you don't specify a member then the info returned will be yours.`,
            guildOnly: true,
            argsPromptLimit: 0,
            args: [
                {
                    key: "member",
                    type: "member",
                    prompt: "Who should I gather info about?",
                    defaultValue: msg => msg.member
                }
            ]
        });
    }
    
    async run(msg, {member}) {
        const infoEmbed = new MessageEmbed();
        infoEmbed.setAuthor(member.user.tag, member.user.displayAvatarURL());
        infoEmbed.setFooter("Member since");
        infoEmbed.setTimestamp(member.joinedTimestamp);
        infoEmbed.setColor(member.displayColor);

        infoEmbed.addField("ID", member.id, true);
        infoEmbed.addField("Created", member.user.createdAt.toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}), true);
        

        let voiceState = "Not connected.";
        if (member.voice.channelID) {
            const voiceChannel = member.voice.channel;
            const activeCount = member.voice.channel.members.size;
            voiceState = `In ${voiceChannel} ` + (activeCount > 1 ? `with ${activeCount - 1} others.` : "by themselves.");
            infoEmbed.addField("Voice", voiceState, true);
        }
        infoEmbed.addField("Voice", voiceState, true);

        infoEmbed.addField("Roles", member.roles.cache.map(r => `<@&${r.id}>`).join(", "));
        if (member.user.avatar) infoEmbed.setImage(member.user.displayAvatarURL({size: 256}));
        await msg.embed(infoEmbed);
    }
};