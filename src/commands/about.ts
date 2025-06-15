const childProcess = require("child_process");
const {promisify} = require("util");
const exec = promisify(childProcess.exec);
const path = require("path");
const Keyv = require("keyv");
// TODO: Create a better way to access the sqlite db without relative pathing
const stats = new Keyv("sqlite://" + path.resolve(__dirname, "..", "..", "settings.sqlite3"), {namespace: "stats"});

const {SlashCommandBuilder, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js");


const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${process.env.BOT_CLIENT_ID}&permissions=${process.env.BOT_PERMISSIONS || "0"}&scope=bot%20applications.commands`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("about")
        .setDescription("Gives some information about the bot"),

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async execute(interaction) {
        await interaction.deferReply();
        const aboutEmbed = new EmbedBuilder();

        aboutEmbed.setColor("Blue");
        aboutEmbed.setAuthor({name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL()});
        // TODO: I think it's overkill but re-evaluate later
        // aboutEmbed.setImage(interaction.client.user.bannerURL());

        const owner = await interaction.client.users.fetch(process.env.BOT_OWNER_ID);
        if (owner) aboutEmbed.setFooter({text: `Created by @${owner.username}`, iconURL: owner.displayAvatarURL()});
        aboutEmbed.setTimestamp(interaction.client.readyAt);


        const addField = (n,v,i) => aboutEmbed.addFields({name: n, value: v, inline: i ?? false});

        if (process.env.BOT_DESCRIPTION) addField(`About`, process.env.BOT_DESCRIPTION);

        // git show -s -3 --format="%s (%cr)"
        try {
            const gitExists = await exec("git status");
            if (gitExists.stderr) throw new Error(gitExists.stderr);
            const gitInfo = await exec(`git show -s -3 --format="%s (%cr)"`);
            if (gitInfo.stderr) throw new Error(gitExists.stderr);
            addField(`Latest Changes`, gitInfo.stdout.trim()); // To add bullets .split("\n").map(l => `- ${l}`).join("\n")
        }
        catch (err) {
            console.error(err);
        }


        const links = [];
        if (process.env.SUPPORT_SERVER_URL) links.push({label: "Support Server", url: process.env.SUPPORT_SERVER_URL});
        if (process.env.GITHUB_URL) links.push({label: "GitHub", url: process.env.GITHUB_URL});
        if (process.env.TOPGG_ID) links.push({label: "Top.gg", url: `https://top.gg/bot/${process.env.TOPGG_ID}`});

        // Round up to an even number of fields for a row
        // 3 = max fields per row
        const modulo = links.length % 3;
        const maxFields = modulo ? links.length + (3 - modulo) : links.length;
        for (let l = 0; l < maxFields; l++) {
            const fieldTitle = l % 3 === 0 ? "Links" : "​";
            const fieldValue = l < links.length ? `[${links[l].label}](${links[l].url})` : "​";
            addField(fieldTitle, fieldValue, true);
        }


        let servingText = `${interaction.client.guilds.cache.size.toLocaleString()} Servers\n`;
        servingText += `${interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString()} Users`;
        addField("Serving", servingText, true);

        const textChannelCount = interaction.client.channels.cache.filter(c => c.type === ChannelType.GuildText).size.toLocaleString();
        const voiceChannelCount = interaction.client.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size.toLocaleString();
        let channelText = `Text: ${textChannelCount}\n`;
        channelText += `Voice: ${voiceChannelCount}`;
        addField("Channels", channelText, true);

        const now = Date.now();
        const usage = process.cpuUsage(interaction.client.cpuUsage);
        const result = 100 * ((usage.user + usage.system) / ((now - interaction.client.readyAt) * 1000));
        const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        let processText = `${memUsage.toFixed(2)} MB\n`;
        processText += `${result.toFixed(2)}% CPU`;
        addField("Process", processText, true);


        addField(`Emojis`, interaction.client.emojis.cache.size.toLocaleString(), true);

        const cumulative = {};
        const values = interaction.client.guilds.cache.values();
        for (const guild of values) {
            const guildStats = await stats.get(guild.id);
            if (!guildStats || !guildStats.commands) continue;
            for (const commandName in guildStats.commands) {
                if (!cumulative[commandName]) cumulative[commandName] = guildStats.commands[commandName];
                else cumulative[commandName] = cumulative[commandName] + guildStats.commands[commandName];
            }
        }
        
        const dmStats = await stats.get(interaction.client.user.id);
        if (dmStats && dmStats.commands) {
            for (const commandName in dmStats.commands) {
                if (!cumulative[commandName]) cumulative[commandName] = dmStats.commands[commandName];
                else cumulative[commandName] = cumulative[commandName] + dmStats.commands[commandName];
            }
        }

        const commandsRun = Object.values(cumulative).reduce((a, b) => a + b, 0).toLocaleString();
        addField(`Commands Run`, commandsRun, true);

        addField(`Uptime`, humanReadableUptime(now - interaction.client.readyAt), true);
        await interaction.editReply({embeds: [aboutEmbed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(`Invite ${interaction.client.user.username}`).setStyle(ButtonStyle.Link).setURL(inviteLink))]});
    },
};

const msInSecond = 1000;
const msInMinute = msInSecond * 60;
const msInHour = msInMinute * 60;
const msInDay = msInHour * 24;

function humanReadableUptime(uptime) {
    let remainder = uptime;
    const days = Math.floor(uptime / msInDay);
    remainder = remainder - (days * msInDay);
    const hours = Math.floor(remainder / msInHour);
    remainder = remainder - (hours * msInHour);
    const minutes = Math.floor(remainder / msInMinute);
    remainder = remainder - (minutes * msInMinute);
    const seconds = Math.floor(remainder / msInSecond);

    let humanReadable = `${seconds}s`;
    if (minutes) humanReadable = `${minutes}m ${humanReadable}`;
    if (hours) humanReadable = `${hours}h ${humanReadable}`;
    if (days) humanReadable = `${days}d ${humanReadable}`;
    return humanReadable;
}