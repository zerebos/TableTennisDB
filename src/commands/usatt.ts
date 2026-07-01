import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction} from "discord.js";

// NOTE: The USATT (simplycompete) site currently blocks the bot. Both
// subcommands respond with a notice until a rolling proxy is in place. The
// original scraping implementation lives in git history if/when it returns.

const blockedEmbed = new EmbedBuilder()
    .setColor("Red")
    .setDescription("The USATT has blocked the bot from accessing their site. The bot developer is working on a potential workaround for this.");

export default {
    data: new SlashCommandBuilder()
        .setName("usatt")
        .setDescription("Gets information from the USATT website!")
        .addSubcommand(cmd => cmd.setName("rating").setDescription("Gets the rating for a player!").addStringOption(opt => opt.setName("query").setDescription("Name of the player to find!").setRequired(true)))
        .addSubcommand(cmd => cmd.setName("club").setDescription("Gets information about a club!").addStringOption(opt => opt.setName("query").setDescription("Name of the club to find!").setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction) {
        return await interaction.reply({embeds: [blockedEmbed]});
    },
};
