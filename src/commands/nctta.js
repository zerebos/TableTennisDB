const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const https = require("https");

// eslint-disable-next-line no-unused-vars
const examplePlayer = {
    Active: true,
    addDTime: "2015-10-29T22:38:42.247",
    eligibilityUsed: 1,
    eligible: true,
    email: "",
    firstName: "Edsel",
    firstSeason: 17,
    id: 11845,
    isWoman: false,
    lastName: "Theodore",
    lastSeason: 17,
    operationalStatus: "Approved",
    rating: 553,
    school: 231,
    updDTime: "2016-02-01T23:09:58.157",
    usatt: ""
};


const search = player => `https://nctta.app/api/Players/FindByName/${player.replace(" ", "%20")}`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nctta")
        .setDescription("Gets information from the NCTTA!")
        .addSubcommand(cmd => cmd.setName("rating").setDescription("Gets the rating for a specific player!").addStringOption(opt => opt.setName("query").setDescription("Name of the player to find!").setRequired(true))),

    /** 
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async execute(interaction) {
        const command = interaction.options.getSubcommand();
        if (command === "rating") return await this.rating(interaction);
    },

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async rating(interaction) {
        await interaction.deferReply();
        const query = interaction.options.getString("query").trim();
        const url = search(query);
        const players = await new Promise(resolve => {
            https.get(url).on("response", function(response) {
                let body = "";
                response.on("data", (chunk) => body += chunk);
                response.on("end", () => resolve(JSON.parse(body)));
            });
        });
        
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
                    {name: "Rating", value: player.rating.toString() || "\u200b", inline: true},
                );
        
        await interaction.editReply({embeds: [embed]});
    },
};
