const {Command} = require("discord.js-commando");
const {Constants} = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "joinleave",
            group: "moderation",
            memberName: "joinleave",
            description: "Toggles having a join/leave log of users.",
            format: `[<channel>|"enable"|"disable"|"toggle"|"status"]`,
            guildOnly: true,
            userPermissions: ["KICK_MEMBERS"],
            args: [
                {
                    key: "channel",
                    prompt: "Where should this info be logged?",
                    type: "channel|string",
                    defaultValue: "status"
                }
            ],
            examples: ["joinleave", "joinleave toggle", "joinleave #welcome"]
        });
    }

    async onGuildMemberAdd(member) {
        const state = await member.guild.settings.get("joinleave", {enabled: false});
        if (!state.enabled || !state.channel) return;
        const channel = member.guild.channels.cache.get(state.channel);
        if (!channel) return;
        await channel.send({embed: {color: Constants.Colors.SUCCESS, description: `<@!${member.user.id}> has joined the server!`}});
    }

    async onGuildMemberRemove(member) {
        const state = await member.guild.settings.get("joinleave", {enabled: false});
        if (!state.enabled || !state.channel) return;
        const channel = member.guild.channels.cache.get(state.channel);
        if (!channel) return;
        await channel.send({embed: {color: Constants.Colors.FAILURE, description: `**${member.user.tag} (${member.user.id})** has left the server!`}});
    }
    
    async run(msg, {channel}) {
        const state = await msg.guild.settings.get("joinleave", {enabled: false});
        if (typeof(channel) === "string") {
            const shouldEnable = channel === "enable";
            const shouldDisable = channel === "disable";
            if (channel === "status") return await msg.info(`The joinleave log is currently ${state.enabled ? "enabled" : "disabled"}. ${state.channel ? `It is set to log in <#${state.channel}>.` : ""}`);
            if (!shouldEnable && !shouldDisable && channel !== "toggle") return await msg.failure(`Did not understand your input. Try ${msg.anyUsage("help joinleave", undefined, null)} for help.`);
            if ((state.enabled && shouldEnable) || (!state.enabled && shouldDisable)) return await msg.failure(`The joinleave log is already ${state.enabled ? "enabled" : "disabled"}.`);
            state.enabled = !state.enabled;
            await msg.success(`The joinleave log is now ${state.enabled ? "enabled" : "disabled"}.`);
            if (!state.channel && state.enabled) await msg.warn(`No channel is set, please set a channel using ${msg.anyUsage("joinleave #channel", undefined, null)}.`);
            await msg.guild.settings.set("joinleave", state);
            return;
        }

        if (channel.id == state.channel) return await msg.failure(`<#${channel.id}> is already set.`); // Check if setting same channel
        if (channel.type !== "text") return await msg.failure(`Can only log in text channels.`); // Check for text channel
        if (!channel.permissionsFor(this.client.user).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) return await msg.failure(`${this.client.user.username} does not have permissions to read/send messages in <#${channel.id}>.`); // Permissions check
        state.channel = channel.id;
        await msg.success(`The joinleave log is set to <#${channel.id}>.`);
        if (!state.enabled) await msg.warn(`Joinleave log is disabled, please enable using ${msg.anyUsage("joinleave enable", undefined, null)}.`);
        await msg.guild.settings.set("joinleave", state);
    }
};