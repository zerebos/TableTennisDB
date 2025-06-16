import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {REST} from "discord.js";
import {API} from "@discordjs/core";
import type {CommandModule} from "../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const ownerCommands = [];
const commandsPath = path.join(__dirname, "..", "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(pathToFileURL(filePath).href) as CommandModule | {default: CommandModule};
    const command = ("default" in commandModule) ? commandModule.default : commandModule;

    if (!command.data) {
        console.warn(`⚠️  Command ${file} has no data property, skipping...`);
        continue;
    }

    const commandData = command.data.toJSON();

    // Separate owner commands to "privileged" guild
    if (command.owner) {
        ownerCommands.push(commandData);
        console.log(`🔒 Owner command: ${commandData.name}`);
    }
    else {
        commands.push(commandData);
        console.log(`🌐 Global command: ${commandData.name}`);
        if (commandData.integration_types?.includes(1)) console.log(`   📱 User-installable`);
    }
}

const rest = new REST({version: "10"}).setToken(process.env.BOT_TOKEN!);
const api = new API(rest);

// Deploy global commands
try {
    console.log("\n🚀 Started refreshing global application commands...");
    const result = await api.applicationCommands.bulkOverwriteGlobalCommands(process.env.BOT_CLIENT_ID!, commands);
    console.log(`✅ Successfully registered ${result.length} global commands.`);
}
 catch (error) {
    console.error("❌ Failed to register global commands:", error);
}

// Deploy guild commands (owner commands)
if (process.env.BOT_GUILD_ID && ownerCommands.length > 0) {
    try {
        console.log("\n🚀 Started refreshing guild commands...");
        const result = await api.applicationCommands.bulkOverwriteGuildCommands(process.env.BOT_CLIENT_ID!, process.env.BOT_GUILD_ID, ownerCommands);
        console.log(`✅ Successfully registered ${result.length} guild commands.`);
    }
 catch (error) {
       console.error("❌ Failed to register guild commands:", error);
    }
}
else if (!process.env.BOT_GUILD_ID) {
    console.log("⚠️  BOT_GUILD_ID not set - skipping owner command deployment");
}
else {
    console.log("ℹ️  No owner commands to deploy");
}

console.log("\n🎉 Command deployment complete!");