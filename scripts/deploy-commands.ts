const fs = require("node:fs");
const path = require("node:path");
const {REST} = require("discord.js");
const {API} = require("@discordjs/core");


const commands = [];
const ownerCommands = [];
const commandsPath = path.join(__dirname, "..", "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Separate owner commands to "privileged" guild
    if (command.owner) ownerCommands.push(command.data.toJSON());
    else commands.push(command.data.toJSON());
}

const rest = new REST({version: "10"}).setToken(process.env.BOT_TOKEN);
const api = new API(rest);

api.applicationCommands.bulkOverwriteGlobalCommands(process.env.BOT_CLIENT_ID, commands)
    .then(result => console.log(`Successfully registered ${result.length} application commands.`))
    .catch(console.error);

if (process.env.BOT_GUILD_ID) {
    api.applicationCommands.bulkOverwriteGuildCommands(process.env.BOT_CLIENT_ID, process.env.BOT_GUILD_ID, ownerCommands)
        .then(result => console.log(`Successfully registered ${result.length} guild commands.`))
        .catch(console.error);
}
