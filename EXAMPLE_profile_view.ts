// src/commands/profile/view.ts
import {ChatInputCommandInteraction, EmbedBuilder, MessageFlags} from "discord.js";
import {profiles, userInstallNotices} from "../../db";
import {type ProfileData} from "../../types";
import {createProfileEmbed} from "./utils";

export async function handleView(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const profile = await profiles.get(user.id) as ProfileData | undefined;

    if (!profile) {
        const noEmbed = new EmbedBuilder()
            .setColor("Red")
            .setDescription("No profile found, please set one up using `/profile edit`!");
        await interaction.reply({embeds: [noEmbed]});
        return;
    }

    await interaction.reply({embeds: [createProfileEmbed(user, profile)]});

    // Show user install notice if they haven't seen it
    const hasShownNotice = await userInstallNotices.get(interaction.user.id);
    if (!hasShownNotice) {
        await userInstallNotices.set(interaction.user.id, true);
        await interaction.followUp({
            content: `**New!** Add TableTennisDB to your account for DM access and cross-server profiles!\n\nClick my profile → "Add App" → "Add to My Apps"`,
            flags: MessageFlags.Ephemeral
        });
    }
}
