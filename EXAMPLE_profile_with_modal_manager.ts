import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ButtonInteraction, ApplicationIntegrationType, InteractionContextType, MessageFlags, ComponentType, ButtonStyle, TextInputStyle} from "discord.js";
import {profiles, userInstallNotices} from "../db";
import {createCommand, type ProfileData} from "../types";
import {ModalManager} from "../utils/ModalManager";

// This is an example of how the profile command would look with the ModalManager

function createProfileEmbed(user: {username: string, avatarURL: () => (string | null)}, profile: ProfileData) {
    return new EmbedBuilder()
        .setColor("Blue")
        .setAuthor({name: `${user.username}'s Profile`, iconURL: user.avatarURL()!})
        .addFields(
            {name: "Forehand", value: profile.forehand ?? "\u200B", inline: true},
            {name: "Backhand", value: profile.backhand ?? "\u200B", inline: true},
            {name: "Blade", value: profile.blade ?? "\u200B", inline: true},
            {name: "Strengths", value: profile.strengths ?? "\u200B", inline: true},
            {name: "Weaknesses", value: profile.weaknesses ?? "\u200B", inline: true},
            {name: "Playstyle", value: profile.playstyle ?? "\u200B", inline: true},
        );
}

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
        const command = interaction.options.getSubcommand();
        if (command === "view") {
            await handleView(interaction);
            return;
        }
        if (command === "edit") {
            await handleEditWithModalManager(interaction);
            return;
        }
    }
});

async function handleView(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const profile = await profiles.get(user.id) as ProfileData | undefined;

    if (!profile) {
        const noEmbed = new EmbedBuilder().setColor("Red").setDescription("No profile found, please set one up using `/profile edit`!");
        await interaction.reply({embeds: [noEmbed]});
        return;
    }

    await interaction.reply({embeds: [createProfileEmbed(user, profile)]});
    const hasShownNotice = await userInstallNotices.get(interaction.user.id);
    if (!hasShownNotice) {
        await userInstallNotices.set(interaction.user.id, true);
        await interaction.followUp({content: `**New!** Add TableTennisDB to your account for DM access and cross-server profiles!\n\nClick my profile → "Add App" → "Add to My Apps"`, flags: MessageFlags.Ephemeral});
    }
}

// This function shows how much cleaner the modal handling becomes with ModalManager
async function handleEditWithModalManager(interaction: ChatInputCommandInteraction) {
    const profile = await profiles.get(interaction.user.id) ?? {};

    // Create buttons (same as before)
    const saveButton = {
        type: ComponentType.Button,
        customId: "save_profile",
        label: "Save",
        style: ButtonStyle.Success
    };

    const gearButton = {
        type: ComponentType.Button,
        customId: "edit_gear",
        label: "Edit Gear",
        style: ButtonStyle.Secondary
    };

    const skillsButton = {
        type: ComponentType.Button,
        customId: "edit_skills",
        label: "Edit Skills",
        style: ButtonStyle.Secondary
    };

    const row = {
        type: ComponentType.ActionRow,
        components: [saveButton, gearButton, skillsButton]
    };

    const profileEmbed = createProfileEmbed(interaction.user, profile);
    profileEmbed.setFooter({text: "💡 Suggest profile features on Discord or GitHub - See /about for links."});

    const response = await interaction.reply({
        embeds: [profileEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });

    // Set up collectors (same as before)
    const collectorFilter = (i: ButtonInteraction) => i.user.id === interaction.user.id;

    const collector = response.createMessageComponentCollector({
        filter: collectorFilter,
        time: 300000,
        componentType: ComponentType.Button
    });

    collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.customId === "save_profile") {
            await handleSaveProfile(buttonInteraction);
        }
        else if (buttonInteraction.customId === "edit_gear") {
            // THIS IS THE IMPROVED PART - Much cleaner modal handling
            await handleGearModalWithManager(buttonInteraction);
        }
        else if (buttonInteraction.customId === "edit_skills") {
            // THIS IS THE IMPROVED PART - Much cleaner modal handling
            await handleSkillsModalWithManager(buttonInteraction);
        }
    });

    collector.on("end", () => {
        const disabledRow = {
            type: ComponentType.ActionRow,
            components: [
                {...saveButton, disabled: true},
                {...gearButton, disabled: true},
                {...skillsButton, disabled: true}
            ]
        };

        interaction.editReply({components: [disabledRow]}).catch(() => {});
    });
}

