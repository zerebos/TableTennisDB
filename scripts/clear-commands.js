const {Routes} = require("discord.js");
const {REST} = require("@discordjs/rest");
const {clientId, token} = require("../config.js");

const rest = new REST({version: "10"}).setToken(token);

rest.put(Routes.applicationCommands(clientId), {body: []})
    .then(() => console.log("Successfully deleted all application commands."))
    .catch(console.error);