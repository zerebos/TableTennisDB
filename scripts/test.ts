import fs from "node:fs";
import path from "path";
import {fileURLToPath} from "url";
import deepequal from "deep-eql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const ownerCommands = [];
const commandsPath = path.join(__dirname, "..", "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);

    // Handle both default and named exports
    const commandData = command.default || command;

    // Separate owner commands to "privileged" guild
    if (commandData.owner) ownerCommands.push(commandData.data.toJSON());
    else commands.push(commandData.data.toJSON());
}

const cacheFile = path.join(__dirname, "..", "commands.json");
let cacheData = {global: [], owner: []};
if (fs.existsSync(cacheFile)) {
    cacheData = JSON.parse(fs.readFileSync(cacheFile).toString());
}
else {
    fs.writeFileSync(cacheFile, JSON.stringify({global: commands, owner: ownerCommands}, null, 4));
}

const isEqual = (() => {
    if (commands.length !== cacheData.global.length) return false;
    const json = JSON.parse(JSON.stringify(commands));
    for (const command of json) {
        let found = false;
        for (const cachedCommand of cacheData.global) {
            found = deepequal(command, cachedCommand);
            if (found) break;
        }
        if (!found) {
            console.log(command);
            return false;
        }
    }
    return true;
})();

console.log(`Were they equal? ${isEqual}`);