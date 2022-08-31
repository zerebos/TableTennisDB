const path = require("path");
const Keyv = require("keyv");
const stats = new Keyv("sqlite://" + path.resolve(__dirname, "..", "..", "settings.sqlite3"), {namespace: "stats"});

module.exports = {
    name: "interactionCreate",

    /** 
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async execute(interaction) {
        let commandName = interaction.commandName;
        let executor = "";
        if (interaction.isChatInputCommand()) {
            executor = "execute";
            await this.addStat(interaction);
        }
        else if (interaction.isAutocomplete()) {
            executor = "autocomplete";
        }
        else if (interaction.isButton()) {
            executor = "button";
            commandName = interaction.customId.split("-")[0];
        }
        else if (interaction.isModalSubmit()) {
            executor = "modal";
            commandName = interaction.customId.split("-")[0];
        }

        const command = interaction.client.commands.get(commandName);
        if (!command || !command[executor]) return;
    
        try {
            await command[executor](interaction);
        }
        catch (error) {
            console.error(error);
            await interaction.reply({content: "There was an error while executing this command!", ephemeral: true});
        }
    },

    /** 
     * @param interaction {import("discord.js").ChatInputCommandInteraction}
     */
    async addStat(interaction) {
        const key = interaction.guildId ?? interaction.client.user.id;
        const name = interaction.commandName;
        let data = {};
        if (await stats.has(key)) data = await stats.get(key);
        if (!data.commands) data.commands = {};
        if (!data.commands[name]) data.commands[name] = 0;
        data.commands[name] = data.commands[name] + 1;
        await stats.set(key, data);
    }
};