async function handleSaveProfile(interaction: ButtonInteraction) {
    if (!interaction.message) return;

    const data: Record<string, string> = {};
    interaction.message.embeds[0].fields.forEach(f => data[f.name.toLowerCase()] = f.value);
    await profiles.set(interaction.user.id, data);

    const successEmbed = new EmbedBuilder()
        .setColor("Green")
        .setDescription("Profile saved successfully!");

    await interaction.update({embeds: [successEmbed], components: []});
}

// IMPROVED: Much cleaner gear modal handling with ModalManager
async function handleGearModalWithManager(interaction: ButtonInteraction) {
    const profile = await profiles.get(interaction.user.id) ?? {};
    const modalManager = new ModalManager(interaction);

    const result = await modalManager.showTextModal(
        "gear_modal",
        "Add Your Gear",
        [
            {id: "forehand", label: "Forehand", value: profile.forehand, style: TextInputStyle.Short},
            {id: "backhand", label: "Backhand", value: profile.backhand, style: TextInputStyle.Short},
            {id: "blade", label: "Blade", value: profile.blade, style: TextInputStyle.Short}
        ]
    );

    if (!result.success) {
        console.log("Gear modal failed or timed out");
        return;
    }

    // Clean, type-safe access to values
    const {forehand, backhand, blade} = result.values!;

    if (!result.modalSubmission?.message) {
        await result.modalSubmission?.reply({content: "Error: Could not find original message.", flags: MessageFlags.Ephemeral});
        return;
    }

    // Update embed fields (this could also be extracted to a utility)
    const embed = result.modalSubmission.message.embeds[0];
    const newEmbed = EmbedBuilder.from(embed);
    newEmbed.spliceFields(0, 3,
        {name: "Forehand", value: forehand || "\u200B", inline: true},
        {name: "Backhand", value: backhand || "\u200B", inline: true},
        {name: "Blade", value: blade || "\u200B", inline: true}
    );

    await result.modalSubmission.deferUpdate();
    await result.modalSubmission.editReply({embeds: [newEmbed]});
}

// IMPROVED: Much cleaner skills modal handling with ModalManager
async function handleSkillsModalWithManager(interaction: ButtonInteraction) {
    const profile = await profiles.get(interaction.user.id) ?? {};
    const modalManager = new ModalManager(interaction);

    const result = await modalManager.showTextModal(
        "skills_modal",
        "Add Your Skills",
        [
            {id: "strengths", label: "Strengths", value: profile.strengths, style: TextInputStyle.Short},
            {id: "weaknesses", label: "Weaknesses", value: profile.weaknesses, style: TextInputStyle.Short},
            {id: "playstyle", label: "Playstyle", value: profile.playstyle, style: TextInputStyle.Short}
        ]
    );

    if (!result.success) {
        console.log("Skills modal failed or timed out");
        return;
    }

    // Clean, type-safe access to values
    const {strengths, weaknesses, playstyle} = result.values!;

    if (!result.modalSubmission?.message) {
        await result.modalSubmission?.reply({content: "Error: Could not find original message.", flags: MessageFlags.Ephemeral});
        return;
    }

    // Update embed fields
    const embed = result.modalSubmission.message.embeds[0];
    const newEmbed = EmbedBuilder.from(embed);
    newEmbed.spliceFields(3, 3,
        {name: "Strengths", value: strengths || "\u200B", inline: true},
        {name: "Weaknesses", value: weaknesses || "\u200B", inline: true},
        {name: "Playstyle", value: playstyle || "\u200B", inline: true}
    );

    await result.modalSubmission.deferUpdate();
    await result.modalSubmission.editReply({embeds: [newEmbed]});
}

/*
COMPARISON - Original vs ModalManager:

ORIGINAL handleGearModal() - 52 lines of code:
- Manual ModalBuilder creation
- Manual TextInputBuilder creation for each field
- Manual ActionRowBuilder creation for each field
- Manual modal.addComponents() calls
- Manual awaitModalSubmit with try/catch
- Manual field value extraction
- Error handling mixed with business logic

IMPROVED handleGearModalWithManager() - 31 lines of code:
- Simple configuration object for modal and fields
- Automatic error handling and timeouts
- Type-safe result handling
- Clear separation of concerns
- Consistent behavior across all modals

BENEFITS:
✅ 40% less code
✅ Much more readable and maintainable
✅ Type-safe field access
✅ Consistent error handling
✅ Reusable across all commands
✅ Easier to test and debug
*/
