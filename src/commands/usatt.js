const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js");
const https = require("https");
const Cheerio = require("cheerio");

const base = `https://usatt.simplycompete.com`;
const playerSearch = query => `${base}/userAccount/s2?citizenship=&gamesEligibility=&gender=&minAge=&maxAge=&minTrnRating=&maxTrnRating=&minLeagueRating=&maxLeagueRating=&state=&region=Any+Region&favorites=&q=${query.replace(" ", "%20")}&displayColumns=First+Name&displayColumns=Last+Name&displayColumns=USATT%23&displayColumns=Location&displayColumns=Home+Club&displayColumns=Tournament+Rating&displayColumns=Last+Played+Tournament&displayColumns=League+Rating&displayColumns=Last+Played+League&displayColumns=Membership+Expiration&pageSize=25`;
const playerPage = id => `${base}/userAccount/up/${id}`;

const clubSearch = query => `${base}/c/d?searchBy=&query=${query.replace(" ", "%20")}&state=&max=20&v=`;
const clubAPI = id => `${base}/c/p2data/${id}`;
const clubPage = id => `${base}/c/cp?id=${id}`;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("usatt")
        .setDescription("Gets information from the USATT website!")
        .addSubcommand(cmd => cmd.setName("rating").setDescription("Gets the rating for a player!").addStringOption(opt => opt.setName("query").setDescription("Name of the player to find!").setRequired(true)))
        .addSubcommand(cmd => cmd.setName("club").setDescription("Gets information about a club!").addStringOption(opt => opt.setName("query").setDescription("Name of the club to find!").setRequired(true))),

    /** 
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async execute(interaction) {
        const command = interaction.options.getSubcommand();
        if (command === "rating") return await this.rating(interaction);
        if (command === "club") return await this.club(interaction);
    },

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async rating(interaction) {
        await interaction.deferReply();
        const query = interaction.options.getString("query").trim();
        const url = playerSearch(query);
        const html = await new Promise(resolve => {
            https.get(url).on("response", function(response) {
                let body = "";
                response.on("data", (chunk) => body += chunk);
                response.on("end", () => resolve(body));
            });
        });
        const $ = Cheerio.load(html);
        const list = $("tbody");
        const players = list.children();
        if (players.length === 0) return await interaction.editReply("Did not find any players with this name, please check your spelling and try again!");
        if (players.length > 1) return await interaction.editReply("Found more than one player, please try a more specific search!");
        const player = players.get(0);
        const stats = $(player).children();
        const route = $(stats.get(2)).find("a").attr("href");

        const first = $(stats.get(2)).text();
        const last = $(stats.get(3)).text();
        // const id = $(stats.get(4)).text();
        // const location = $(stats.get(5)).text();
        const club = $(stats.get(6)).text();
        const clubRoute = $(stats.get(6)).find("a").attr("href");
        const tournamentRating = $(stats.get(7)).text();
        const tournamentDate = $(stats.get(8)).text();
        const leagueRating = $(stats.get(9)).text();
        const leagueDate = $(stats.get(10)).text();
        // const membership = $(stats.get(11)).text();
        
        const embed = new EmbedBuilder().setColor("White").setTitle(`${first} ${last}`)
                .addFields(
                    {name: "Tournament Rating", value: tournamentRating || "\u200b", inline: true},
                    {name: "\u200b", value: "\u200b", inline: true},
                    {name: "Last Tournament Played", value: tournamentDate || "\u200b", inline: true},

                    {name: "League Rating", value: leagueRating || "\u200b", inline: true},
                    {name: "\u200b", value: "\u200b", inline: true},
                    {name: "Last League Played", value: leagueDate || "\u200b", inline: true},
                );

        if (club) embed.addFields({name: "Club", value: club ? `[${club}](${base}${clubRoute})` : "\u200b"});
        
        await interaction.editReply({embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("See on USATT").setStyle(ButtonStyle.Link).setURL(base + route))]});
    },

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
     async club(interaction) {
        await interaction.deferReply();
        const query = interaction.options.getString("query").trim();
        const url = clubSearch(query);
        const html = await new Promise(resolve => {
            https.get(url).on("response", function(response) {
                let body = "";
                response.on("data", (chunk) => body += chunk);
                response.on("end", () => resolve(body));
            });
        });
        const $ = Cheerio.load(html);
        const clubs = $(".category-div-block");
        if (clubs.length === 0) return await interaction.editReply("Did not find any clubs with this name, please check your spelling and try again!");
        // if (clubs.length > 1) return await interaction.editReply("Found more than one club, please try a more specific search!");

        const onclick = clubs.first().attr("onclick");
        const idStart = onclick.indexOf("id=") + "id=".length;
        const idEnd = onclick.lastIndexOf("'");
        const id = onclick.substring(idStart, idEnd);
        const img = clubs.first().find("img").attr("data-cfsrc");
        const imgUrl = img.startsWith("//") ? `https:${img}` : `${base}${img}`;

        const json = await new Promise(resolve => {
            https.get(clubAPI(id)).on("response", function(response) {
                let body = "";
                response.on("data", (chunk) => body += chunk);
                response.on("end", () => resolve(JSON.parse(body)));
            });
        });

        const numPlayers = json.clubPlayers.length;
        const numCoaches = json.clubCoaches.length;
        const location = json.locations[0];
        const address = location.address_line1 + "\n" + location.address_line2;
        
        const embed = new EmbedBuilder().setColor("White").setTitle(json.club.name).setImage(imgUrl)
                .addFields(
                    {name: "Address", value: address.trim() || "\u200b", inline: false},
                    {name: "City", value: location.city || "\u200b", inline: true},
                    {name: "State", value: location.state || "\u200b", inline: true},
                    {name: "Zip", value: location.zip_code || "\u200b", inline: true},
                    {name: "Hours", value: location.hours_dates || json.club.hours_dates || "\u200b", inline: false},
                    {name: "Owner", value: `[${json.club.admin_fullname}](${playerPage(json.club.admin_id)})`, inline: true},
                    {name: "# of Players", value: numPlayers.toLocaleString(), inline: true},
                    {name: "# of Coaches", value: numCoaches.toLocaleString(), inline: true},
                );

        const buttons = [];
        if (json.club.webpage) buttons.push(new ButtonBuilder().setLabel("Club Website").setStyle(ButtonStyle.Link).setURL(json.club.webpage));
        buttons.push(new ButtonBuilder().setLabel("See on USATT").setStyle(ButtonStyle.Link).setURL(clubPage(id)));
        await interaction.editReply({embeds: [embed], components: [new ActionRowBuilder().addComponents(buttons)]});
    },
};
