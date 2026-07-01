import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {REST, type RESTPostAPIChatInputApplicationCommandsJSONBody} from "discord.js";
import {API} from "@discordjs/core";
import type {CommandModule} from "../src/types";


// Check CLI arguments for clear flag
const shouldClear = process.argv.includes("--clear") || process.argv.includes("-c");

// Setup file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new REST instance
const rest = new REST({version: "10"}).setToken(process.env.BOT_TOKEN!);
const api = new API(rest);

async function setCommands(globalCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[], guildCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[]) {
    // Deploy global commands
    try {
        console.log(`\n🚀 Started ${shouldClear ? "clearing" : "registering"} global application commands...`);
        const result = await api.applicationCommands.bulkOverwriteGlobalCommands(process.env.BOT_CLIENT_ID!, globalCommands);
        console.log(`✅ Successfully ${shouldClear ? "cleared" : `registered ${result.length}`} global commands.`);
    }
    catch (error) {
        console.error(`❌ Failed to ${shouldClear ? "clear" : "register"} global commands:`, error);
    }

    // Deploy guild commands (owner commands)
    if (process.env.BOT_GUILD_ID) {
        try {
            console.log(`\n🚀 Started ${shouldClear ? "clearing" : "registering"} guild commands...`);
            const result = await api.applicationCommands.bulkOverwriteGuildCommands(process.env.BOT_CLIENT_ID!, process.env.BOT_GUILD_ID, guildCommands);
            console.log(`✅ Successfully ${shouldClear ? "cleared" : `registered ${result.length}`} guild commands.`);
        }
    catch (error) {
        console.error(`❌ Failed to ${shouldClear ? "clear" : "register"} guild commands:`, error);
        }
    }
    else if (!process.env.BOT_GUILD_ID) {
        console.log(`⚠️  BOT_GUILD_ID not set - skipping owner command ${shouldClear ? "clearing" : "deployment"}`);
    }

    console.log(`\n🎉 Command ${shouldClear ? "clearing" : "deployment"} complete!`);
}

if (!shouldClear) {
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

    console.log(`📁 Loaded ${commands.length} global commands and ${ownerCommands.length} owner commands`);
    await setCommands(commands, ownerCommands);
}
else {
    console.log("🗑️  Clearing all commands...");
    await setCommands([], []);
}
