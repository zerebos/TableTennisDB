import {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, StringSelectMenuInteraction, ApplicationIntegrationType, InteractionContextType} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get help with TableTennisDB commands and features")
        .addStringOption(option =>
            option.setName("command")
                .setDescription("Get help for a specific command")
                .setRequired(false)
                .setAutocomplete(true))
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

    async execute(interaction: ChatInputCommandInteraction) {
        const specificCommand = interaction.options.getString("command");

        if (specificCommand) {
            await this.showCommandHelp(interaction, specificCommand);
        }
 else {
            await this.showMainHelp(interaction);
        }
    },

    async showMainHelp(interaction: ChatInputCommandInteraction) {
        const helpEmbed = new EmbedBuilder()
            .setTitle("🏓 TableTennisDB Help")
            .setColor("Blue")
            .setDescription("A comprehensive table tennis bot for rankings, equipment, and profiles")
            .addFields(
                {
                    name: "🆕 What's New",
                    value: "• User installation now available!\n• Use commands in DMs and across servers\n• Cross-server profile sync",
                    inline: false
                },
                {
                    name: "📊 Player & Rankings",
                    value: "`/player <name>` - Look up player rankings\n`/rankings` - View current ITTF rankings\n`/tournament <name>` - Tournament information",
                    inline: true
                },
                {
                    name: "🏓 Equipment",
                    value: "`/rubber <name>` - Rubber specifications\n`/blade <name>` - Blade specifications\n`/balls <name>` - Ball information",
                    inline: true
                },
                {
                    name: "👤 Profile",
                    value: "`/profile view` - View profiles\n`/profile edit` - Edit your profile\n`/profile view @user` - View another user",
                    inline: true
                },
                {
                    name: "ℹ️ Information",
                    value: "`/about` - Bot information\n`/help <command>` - Detailed command help\n`/ping` - Bot status",
                    inline: true
                },
                {
                    name: "💡 Pro Tips",
                    value: "• Add bot to your account for DM access\n• Use autocomplete for faster searches\n• Profiles work across all servers",
                    inline: false
                }
            )
            .setFooter({text: "Use the dropdown below for detailed command help"});

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("help-command-select")
            .setPlaceholder("Select a command for detailed help...")
            .addOptions([
                {
                    label: "Player Commands",
                    description: "Rankings and player information",
                    value: "player-commands",
                    emoji: "📊"
                },
                {
                    label: "Equipment Commands",
                    description: "Rubber, blade, and ball specifications",
                    value: "equipment-commands",
                    emoji: "🏓"
                },
                {
                    label: "Profile Commands",
                    description: "Manage your table tennis profile",
                    value: "profile-commands",
                    emoji: "👤"
                },
                {
                    label: "Getting Started",
                    description: "First time using the bot?",
                    value: "getting-started",
                    emoji: "🚀"
                }
            ]);

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Add to Account")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/oauth2/authorize?client_id=${process.env.BOT_CLIENT_ID}&integration_type=1`)
                    .setEmoji("📱"),
                new ButtonBuilder()
                    .setLabel("Support Server")
                    .setStyle(ButtonStyle.Link)
                    .setURL(process.env.SUPPORT_SERVER_URL!)
                    .setEmoji("💬"),
                new ButtonBuilder()
                    .setLabel("GitHub")
                    .setStyle(ButtonStyle.Link)
                    .setURL(process.env.GITHUB_URL!)
                    .setEmoji("⚙️")
            );

        await interaction.reply({
            embeds: [helpEmbed],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
                buttons
            ]
        });
    },

    async showCommandHelp(interaction: ChatInputCommandInteraction, commandName: string) {
        const commandHelp = this.getCommandDetails(commandName);

        if (!commandHelp) {
            await interaction.reply({
                content: `❌ Command \`${commandName}\` not found. Use \`/help\` to see all commands.`,
                ephemeral: true
            });
            return;
        }

        const helpEmbed = new EmbedBuilder()
            .setTitle(`Help: /${commandName}`)
            .setColor("Blue")
            .setDescription(commandHelp.description)
            .addFields(
                {name: "Usage", value: commandHelp.usage, inline: false},
                {name: "Examples", value: commandHelp.examples, inline: false}
            );

        if (commandHelp.tips) {
            helpEmbed.addFields({name: "💡 Tips", value: commandHelp.tips, inline: false});
        }

        await interaction.reply({embeds: [helpEmbed]});
    },

    async selectMenu(interaction: StringSelectMenuInteraction) {
        const selected = interaction.values[0];
        const helpContent = this.getCategoryHelp(selected);

        const embed = new EmbedBuilder()
            .setTitle(helpContent.title)
            .setColor("Blue")
            .setDescription(helpContent.description);

        if (helpContent.commands) {
            for (const cmd of helpContent.commands) {
                embed.addFields({
                    name: `/${cmd.name}`,
                    value: `${cmd.description}\n\`${cmd.usage}\``,
                    inline: false
                });
            }
        }

        if (helpContent.tips) {
            embed.addFields({name: "💡 Tips", value: helpContent.tips, inline: false});
        }

        await interaction.update({embeds: [embed]});
    },

    getCommandDetails(commandName: string) {
        const commands = {
            profile: {
                description: "Manage your table tennis profile with gear, skills, and playstyle information.",
                usage: "`/profile view` - View your profile\n`/profile view @user` - View another user's profile\n`/profile edit` - Edit your profile",
                examples: "`/profile view`\n`/profile view @friend`\n`/profile edit`",
                tips: "• Profiles sync across all servers\n• Use the edit buttons to modify specific sections\n• Profiles are visible to other users"
            },
            player: {
                description: "Look up current ITTF rankings and player information.",
                usage: "`/player <name>` - Search for a player by name",
                examples: "`/player Fan Zhendong`\n`/player Ma Long`\n`/player Chen Meng`",
                tips: "• Use autocomplete for faster searches\n• Shows current ranking and recent results\n• Includes both men's and women's rankings"
            },
            rubber: {
                description: "Look up detailed rubber specifications and reviews.",
                usage: "`/rubber <name>` - Search for rubber by name",
                examples: "`/rubber Tenergy 05`\n`/rubber Hurricane 3`\n`/rubber Dignics 09C`",
                tips: "• Includes speed, spin, and control ratings\n• Shows price information when available\n• Use autocomplete for exact matches"
            }
            // Add more commands...
        };

        return commands[commandName as keyof typeof commands];
    },

    getCategoryHelp(category: string) {
        const categories = {
            "player-commands": {
                title: "📊 Player & Rankings Commands",
                description: "Look up player rankings, tournament results, and ITTF information.",
                commands: [
                    {
                        name: "player <name>",
                        description: "Look up current ITTF rankings for a player",
                        usage: "/player Fan Zhendong"
                    },
                    {
                        name: "rankings",
                        description: "View current top ITTF rankings",
                        usage: "/rankings"
                    },
                    {
                        name: "tournament <name>",
                        description: "Get information about tournaments",
                        usage: "/tournament World Championships"
                    }
                ],
                tips: "• Use exact player names for best results\n• Rankings are updated regularly from ITTF\n• Tournament data includes recent results"
            },
            "equipment-commands": {
                title: "🏓 Equipment Commands",
                description: "Look up specifications for rubbers, blades, balls, and other equipment.",
                commands: [
                    {
                        name: "rubber <name>",
                        description: "Get detailed rubber specifications",
                        usage: "/rubber Tenergy 05"
                    },
                    {
                        name: "blade <name>",
                        description: "Look up blade specifications",
                        usage: "/blade Viscaria"
                    },
                    {
                        name: "balls <name>",
                        description: "Get information about table tennis balls",
                        usage: "/balls DHS DJ40+"
                    }
                ],
                tips: "• Use autocomplete for accurate names\n• Includes speed, spin, control ratings\n• Price information when available"
            },
            "profile-commands": {
                title: "👤 Profile Commands",
                description: "Create and manage your table tennis profile.",
                commands: [
                    {
                        name: "profile view",
                        description: "View your or another user's profile",
                        usage: "/profile view @user"
                    },
                    {
                        name: "profile edit",
                        description: "Edit your table tennis profile",
                        usage: "/profile edit"
                    }
                ],
                tips: "• Profiles sync across all servers\n• Include your gear, playstyle, and skills\n• Visible to other users for networking"
            },
            "getting-started": {
                title: "🚀 Getting Started",
                description: "New to TableTennisDB? Here's how to get the most out of the bot.",
                tips: "**First Steps:**\n• Use `/profile edit` to set up your profile\n• Try `/player Ma Long` to see player lookups\n• Use `/rubber Tenergy 05` to explore equipment\n\n**Pro Features:**\n• Add bot to your account for DM access\n• Profiles work across all servers\n• Use autocomplete for faster searches\n\n**Need Help?**\n• Join our support server\n• Check `/about` for bot information\n• Use `/help <command>` for specific help"
            }
        };

        return categories[category as keyof typeof categories];
    },

    async autocomplete(interaction: any) {
        const focusedValue = interaction.options.getFocused();
        const commands = ["profile", "player", "rubber", "blade", "balls", "rankings", "tournament", "about", "ping"];

        const filtered = commands.filter(choice =>
            choice.startsWith(focusedValue.toLowerCase())
        );

        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({name: choice, value: choice}))
        );
    }
};