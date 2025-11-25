import {
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    ButtonInteraction,
    TextInputStyle,
    ModalSubmitInteraction,
    EmbedBuilder
} from "discord.js";

export interface ModalFieldConfig {
    customId: string;
    label: string;
    style?: TextInputStyle;
    placeholder?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    value?: string;
}

export interface ModalConfig {
    customId: string;
    title: string;
    fields: ModalFieldConfig[];
    timeout?: number;
}

export interface ModalResult {
    success: boolean;
    values?: Record<string, string>;
    error?: string;
}

/**
 * Reusable modal manager for handling Discord modals with type safety
 * and automatic field validation/collection
 */
export class ModalManager {
    private interaction: ButtonInteraction;
    private timeout: number;

    constructor(interaction: ButtonInteraction, timeout: number = 300000) {
        this.interaction = interaction;
        this.timeout = timeout;
    }

    /**
     * Shows a modal and waits for submission
     */
    async showModal(config: ModalConfig): Promise<ModalResult> {
        const modal = new ModalBuilder()
            .setCustomId(config.customId)
            .setTitle(config.title);

        // Build text input components
        const rows: Array<ActionRowBuilder<TextInputBuilder>> = [];

        for (const fieldConfig of config.fields) {
            const textInput = new TextInputBuilder()
                .setCustomId(fieldConfig.customId)
                .setLabel(fieldConfig.label)
                .setStyle(fieldConfig.style ?? TextInputStyle.Short)
                .setRequired(fieldConfig.required ?? false);

            if (fieldConfig.placeholder) textInput.setPlaceholder(fieldConfig.placeholder);
            if (fieldConfig.minLength) textInput.setMinLength(fieldConfig.minLength);
            if (fieldConfig.maxLength) textInput.setMaxLength(fieldConfig.maxLength);
            if (fieldConfig.value) textInput.setValue(fieldConfig.value);

            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
            rows.push(row);
        }

        modal.addComponents(...rows);

        try {
            await this.interaction.showModal(modal);

            const modalSubmission = await this.interaction.awaitModalSubmit({
                filter: (i) => i.customId === config.customId && i.user.id === this.interaction.user.id,
                time: config.timeout ?? this.timeout
            });

            // Extract field values
            const values: Record<string, string> = {};
            for (const fieldConfig of config.fields) {
                values[fieldConfig.customId] = modalSubmission.fields.getTextInputValue(fieldConfig.customId);
            }

            return {
                success: true,
                values,
                modalSubmission
            } as ModalResult & {modalSubmission: ModalSubmitInteraction};
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Modal submission failed"
            };
        }
    }

    /**
     * Convenience method for simple text modals
     */
    async showTextModal(
        customId: string,
        title: string,
        fields: Array<{
            id: string;
            label: string;
            value?: string;
            required?: boolean;
            style?: TextInputStyle;
        }>
    ): Promise<ModalResult> {
        const modalFields: ModalFieldConfig[] = fields.map(field => ({
            customId: field.id,
            label: field.label,
            value: field.value,
            required: field.required,
            style: field.style ?? TextInputStyle.Short
        }));

        return this.showModal({
            customId,
            title,
            fields: modalFields
        });
    }
}

/**
 * Helper function to update embed fields after modal submission
 */
export function updateEmbedFields(
    originalEmbed: EmbedBuilder,
    fieldUpdates: Array<{
        index: number;
        name: string;
        value: string;
        inline?: boolean;
    }>
): EmbedBuilder {
    const newEmbed = EmbedBuilder.from(originalEmbed);

    // Sort by index in reverse order to avoid index shifting issues
    fieldUpdates.sort((a, b) => b.index - a.index);

    for (const update of fieldUpdates) {
        newEmbed.spliceFields(update.index, 1, {
            name: update.name,
            value: update.value || "\u200B",
            inline: update.inline ?? true
        });
    }

    return newEmbed;
}
