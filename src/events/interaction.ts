import {type Interaction, ChatInputCommandInteraction, MessageFlags} from "discord.js";
import {recordCommand} from "../db";


export default {
    name: "interactionCreate",

    async execute(interaction: Interaction) {
        // Buttons, modals, and select menus are handled locally by the command
        // that created them (via collectors), so the global router only cares
        // about slash commands and their autocomplete.
        if (interaction.isChatInputCommand()) {
            this.addStat(interaction);
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error("Unrecognized command", interaction.commandName);
                return await interaction.reply({content: "Something went wrong! If this persists, please report it to the bot owner!", flags: MessageFlags.Ephemeral});
            }
            try {
                await command.execute(interaction);
            }
            catch (error) {
                console.error(error);
                const content = "There was an error while executing this command!";
                // Most commands defer or reply before doing work, so a plain reply()
                // here would throw "already replied" and swallow the real error.
                if (interaction.replied || interaction.deferred) await interaction.followUp({content, flags: MessageFlags.Ephemeral});
                else await interaction.reply({content, flags: MessageFlags.Ephemeral});
            }
            return;
        }

        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command?.autocomplete) return;
            try {
                await command.autocomplete(interaction);
            }
            catch (error) {
                console.error(error);
            }
        }
    },

    addStat(interaction: ChatInputCommandInteraction) {
        // Guild commands bucket per guild; DM/user-install usage buckets under
        // the bot's own id (there's no guild to attribute it to).
        const scope = interaction.guildId ?? interaction.client.user.id;
        recordCommand(scope, interaction.commandName);
    }
};