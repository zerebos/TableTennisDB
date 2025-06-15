const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const https = require("https");


// Instead of: Men's Singles - Semifinal - Match 1
// Become:     Men's Singles - Semifinal
const formatMatchName = (result) => {
    const sections = result.match_card.subEventDescription.split("-");
    if (sections.length !== 3) return result.match_card.subEventDescription;
    return `${sections[0]}-${sections[1]}`;
};

// Convert doubles teams from HARIMOTO Tomokazu/HAYATA Hina
// to HARIMOTO / HAYATA
const formatPlayerNames = (result) => {
    const competitors = result.match_card.competitiors.map(c => c.competitiorName);

    for (let c = 0; c < competitors.length; c++) {
        if (!competitors[c].includes("/")) continue;
        const [playerA, playerB] = competitors[c].split("/");
        competitors[c] = `${playerA.split(" ")[0]} / ${playerB.split(" ")[0]}`;
    }

    return competitors.join("\n");
};

// Bolds the winning team
const formatOverallScore = (result) => {
    const scores = result.match_card.resultOverallScores.split("-").map(Number);
    if (scores[0] > scores[1]) scores[0] = `**${scores[0]}**`;
    else scores[1] = `**${scores[1]}**`;
    return scores.join("\n");
};

// Bolds each winning score and adds separators
const formatGameScores = (result) => {
    const scores = result.match_card.gameScores.split(",").filter(s => s !== "0-0").map(s => s.split("-"));
    for (let s = 0; s < scores.length; s++) {
        const game = scores[s].map(Number);
        if (game[0] > game[1]) scores[s][0] = `**${scores[s][0]}**`;
        else scores[s][1] = `**${scores[s][1]}**`;
    }
    const playerA = scores.map(s => s[0]).join(" | ");
    const playerB = scores.map(s => s[1]).join(" | ");
    return `${playerA}\n${playerB}`;
};

// Utility routine with minimal validation
const getJSON = async (url, validator = c => c) => {
    const parsed = new URL(url);
    const rawResponse = await new Promise(resolve => {
        https.get({
            host: parsed.host,
            path: parsed.pathname + parsed.search,
            headers: {
                "accept": "application/json",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0"
            }
        }).on("response", function (response) {
            let body = "";
            response.on("data", (chunk) => body += chunk);
            response.on("end", () => resolve(body));
        });
    });

    let json;
    try {
        json = JSON.parse(rawResponse);
        if (validator(json)) return json;
        console.error("JSON Validator Failed");
        throw new Error("JSON Validator Failed");
    }
    catch {
        return null;
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wtt")
        .setDescription("Gets information from the World Table Tennis website!")
        .addSubcommand(cmd =>
            cmd.setName("results")
                .setDescription("Shows the latest results from World Table Tennis!")
                .addNumberOption((/** @type {import("@discordjs/builders").SlashCommandNumberOption} */ option) =>
                    option.setName("count")
                        .setDescription("How many results to view")
                        .setRequired(false)
                        .setMinValue(1).setMaxValue(8))
        ),

    /** 
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async execute(interaction) {
        const command = interaction.options.getSubcommand();
        if (command === "results") return await this.results(interaction);
    },

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async results(interaction) {
        await interaction.deferReply();
        
        const count = interaction.options.getNumber("count", false) ?? 4;

        // Get most recent/current event ID
        const isValidEvent = json => json.length && json[0]?.eventId;
        const eventInfo = await getJSON(`https://wttapigateway-new.azure-api.net/prod/api/cms/GetLiveEventWithKey?Key=live_results_event_id`, isValidEvent);
        if (!eventInfo) {
            const failEmbed = new EmbedBuilder().setColor("Red").setDescription("Could not get current event info!");
            return await interaction.editReply({embeds: [failEmbed]});
        }


        // Use event info to get results from event
        const isValidResult = json => json.length && json[0]?.match_card;
        const results = await getJSON(`https://wttapigateway-new.azure-api.net/prod/api/cms/GetOfficialResult?EventId=${eventInfo[0].eventId}&include_match_card=true&take=10`, isValidResult);
        if (!results) {
            const failEmbed = new EmbedBuilder().setColor("Red").setDescription("Could not get recent results!");
            return await interaction.editReply({embeds: [failEmbed]});
        }

        const rEmbed = new EmbedBuilder();
        rEmbed.setTitle(eventInfo[0].eventName);
        rEmbed.setAuthor({name: "World Table Tennis", iconURL: "https://worldtabletennis.com/assets/images/wtt_main_logo_nowhite_small.png"});
        rEmbed.setColor("#FF6B00");
        
        const addField = (n,v,i) => rEmbed.addFields({name: n, value: v, inline: i ?? true});
        for (let c = 0; c < count; c++) {
            addField(formatMatchName(results[c]), formatPlayerNames(results[c]));
            addField("​", formatOverallScore(results[c]));
            addField("​", formatGameScores(results[c]));
        }

        await interaction.editReply({embeds: [rEmbed]});
    },
};
