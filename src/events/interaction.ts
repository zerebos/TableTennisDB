import {type Interaction, ChatInputCommandInteraction, MessageFlags} from "discord.js";
import {incrementStat} from "../db";


export default {
    name: "interactionCreate",

    async execute(interaction: Interaction) {
        let commandName = "";
        let executor: "execute" | "autocomplete" | "button" | "modal" = "execute";

        if (interaction.isChatInputCommand()) {
            commandName = interaction.commandName;
            executor = "execute";
            this.addStat(interaction);
        }
        else if (interaction.isAutocomplete()) {
            commandName = interaction.commandName;
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
        if (!commandName || !command || !command[executor]) {
            console.error("Unrecognized interaction", commandName, executor, interaction);
            if (interaction.isChatInputCommand() && interaction.isRepliable()) await interaction.reply({content: "Something went wrong! If this persists, please report it to the bot owner!", flags: MessageFlags.Ephemeral});
            return;
        }

        try {
            await command[executor](interaction);
        }
        catch (error) {
            console.error(error);
            if (interaction.isRepliable()) await interaction.reply({content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral});
        }
    },

    addStat(interaction: ChatInputCommandInteraction) {
        const key = interaction.guildId ?? interaction.client.user?.id;
        if (!key) return;
        const name = interaction.commandName;
        try {
            incrementStat(key, name);
        }
        catch (error) {
            console.error("Failed to increment stat", {key, name, error});
        }
    }
};