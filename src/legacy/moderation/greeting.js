const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "greeting",
            group: "moderation",
            memberName: "greeting",
            description: "Toggles having a join/leave log of users.",
            details: "Can be called with a channel mention like #channel, or using any of the subcommands. If using `set` without an argument, bot will prompt you for the message.",
            format: `[<channel>|"enable"|"disable"|"toggle"|"status"|"set"]`,
            guildOnly: true,
            userPermissions: ["KICK_MEMBERS"],
            args: [
                {
                    key: "channel",
                    prompt: "Where should the user be greeted?",
                    type: "channel|string",
                    defaultValue: "status"
                }
            ],
            examples: ["greeting", "greeting toggle", "greeting #welcome", "greeting set Hello there {{user}}!"]
        });
    }

    async onGuildMemberAdd(member) {
        const state = await member.guild.settings.get("greeting", {enabled: false});
        if (!state.enabled || !state.channel) return;
        const channel = member.guild.channels.cache.get(state.channel);
        if (!channel) return;
        const message = state.message || `Welcome to the server {{user}}!`;
        await channel.send(message.format({user: `<@!${member.user.id}>`}));
    }
    
    async run(msg, {channel}) {
        const state = await msg.guild.settings.get("greeting", {enabled: false});
        if (typeof(channel) === "string") {
            channel = channel.split(" ");
            const cmd = channel[0];
            const shouldEnable = cmd === "enable";
            const shouldDisable = cmd === "disable";
            if (cmd === "set") {
                let message = channel.slice(1).join(" ");
                if (channel.length === 1) {
                    await msg.say(`How should the user be greeted? (Use \`{{user}}\` as a placeholder for the user.)`);
                    const response = (await msg.channel.awaitMessages(m => m.author.id === msg.author.id, {max: 1, time: 10000})).first();
                    if (!response) return await msg.failure("Greeting setup has timed out.");
                    message = response;
                }
                state.message = message;
                await msg.success("Successfully set the greeting message.");
                await msg.guild.settings.set("greeting", state);
                return;
            }
            if (cmd === "status") return await msg.info(`The greeting is currently ${state.enabled ? "enabled" : "disabled"}. ${state.channel ? `It is set to appear in <#${state.channel}>.` : ""} ${state.message ? `With the message: \`${state.message}\`` : ""}`);
            if (!shouldEnable && !shouldDisable && cmd !== "toggle") return await msg.failure(`Did not understand your input. Try ${msg.anyUsage("help greeting", undefined, null)} for help.`);
            if ((state.enabled && shouldEnable) || (!state.enabled && shouldDisable)) return await msg.failure(`The greeting is already ${state.enabled ? "enabled" : "disabled"}.`);
            state.enabled = !state.enabled;
            await msg.success(`The greeting is now ${state.enabled ? "enabled" : "disabled"}.`);
            if (!state.channel && state.enabled) await msg.warn(`No channel is set, please set a channel using ${msg.anyUsage("greeting #channel", undefined, null)}.`);
            await msg.guild.settings.set("greeting", state);
            return;
        }

        if (channel.id == state.channel) return await msg.failure(`<#${channel.id}> is already set.`); // Check if setting same channel
        if (channel.type !== "text") return await msg.failure(`Can only log in text channels.`); // Check for text channel
        if (!channel.permissionsFor(this.client.user).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) return await msg.failure(`${this.client.user.username} does not have permissions to read/send messages in <#${channel.id}>.`); // Permissions check
        state.channel = channel.id;
        await msg.success(`The greeting is set to appear in <#${channel.id}>.`);
        if (!state.enabled) await msg.warn(`Greeting disabled, please enable using ${msg.anyUsage("greeting enable", undefined, null)}.`);
        await msg.guild.settings.set("greeting", state);
    }
};