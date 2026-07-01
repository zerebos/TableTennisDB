import {SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags} from "discord.js";
import * as revspin from "../revspin";

export default {
    owner: true,
    data: new SlashCommandBuilder()
        .setName("update")
        .setDescription("Updates the RevSpin cache!"),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== process.env.BOT_OWNER_ID) return await interaction.reply({content: "Sorry this command is only usable by the owner!", flags: MessageFlags.Ephemeral});

        await interaction.reply("Updating cache for RevSpin.net");
        await revspin.refresh(async category => {
            await interaction.editReply(`Updating cache for ${category}.`);
        });
        await interaction.editReply(`RevSpin cache updated!`);
    }
};
