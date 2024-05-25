const {Routes} = require("discord.js");
const {REST} = require("@discordjs/rest");

require("dotenv").config();

const rest = new REST({version: "10"}).setToken(process.env.BOT_TOKEN);

rest.put(Routes.applicationCommands(process.env.BOT_CLIENT_ID), {body: []})
    .then(() => console.log("Successfully deleted all application commands."))
    .catch(console.error);

if (process.env.BOT_GUILD_ID) {
    rest.put(Routes.applicationGuildCommands(process.env.BOT_CLIENT_ID, process.env.BOT_GUILD_ID), {body: []})
        .then(() => console.log("Successfully deleted all guild commands."))
        .catch(console.error);
}