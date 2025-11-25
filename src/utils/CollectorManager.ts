import {
    ButtonInteraction,
    ChatInputCommandInteraction,
    ComponentType,
    ButtonStyle,
    MessageFlags,
    InteractionResponse,
    Message,
    EmbedBuilder
} from "discord.js";

export interface ButtonConfig {
    customId: string;
    label: string;
    style: ButtonStyle;
    disabled?: boolean;
    emoji?: string;
}

export interface CollectorConfig {
    timeout?: number;
    filter?: (interaction: ButtonInteraction) => boolean;
    onTimeout?: () => Promise<void> | void;
}

export type ButtonHandler = (interaction: ButtonInteraction) => Promise<void> | void;

/**
 * Reusable collector manager for handling button interactions
 * with automatic cleanup and timeout handling
 */
export class CollectorManager {
    private interaction: ChatInputCommandInteraction;
    private response: InteractionResponse<boolean> | Message<boolean> | null = null;
    private handlers: Map<string, ButtonHandler> = new Map();
    private buttons: ButtonConfig[] = [];
    private config: CollectorConfig;

    constructor(interaction: ChatInputCommandInteraction, config: CollectorConfig = {}) {
        this.interaction = interaction;
        this.config = {
            timeout: 300000, // 5 minutes default
            filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
            ...config
        };
    }

    /**
     * Add a button with its handler
     */
    addButton(button: ButtonConfig, handler: ButtonHandler): this {
        this.buttons.push(button);
        this.handlers.set(button.customId, handler);
        return this;
    }

    /**
     * Add multiple buttons at once
     */
    addButtons(buttonsWithHandlers: Array<{button: ButtonConfig; handler: ButtonHandler}>): this {
        for (const {button, handler} of buttonsWithHandlers) {
            this.addButton(button, handler);
        }
        return this;
    }

    /**
     * Create the action row with all buttons
     */
    private createActionRow() {
        return {
            type: ComponentType.ActionRow,
            components: this.buttons.map(btn => ({
                type: ComponentType.Button,
                customId: btn.customId,
                label: btn.label,
                style: btn.style,
                disabled: btn.disabled ?? false,
                emoji: btn.emoji
            }))
        };
    }

    /**
     * Create disabled version of buttons (for timeout)
     */
    private createDisabledActionRow() {
        return {
            type: ComponentType.ActionRow,
            components: this.buttons.map(btn => ({
                type: ComponentType.Button,
                customId: btn.customId,
                label: btn.label,
                style: btn.style,
                disabled: true,
                emoji: btn.emoji
            }))
        };
    }

    /**
     * Start the collector and handle interactions
     */
    async start(replyOptions: {
        content?: string;
        embeds?: unknown[];
        ephemeral?: boolean;
    }): Promise<void> {
        const components = this.buttons.length > 0 ? [this.createActionRow()] : [];

        this.response = await this.interaction.reply({
            ...replyOptions,
            components,
            flags: replyOptions.ephemeral ? MessageFlags.Ephemeral : undefined
        });

        if (this.buttons.length === 0) return; // No buttons, no collector needed

        const collector = this.response.createMessageComponentCollector({
            filter: this.config.filter!,
            time: this.config.timeout,
            componentType: ComponentType.Button
        });

        collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
            const handler = this.handlers.get(buttonInteraction.customId);
            if (handler) {
                try {
                    await handler(buttonInteraction);
                }
                catch (error) {
                    console.error(`Error handling button ${buttonInteraction.customId}:`, error);
                    if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                        await buttonInteraction.reply({
                            content: "An error occurred while processing your request.",
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            }
        });

        collector.on("end", async () => {
            try {
                // Disable all buttons when collector expires
                const disabledComponents = this.buttons.length > 0 ? [this.createDisabledActionRow()] : [];
                await this.interaction.editReply({components: disabledComponents});

                if (this.config.onTimeout) {
                    await this.config.onTimeout();
                }
            }
            catch (error) {
                // Ignore errors if message was already deleted
                console.log("Failed to disable buttons on collector end:", error);
            }
        });
    }

    /**
     * Stop the collector early
     */
    async stop(): Promise<void> {
        try {
            const disabledComponents = this.buttons.length > 0 ? [this.createDisabledActionRow()] : [];
            await this.interaction.editReply({components: disabledComponents});
        }
        catch (error) {
            console.log("Failed to disable buttons on manual stop:", error);
        }
    }

    /**
     * Update the message (useful for handlers that need to update content)
     */
    async updateMessage(options: {
        content?: string;
        embeds?: any[];
        components?: any[];
    }): Promise<void> {
        if (!this.response) return;

        await this.interaction.editReply({
            ...options,
            components: options.components ?? [this.createActionRow()]
        });
    }
}

/**
 * Helper function to create common button configs
 */
export const ButtonConfigs = {
    "save": (): ButtonConfig => ({
        customId: "save",
        label: "Save",
        style: ButtonStyle.Success
    }),

    "cancel": (): ButtonConfig => ({
        customId: "cancel",
        label: "Cancel",
        style: ButtonStyle.Secondary
    }),

    "delete": (): ButtonConfig => ({
        customId: "delete",
        label: "Delete",
        style: ButtonStyle.Danger
    }),

    "edit": (customId: string = "edit"): ButtonConfig => ({
        customId,
        label: "Edit",
        style: ButtonStyle.Secondary
    }),

    "confirm": (): ButtonConfig => ({
        customId: "confirm",
        label: "Confirm",
        style: ButtonStyle.Success
    }),

    // Navigation buttons
    "previous": (): ButtonConfig => ({
        customId: "previous",
        label: "◀ Previous",
        style: ButtonStyle.Primary
    }),

    "next": (): ButtonConfig => ({
        customId: "next",
        label: "Next ▶",
        style: ButtonStyle.Primary
    }),

    "first": (): ButtonConfig => ({
        customId: "first",
        label: "⏮ First",
        style: ButtonStyle.Primary
    }),

    "last": (): ButtonConfig => ({
        customId: "last",
        label: "Last ⏭",
        style: ButtonStyle.Primary
    })
};
