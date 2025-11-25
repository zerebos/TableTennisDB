// src/commands/profile/index.ts
import {SlashCommandBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType} from "discord.js";
import {createCommand} from "../../types";
import {handleView} from "./view";
import {handleEditWithCollectors} from "./edit";

export default createCommand({
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Share or edit your table tennis profile!")
        .addSubcommand(cmd => cmd.setName("view").setDescription("View and share your profile!")
                                .addUserOption(option =>
                                option.setName("user")
                                    .setDescription("Whose profile to view?")
                                    .setRequired(false)))
        .addSubcommand(cmd => cmd.setName("edit").setDescription("Modify or setup your profile!"))
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "view":
                await handleView(interaction);
                break;
            case "edit":
                await handleEditWithCollectors(interaction);
                break;
            default:
                await interaction.reply({
                    content: "❌ Unknown subcommand",
                    ephemeral: true
                });
        }
    }
});
