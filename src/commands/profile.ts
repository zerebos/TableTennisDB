import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ButtonInteraction, ApplicationIntegrationType, InteractionContextType, MessageFlags, ComponentType, ButtonStyle, TextInputStyle, ModalBuilder, ActionRowBuilder, TextInputBuilder} from "discord.js";
import {profiles, userInstallNotices} from "../db";
import {createCommand, type ProfileData} from "../types";
// import ProfileCardGenerator from "../cards";


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
            await handleEditWithCollectors(interaction);
            return;
        }
    },

    // No components needed for collector-based approach
    // components(_factory) {
    //     return [];
    // }
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

// New collector-based approach
async function handleEditWithCollectors(interaction: ChatInputCommandInteraction) {
    const profile = await profiles.get(interaction.user.id) ?? {};

    // Create buttons using plain objects for simplicity
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

    // Set up collectors for this specific interaction
    const collectorFilter = (i: ButtonInteraction) => i.user.id === interaction.user.id;

    const collector = response.createMessageComponentCollector({
        filter: collectorFilter,
        time: 300000, // 5 minutes
        componentType: ComponentType.Button
    });

    collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.customId === "save_profile") {
            await handleSaveProfile(buttonInteraction);
        }
        else if (buttonInteraction.customId === "edit_gear") {
            await handleGearModal(buttonInteraction);
        }
        else if (buttonInteraction.customId === "edit_skills") {
            await handleSkillsModal(buttonInteraction);
        }
    });

    collector.on("end", () => {
        // Disable buttons when collector expires
        const disabledRow = {
            type: ComponentType.ActionRow,
            components: [
                {...saveButton, disabled: true},
                {...gearButton, disabled: true},
                {...skillsButton, disabled: true}
            ]
        };

        interaction.editReply({components: [disabledRow]}).catch(() => {
            // Ignore errors if message was already deleted
        });
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

async function handleGearModal(interaction: ButtonInteraction) {
    const profile = await profiles.get(interaction.user.id) ?? {};

    // Use builders for modals since plain objects have type issues
    const modal = new ModalBuilder()
        .setCustomId("gear_modal")
        .setTitle("Add Your Gear");

    const forehhandInput = new TextInputBuilder()
        .setCustomId("forehand")
        .setLabel("Forehand")
        .setStyle(TextInputStyle.Short)
        .setValue(profile.forehand ?? "")
        .setRequired(false);

    const backhandInput = new TextInputBuilder()
        .setCustomId("backhand")
        .setLabel("Backhand")
        .setStyle(TextInputStyle.Short)
        .setValue(profile.backhand ?? "")
        .setRequired(false);

    const bladeInput = new TextInputBuilder()
        .setCustomId("blade")
        .setLabel("Blade")
        .setStyle(TextInputStyle.Short)
        .setValue(profile.blade ?? "")
        .setRequired(false);

    const forehhandRow = new ActionRowBuilder<TextInputBuilder>().addComponents(forehhandInput);
    const backhandRow = new ActionRowBuilder<TextInputBuilder>().addComponents(backhandInput);
    const bladeRow = new ActionRowBuilder<TextInputBuilder>().addComponents(bladeInput);

    modal.addComponents(forehhandRow, backhandRow, bladeRow);

    await interaction.showModal(modal);

    // Set up modal collector
    try {
        const modalSubmission = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === "gear_modal" && i.user.id === interaction.user.id,
            time: 300000 // 5 minutes
        });

        const forehand = modalSubmission.fields.getTextInputValue("forehand");
        const backhand = modalSubmission.fields.getTextInputValue("backhand");
        const blade = modalSubmission.fields.getTextInputValue("blade");

        if (!modalSubmission.message) {
            await modalSubmission.reply({content: "Error: Could not find original message.", flags: MessageFlags.Ephemeral});
            return;
        }

        // Update the embed fields
        const embed = modalSubmission.message.embeds[0];
        const newEmbed = EmbedBuilder.from(embed);
        newEmbed.spliceFields(0, 3,
            {name: "Forehand", value: forehand || "\u200B", inline: true},
            {name: "Backhand", value: backhand || "\u200B", inline: true},
            {name: "Blade", value: blade || "\u200B", inline: true}
        );

        await modalSubmission.deferUpdate();
        await modalSubmission.editReply({embeds: [newEmbed]});
    }
    catch {
        // Modal timed out or was cancelled
        console.log("Gear modal timed out");
    }
}

async function handleSkillsModal(interaction: ButtonInteraction) {
    const profile = await profiles.get(interaction.user.id) ?? {};

    const modal = new ModalBuilder()
        .setCustomId("skills_modal")
        .setTitle("Add Your Skills");

    const strengthsInput = new TextInputBuilder()
        .setCustomId("strengths")
        .setLabel("Strengths")
        .setStyle(TextInputStyle.Short)
        .setValue(profile.strengths ?? "")
        .setRequired(false);

    const weaknessesInput = new TextInputBuilder()
        .setCustomId("weaknesses")
        .setLabel("Weaknesses")
        .setStyle(TextInputStyle.Short)
        .setValue(profile.weaknesses ?? "")
        .setRequired(false);

    const playstyleInput = new TextInputBuilder()
        .setCustomId("playstyle")
        .setLabel("Playstyle")
        .setStyle(TextInputStyle.Short)
        .setValue(profile.playstyle ?? "")
        .setRequired(false);

    const strengthsRow = new ActionRowBuilder<TextInputBuilder>().addComponents(strengthsInput);
    const weaknessesRow = new ActionRowBuilder<TextInputBuilder>().addComponents(weaknessesInput);
    const playstyleRow = new ActionRowBuilder<TextInputBuilder>().addComponents(playstyleInput);

    modal.addComponents(strengthsRow, weaknessesRow, playstyleRow);

    await interaction.showModal(modal);

    // Set up modal collector
    try {
        const modalSubmission = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === "skills_modal" && i.user.id === interaction.user.id,
            time: 300000 // 5 minutes
        });

        const strengths = modalSubmission.fields.getTextInputValue("strengths");
        const weaknesses = modalSubmission.fields.getTextInputValue("weaknesses");
        const playstyle = modalSubmission.fields.getTextInputValue("playstyle");

        if (!modalSubmission.message) {
            await modalSubmission.reply({content: "Error: Could not find original message.", flags: MessageFlags.Ephemeral});
            return;
        }

        // Update the embed fields
        const embed = modalSubmission.message.embeds[0];
        const newEmbed = EmbedBuilder.from(embed);
        newEmbed.spliceFields(3, 3,
            {name: "Strengths", value: strengths || "\u200B", inline: true},
            {name: "Weaknesses", value: weaknesses || "\u200B", inline: true},
            {name: "Playstyle", value: playstyle || "\u200B", inline: true}
        );

        await modalSubmission.deferUpdate();
        await modalSubmission.editReply({embeds: [newEmbed]});
    }
    catch {
        // Modal timed out or was cancelled
        console.log("Skills modal timed out");
    }
}
