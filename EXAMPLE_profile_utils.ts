// src/commands/profile/utils.ts
import {EmbedBuilder} from "discord.js";
import {type ProfileData} from "../../types";

export function createProfileEmbed(user: {username: string, avatarURL: () => (string | null)}, profile: ProfileData) {
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
