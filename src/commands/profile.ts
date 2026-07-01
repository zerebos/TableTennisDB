import {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType, MessageFlags} from "discord.js";
import {profiles, userInstallNotices} from "../db";
import type {ProfileData} from "../types";


const GEAR_FIELDS = ["forehand", "backhand", "blade"] as const;
const SKILL_FIELDS = ["strengths", "weaknesses", "playstyle"] as const;

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

// Build a modal prefilled from the current draft. Fields are optional so a
// user can tweak one value without being forced to refill the others.
function buildModal(kind: "gear" | "skills", draft: ProfileData) {
    const fields = kind === "gear" ? GEAR_FIELDS : SKILL_FIELDS;
    const modal = new ModalBuilder()
        .setCustomId(`profile-${kind}`)
        .setTitle(kind === "gear" ? "Add Your Gear" : "Add Your Skills");
    modal.addComponents(...fields.map(field =>
        new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
                .setCustomId(field)
                .setLabel(field[0].toUpperCase() + field.slice(1))
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(draft[field] ?? "")
        )
    ));
    return modal;
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

    async execute(interaction: ChatInputCommandInteraction) {
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
        // Ephemeral edit session: `draft` is the single source of truth, the
        // embed is only a rendering of it, and nothing is persisted until the
        // user hits Save. Everything is handled by a collector on this one
        // message, so no global component routing is involved.
        const draft = (await profiles.get(interaction.user.id) as ProfileData | undefined) ?? {};

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("profile-save").setLabel("Save").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("profile-gear").setLabel("Edit Gear").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("profile-skills").setLabel("Edit Skills").setStyle(ButtonStyle.Secondary),
        );

        const buildEmbed = () => createProfileEmbed(interaction.user, draft)
            .setFooter({text: "💡 Suggest profile features on Discord or GitHub - See /about for links."});

        await interaction.reply({embeds: [buildEmbed()], components: [row], flags: MessageFlags.Ephemeral});
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            idle: 300_000,
        });

        let saved = false;
        collector.on("collect", async i => {
            if (!i.isButton()) return;
            const kind = i.customId.split("-")[1];

            if (kind === "save") {
                await profiles.set(interaction.user.id, draft);
                await i.update({embeds: [new EmbedBuilder().setColor("Green").setDescription("Profile saved successfully!")], components: []});
                saved = true;
                return collector.stop();
            }

            // gear | skills: open a prefilled modal and wait for its submission.
            await i.showModal(buildModal(kind as "gear" | "skills", draft));
            const submitted = await i.awaitModalSubmit({
                time: 120_000,
                filter: s => s.customId === `profile-${kind}` && s.user.id === i.user.id,
            }).catch(() => null);
            if (!submitted || !submitted.isFromMessage()) return; // dismissed or timed out

            for (const field of (kind === "gear" ? GEAR_FIELDS : SKILL_FIELDS)) {
                draft[field] = submitted.fields.getTextInputValue(field);
            }
            await submitted.update({embeds: [buildEmbed()], components: [row]});
        });

        collector.on("end", async () => {
            // Strip the now-dead buttons if the session expired without a save.
            if (saved) return;
            await interaction.editReply({components: []}).catch(() => {});
        });
    },
};
