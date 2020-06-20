const {MessageEmbed} = require("discord.js");
const {Command, util} = require("discord.js-commando");

// Code adapted from Discord.js-Commando's version
module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "help",
            group: "botadmin",
            memberName: "help",
            aliases: ["commands"],
            description: "Displays a list of available commands, or detailed information for a specified command.",
            details: `The command may be part of a command name or a whole command name. If it isn't specified, all available commands will be listed.`,
            examples: ["help", "help prefix"],
            guarded: true,
            args: [
                {
                    key: "command",
                    prompt: "Which command would you like to view the help for?",
                    type: "string",
                    defaultValue: ""
                }
            ]
        });
    }

    async _showDefaultHelp(msg, showAll) {
        const groups = this.client.registry.groups;
        const generalUsage = Command.usage("command", msg.guild ? msg.guild.commandPrefix : null, this.client.user);
        const description = [
            `To run a command in ${msg.guild ? msg.guild.name : "any server"}, use ${generalUsage}.`,
            `To run a command in a DM, simply use ${Command.usage("command", null, null)} with no prefix.\n`,
            `Use ${this.usage("<keyword>", msg.guild ? msg.guild.commandPrefix : null, null)} to view detailed information about a command or group.`,
            `Use ${this.usage("all", msg.guild ? msg.guild.commandPrefix : null, null)} to view a list of _all_ commands, not just available ones.`
        ];

        const helpEmbed = new MessageEmbed();
        //__**${showAll ? "All commands" : `Available commands in ${msg.guild || "this DM"}`}**__
        helpEmbed.setAuthor(`${this.client.user.username} Help`, this.client.user.displayAvatarURL());
        helpEmbed.setDescription(description.join("\n"));

        const availableGroups = groups.filter(grp => grp.commands.some(cmd => !cmd.hidden && (showAll || cmd.isUsable(msg))));
        availableGroups.each(group => {
            const availableCommands = group.commands.filter(cmd => !cmd.hidden && (showAll || cmd.isUsable(msg)));
            const list = availableCommands.map(command => `\`${command.name}\``).join(", ");
            helpEmbed.addField(group.name, list, true);
        });

        await msg.embed(helpEmbed);
    }

    async _showCommandHelp(msg, command) {
        const helpEmbed = new MessageEmbed();
        helpEmbed.setTitle(command.name);
        helpEmbed.setDescription(command.description);
        helpEmbed.addField("Guilds Only", command.guildOnly ? "Yes" : "No", true);
        helpEmbed.addField("NSFW Only", command.nsfw ? "Yes" : "No", true);
        if (command.aliases && command.aliases.length) helpEmbed.addField("Aliases", command.aliases.map(e => `\`${e}\``).join(", "), true);
        if (command.format) helpEmbed.addField("Usage", msg.anyUsage(`${command.name}${command.format ? ` ${command.format}` : ""}`, undefined, null));
        if (command.details) helpEmbed.addField("More Info", command.details);
        if (command.examples && command.examples.length) helpEmbed.addField("Examples", command.examples.map(e => `\`${e}\``).join(", "));
        await msg.embed(helpEmbed);
    }

    async _showGroupHelp(msg, group) {
        const commands = group.commands.filter(cmd => !cmd.hidden).map(command => `\`${command.name}\` - ${command.description}`).join("\n");

        const helpEmbed = new MessageEmbed();
        helpEmbed.setTitle(`${group.name} Help`);
        helpEmbed.setDescription(`Use ${this.usage("<command>", msg.guild ? msg.guild.commandPrefix : null, null)} to view detailed information about a command`);
        helpEmbed.addField("Commands", commands);
        await msg.embed(helpEmbed);
    }

    async run(msg, args) {
        const isDM = msg.channel.type === "dm";
        const showAll = args.command && args.command.toLowerCase() === "all";

        // If it's the default or showing all
        if (!args.command || showAll) return await this._showDefaultHelp(msg, showAll);

        const commands = this.client.registry.findCommands(args.command, false, msg);
        const groups = this.client.registry.findGroups(args.command, false);
        if (commands.length === 1) return await this._showCommandHelp(msg, commands[0]);
        else if (groups.length === 1 && commands.length === 0) return await this._showGroupHelp(msg, groups[0]);
        else if (commands.length > 15 || groups.length > 15) return msg.failure("Multiple commands or groups found. Please be more specific.");
        else if (commands.length > 1 || groups.length > 1) return msg.say(util.disambiguation(commands.concat(groups), "commands or groups"));
        return await msg.failure(`Unable to identify command or group. Use ${msg.usage(null, isDM ? null : undefined, isDM ? null : undefined)} to view all commands.`);      
    }
};