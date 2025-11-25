import {Events, type Interaction, ChatInputCommandInteraction, MessageFlags, AutocompleteInteraction, ButtonInteraction, ModalSubmitInteraction} from "discord.js";
import {createEventModule, type CommandStats} from "../types";
import {stats} from "../db";

async function addStat(interaction: ChatInputCommandInteraction) {
    const key = interaction.guildId ?? interaction.client.user?.id;
    const name = interaction.commandName;

    // More type-safe approach
    const existingData = await stats.get(key) as CommandStats | undefined;
    const data: CommandStats = existingData ?? {commands: {}};

    // Ensure commands object exists
    data.commands ??= {};

    // Increment command count
    data.commands[name] = (data.commands[name] ?? 0) + 1;

    await stats.set(key, data);
}


export default createEventModule({
    name: Events.InteractionCreate,
    async execute(interaction: Interaction) {
        let commandName = "";
        let executor: "execute" | "autocomplete" | "button" | "modal" = "execute";

        if (interaction.isChatInputCommand()) {
            commandName = interaction.commandName;
            executor = "execute";
            await addStat(interaction);
        }
        else if (interaction.isAutocomplete()) {
            commandName = interaction.commandName;
            executor = "autocomplete";
        }
        else if (interaction.isButton() || interaction.isModalSubmit()) {
            // For hybrid commands, check if we have a registered component handler
            if (interaction.client.componentHandlers?.has(interaction.customId)) {
                const handler = interaction.client.componentHandlers.get(interaction.customId)!;
                try {
                    await handler(interaction);
                }
                catch (error) {
                    console.error("Component handler error:", error);
                    if (interaction.isRepliable()) {
                        await interaction.reply({content: "There was an error while executing this interaction!", flags: MessageFlags.Ephemeral});
                    }
                }
                return;
            }

            // Fall back to legacy handling
            executor = interaction.isButton() ? "button" : "modal";
            commandName = interaction.customId.split("-")[0];
        }

        const command = interaction.client.commands.get(commandName);
        if (!commandName || !command) {
            console.error("Unrecognized interaction", commandName, executor);
            if (interaction.isChatInputCommand() && interaction.isRepliable()) {
                await interaction.reply({content: "Something went wrong! If this persists, please report it to the bot owner!", flags: MessageFlags.Ephemeral});
            }
            return;
        }

        try {
            if (executor === "execute") {
                if ("components" in command) {
                    // Hybrid command execution - pass components if they exist
                    const components = command.components.size > 0 ? command.components : undefined;
                    await command.execute(interaction as ChatInputCommandInteraction, components);
                }
                else {
                    // Legacy command execution
                    await command.execute(interaction as ChatInputCommandInteraction);
                }
            }
            else if (executor === "autocomplete") {
                if (command.autocomplete) {
                    await command.autocomplete(interaction as AutocompleteInteraction);
                }
                else {
                    console.error("Autocomplete handler not found for command", commandName);
                }
            }
            else if (executor === "button" || executor === "modal") {
                // Legacy command execution for button/modal
                if (executor === "button" && "button" in command && command.button) {
                    await command.button(interaction as ButtonInteraction);
                }
                else if (executor === "modal" && "modal" in command && command.modal) {
                    await command.modal(interaction as ModalSubmitInteraction);
                }
                else {
                    console.error("Handler not found for", executor, "on command", commandName);
                }
            }
        }
        catch (error) {
            console.error(error);
            if (interaction.isRepliable()) {
                await interaction.reply({content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral});
            }
        }
    }
});