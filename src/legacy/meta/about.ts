const {MessageEmbed, escapeMarkdown} = require("discord.js");
const {Command} = require("discord.js-commando");
const childProcess = require("child_process");
const {promisify} = require("util");
const exec = promisify(childProcess.exec);

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "about",
            group: "meta",
            memberName: "about",
            description: "Displays a bunch of info about the bot."
        });
    }

    async run(msg) {
        const bot = this.client;
        const aboutEmbed = new MessageEmbed();
        aboutEmbed.setAuthor(bot.user.tag, bot.user.displayAvatarURL());
        aboutEmbed.setFooter("Made with discord.js", "https://i.imgur.com/jt10lJI.png");
        aboutEmbed.setTimestamp(bot.readyTimestamp);

        if (bot.description) aboutEmbed.addField(`About ${bot.user.username}`, bot.description);

        //git show -s -3 --format="%s (%cr)"
        try {
            const gitExists = await exec("git status");
            if (gitExists.stderr) throw new Error(gitExists.stderr);
            const gitInfo = await exec(`git show -s -3 --format="%s (%cr)"`);
            if (gitInfo.stderr) throw new Error(gitExists.stderr);
            aboutEmbed.addField(`Latest Changes`, gitInfo.stdout.trim());
        }
        catch (err) {
            // Git not installed or something, should probably log it.
            this.client.emit("error", err);
        }

        const owners = this.client.owners;
        const ownerList = owners ? owners.map((usr, i) => {
            const or = i === owners.length - 1 && owners.length > 1 ? ", " : "";
            return `${or}${escapeMarkdown(usr.username)}#${usr.discriminator}`;
        }).join(owners.length > 2 ? ", " : " ") : "";
        if (ownerList) aboutEmbed.addField(`Created By`, ownerList, true);
        if (this.client.options.invite) aboutEmbed.addField(`Support Server`, `[Click Here!](${this.client.options.invite})`, true);
        if (this.client.options.github) aboutEmbed.addField(`GitHub`, `[Click Here!](${this.client.options.github})`, true);

        const memberCount = bot.guilds.cache.map(g => g.members.cache.size).reduce((a, b) => a + b, 0).toLocaleString();
        const servingText = `${bot.guilds.cache.size.toLocaleString()} Servers\n${memberCount} Users`;
        aboutEmbed.addField("Serving", servingText, true);

        const textChannelCount = bot.guilds.cache.map(g => g.channels.cache.filter(c => c.type === "text").size).reduce((a, b) => a + b, 0).toLocaleString();
        const voiceChannelCount = bot.guilds.cache.map(g => g.channels.cache.filter(c => c.type === "voice").size).reduce((a, b) => a + b, 0).toLocaleString();
        let channelText = `Text: ${textChannelCount}\n`;
        channelText += `Voice: ${voiceChannelCount}`;
        aboutEmbed.addField("Channels", channelText, true);

        const now = Date.now();
        const usage = process.cpuUsage(bot.cpuUsage);
        const result = 100 * ((usage.user + usage.system) / ((now - bot.readyAt) * 1000));
        const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        let processText = `${memUsage.toFixed(2)} MB\n`;
        processText += `${result.toFixed(2)}% CPU`;
        aboutEmbed.addField("Process", processText, true);


        aboutEmbed.addField(`Emojis`, bot.emojis.cache.size.toLocaleString(), true);

        const cumulative = {};
        const guildStats = this.client.guilds.cache.map(g => g.settings.get("commandstats", {}));
        for (let g = 0; g < guildStats.length; g++) {
            const single = guildStats[g];
            for (const key in single) {
                if (!cumulative[key]) cumulative[key] = single[key];
                else cumulative[key] = cumulative[key] + single[key];
            }
        }
        const commandsRun = Object.values(cumulative).reduce((a, b) => a + b, 0).toLocaleString();
        aboutEmbed.addField(`Commands Run`, commandsRun, true);

        aboutEmbed.addField(`Uptime`, humanReadableUptime(bot.uptime), true);
        await msg.embed(aboutEmbed);
    }
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