import {SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType} from "discord.js";
import {getJSON} from "../http";
import type {NCTTAPlayer} from "../types";


const search = (player: string) => `https://nctta.app/api/Players/FindByName/${player.replace(" ", "%20")}`;

export default {
    data: new SlashCommandBuilder()
        .setName("nctta")
        .setDescription("Gets information from the NCTTA!")
        .addSubcommand(cmd => cmd.setName("rating").setDescription("Gets the rating for a specific player!").addStringOption(opt => opt.setName("query").setDescription("Name of the player to find!").setRequired(true)))
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

    /**
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async execute(interaction: ChatInputCommandInteraction) {
        const command = interaction.options.getSubcommand();
        if (command === "rating") return await this.rating(interaction);
    },

    /**
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async rating(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const query = interaction.options.getString("query")!.trim();
        const url = search(query);
        const players = await getJSON<NCTTAPlayer[]>(url);

        if (players.length === 0) return await interaction.editReply("Did not find any players with this name, please check your spelling and try again!");
        if (players.length > 3) return await interaction.editReply("Found too many players, please try a more specific search!");

        /** @type {examplePlayer} */
        const player = players[0];

        const joinDate = new Date(player.addDTime).toLocaleDateString("en-us", {year: "numeric", month: "long", day: "numeric"});
        const activeDate = new Date(player.updDTime).toLocaleDateString("en-us", {year: "numeric", month: "long", day: "numeric"});

        const embed = new EmbedBuilder().setColor("#00628E").setTitle(`${player.firstName} ${player.lastName}`)
                .addFields(
                    {name: "Joined", value: joinDate, inline: true},
                    {name: "Last Active", value: activeDate, inline: true},
                    {name: "Rating", value: player?.rating?.toString() || "\u200b", inline: true},
                );

        await interaction.editReply({embeds: [embed]});
    },
};
