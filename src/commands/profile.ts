import {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, CommandInteraction, ChatInputCommandInteraction, ButtonInteraction, ApplicationIntegrationType, InteractionContextType, type ModalMessageModalSubmitInteraction, MessageFlags} from "discord.js";
import {profiles, userInstallNotices} from "../db";
import type {ProfileData} from "../types";


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

export default {
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
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        const command = interaction.options.getSubcommand();
        if (command === "view") return await this.view(interaction);
        if (command === "edit") return await this.edit(interaction);
    },

    async view(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user") ?? interaction.user;
        const profile = await profiles.get(user.id) as ProfileData | undefined;

        if (!profile) {
            const noEmbed = new EmbedBuilder().setColor("Red").setDescription("No profile found, please set one up using `/profile edit`!");
            return await interaction.reply({embeds: [noEmbed]});
        }

        await interaction.reply({embeds: [createProfileEmbed(user, profile)]});
        const hasShownNotice = await userInstallNotices.get(interaction.user.id);
        if (!hasShownNotice) {
            await userInstallNotices.set(interaction.user.id, true);
            await interaction.followUp({content: `**New!** Add TableTennisDB to your account for DM access and cross-server profiles!\n\nClick my profile → "Add App" → "Add to My Apps"`, flags: MessageFlags.Ephemeral});
        }
    },

    async edit(interaction: ChatInputCommandInteraction) {
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId("profile-save").setLabel("Save").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("profile-gear").setLabel("Edit Gear").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("profile-skills").setLabel("Edit Skills").setStyle(ButtonStyle.Secondary),
        );

        const profile = await profiles.get(interaction.user.id) ?? {};
        const profileEmbed = createProfileEmbed(interaction.user, profile);
        profileEmbed.setFooter({text: "💡 Suggest profile features on Discord or GitHub - See /about for links."});
        await interaction.reply({embeds: [profileEmbed], components: [row], flags: MessageFlags.Ephemeral});
    },

    /**
     * @param interaction {import("discord.js").ButtonInteraction}
     */
    async button(interaction: ButtonInteraction) {
        const id = interaction.customId.split("-")[1];
        const profile = await profiles.get(interaction.user.id) ?? {};

        if (id === "gear") {
            const modal = new ModalBuilder().setTitle("Add Your Gear").setCustomId("profile-gear");
            const forehand = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("forehand").setLabel("Forehand").setStyle(TextInputStyle.Short).setValue(profile.forehand ?? ""));
            const backhand = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("backhand").setLabel("Backhand").setStyle(TextInputStyle.Short).setValue(profile.backhand ?? ""));
            const blade = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("blade").setLabel("Blade").setStyle(TextInputStyle.Short).setValue(profile.blade ?? ""));
            modal.addComponents(forehand, backhand, blade);
            await interaction.showModal(modal);
        }
        if (id === "skills") {
            const modal = new ModalBuilder().setTitle("Add Your Skills").setCustomId("profile-skills");
            const strengths = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("strengths").setLabel("Strengths").setStyle(TextInputStyle.Short).setValue(profile.strengths ?? ""));
            const weaknesses = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("weaknesses").setLabel("Weaknesses").setStyle(TextInputStyle.Short).setValue(profile.weaknesses ?? ""));
            const playstyle = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("playstyle").setLabel("Playstyle").setStyle(TextInputStyle.Short).setValue(profile.playstyle ?? ""));
            modal.addComponents(strengths, weaknesses, playstyle);
            await interaction.showModal(modal);
        }
        if (id === "save") {
            const data: Record<string, string> = {};
            interaction.message.embeds[0].fields.map(f => ({[f.name]: f.value}));
            interaction.message.embeds[0].fields.forEach(f => data[f.name.toLowerCase()] = f.value);
            await profiles.set(interaction.user.id, data);
            await interaction.update({embeds: [new EmbedBuilder().setColor("Green").setDescription("Profile saved successfully!")], components: []});
        }
    },

    /**
     * @param interaction {import("discord.js").ModalMessageModalSubmitInteraction}
     */
    async modal(interaction: ModalMessageModalSubmitInteraction) {
    const id = interaction.customId.split("-")[1];
    if (id === "skills") return await this.skills(interaction);
    return await this.gear(interaction);
    },

    /**
     * @param interaction {import("discord.js").ModalMessageModalSubmitInteraction}
     */
    async gear(interaction: ModalMessageModalSubmitInteraction) {
        const forehand = interaction.fields.getTextInputValue("forehand");
        const backhand = interaction.fields.getTextInputValue("backhand");
        const blade = interaction.fields.getTextInputValue("blade");
        interaction.message!.embeds[0].fields[0].value = forehand;
        interaction.message!.embeds[0].fields[1].value = backhand;
        interaction.message!.embeds[0].fields[2].value = blade;
        const newEmbed = EmbedBuilder.from(interaction.message!.embeds[0]);
        await interaction.update({embeds: [newEmbed]});
    },

    /**
     * @param interaction {import("discord.js").ModalMessageModalSubmitInteraction}
     */
    async skills(interaction: ModalMessageModalSubmitInteraction) {
        const strengths = interaction.fields.getTextInputValue("strengths");
        const weaknesses = interaction.fields.getTextInputValue("weaknesses");
        const playstyle = interaction.fields.getTextInputValue("playstyle");
        interaction.message!.embeds[0].fields[3].value = strengths;
        interaction.message!.embeds[0].fields[4].value = weaknesses;
        interaction.message!.embeds[0].fields[5].value = playstyle;
        const newEmbed = EmbedBuilder.from(interaction.message!.embeds[0]);
        await interaction.update({embeds: [newEmbed]});
    },
};
