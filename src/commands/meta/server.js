const {MessageEmbed} = require("discord.js");
const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "server",
            group: "meta",
            memberName: "server",
            description: "Gets info about the server.",
            guildOnly: true
        });
    }
    
    async run(msg) {
        const guild = msg.guild;
        const infoEmbed = new MessageEmbed();
        infoEmbed.setTitle(`${guild.name} (ID: ${guild.id})`);
        infoEmbed.setFooter("Created");
        infoEmbed.setTimestamp(guild.createdTimestamp);

        infoEmbed.addField("Region", guild.region, true);
        infoEmbed.addField("Owner", guild.owner, true);
        infoEmbed.addField("Partnered?", guild.partnered ? "Yes" : "No", true);

        const channels = guild.channels.cache;
        let channelText = `Categories: ${channels.filter(ch => ch.type === "category").size}\n`;
        channelText += `Text: ${channels.filter(ch => ch.type === "text").size}\n`;
        channelText += `Voice: ${channels.filter(ch => ch.type === "voice").size}\n`;
        channelText += `News: ${channels.filter(ch => ch.type === "news").size}\n`;
        channelText += `Store: ${channels.filter(ch => ch.type === "store").size}\n`;
        infoEmbed.addField("Channels", channelText, true);

        const members = guild.members.cache;
        let memberText = `Total: ${guild.memberCount}\n`;
        memberText += `Online: ${members.filter(m => m.presence.status === "online").size}\n`;
        memberText += `Idle: ${members.filter(m => m.presence.status === "idle").size}\n`;
        memberText += `DND: ${members.filter(m => m.presence.status === "dnd").size}\n`;
        memberText += `Offline: ${guild.memberCount - members.filter(m => m.presence.status !== "offline").size}\n`;
        infoEmbed.addField("Members", memberText, true);

        const roles = guild.roles.cache;
        let roleText = `Total: ${roles.size}\n`;
        roleText += `Hoisted: ${roles.filter(r => r.hoist).size}\n`;
        roleText += `Colors: ${roles.filter(r => r.color).size}\n`;
        roleText += `Managed: ${roles.filter(r => r.managed).size}\n`;
        roleText += `Mentionable: ${roles.filter(r => r.mentionable).size}\n`;
        infoEmbed.addField("Roles", roleText, true);

        if (guild.description) infoEmbed.setDescription(guild.description);
        if (guild.icon) infoEmbed.setThumbnail(guild.iconURL());
        if (guild.splash) infoEmbed.setImage(guild.splashURL({size: 2048}));
        await msg.embed(infoEmbed);
    }
};