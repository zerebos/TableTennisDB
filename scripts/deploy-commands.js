const fs = require("node:fs");
const path = require("node:path");
const {Routes} = require("discord.js");
const {REST} = require("@discordjs/rest");
const {clientId, token, guild} = require("../config.js");

const commands = [];
const ownerCommands = [];
const commandsPath = path.join(__dirname, "..", "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.owner) {
        const data = command.data;
        ownerCommands.push(data.toJSON());
    }
    else {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({version: "10"}).setToken(token);

rest.put(Routes.applicationCommands(clientId), {body: commands})
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);

if (ownerCommands.length && guild) {
    rest.put(Routes.applicationGuildCommands(clientId, guild), {body: ownerCommands})
        .then(() => console.log("Successfully registered guild commands."))
        .catch(console.error);
}
