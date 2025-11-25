import {
    ChatInputCommandInteraction,
    ButtonInteraction,
    EmbedBuilder,
    ButtonStyle,
    TextInputStyle,
    ComponentType,
    MessageFlags
} from "discord.js";
import {ModalManager, type ModalFieldConfig} from "./ModalManager";

export interface FormField {
    id: string;
    label: string;
    type: "text" | "textarea" | "number";
    required?: boolean;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    defaultValue?: string;
    validation?: (value: string) => string | null; // Returns error message or null if valid
}

export interface FormButton {
    id: string;
    label: string;
    style: ButtonStyle;
    action: "modal" | "submit" | "cancel" | "custom";
    modalTitle?: string; // For modal buttons
    fields?: FormField[]; // Fields to show in modal
    handler?: (interaction: ButtonInteraction, formData: Record<string, string>) => Promise<void>; // For custom buttons
}

export interface FormConfig {
    title: string;
    description?: string;
    fields: FormField[];
    buttons: FormButton[];
    timeout?: number;
    ephemeral?: boolean;
    onSubmit?: (formData: Record<string, string>, interaction: ButtonInteraction) => Promise<void>;
    onCancel?: (interaction: ButtonInteraction) => Promise<void>;
    onTimeout?: () => Promise<void>;
}

export interface FormValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
    data: Record<string, string>;
}

/**
 * High-level form builder that combines embed display, button interactions,
 * and modal collection into a declarative, reusable API
 */
export class FormBuilder {
    private interaction: ChatInputCommandInteraction;
    private config: FormConfig;
    private formData: Record<string, string> = {};
    private embed: EmbedBuilder;

    constructor(interaction: ChatInputCommandInteraction, config: FormConfig) {
        this.interaction = interaction;
        this.config = {
            timeout: 300000, // 5 minutes default
            ephemeral: true,
            ...config
        };
        this.embed = this.createEmbed();
        this.initializeFormData();
    }

    /**
     * Create the initial embed with form data
     */
    private createEmbed(): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setTitle(this.config.title)
            .setColor("Blue");

        if (this.config.description) {
            embed.setDescription(this.config.description);
        }

        return embed;
    }

    /**
     * Initialize form data with default values
     */
    private initializeFormData(): void {
        for (const field of this.config.fields) {
            this.formData[field.id] = field.defaultValue ?? "";
        }
    }

    /**
     * Update the embed with current form data
     */
    private updateEmbed(): void {
        const fields = this.config.fields.map(field => ({
            name: field.label,
            value: this.formData[field.id] || "\u200B", // Zero-width space for empty
            inline: true
        }));

        this.embed.spliceFields(0, this.embed.data.fields?.length ?? 0, ...fields);
    }

    /**
     * Create action row with buttons
     */
    private createActionRow() {
        return {
            type: ComponentType.ActionRow,
            components: this.config.buttons.map(btn => ({
                type: ComponentType.Button,
                customId: btn.id,
                label: btn.label,
                style: btn.style,
                disabled: false
            }))
        };
    }

    /**
     * Create disabled action row (for timeout)
     */
    private createDisabledActionRow() {
        return {
            type: ComponentType.ActionRow,
            components: this.config.buttons.map(btn => ({
                type: ComponentType.Button,
                customId: btn.id,
                label: btn.label,
                style: btn.style,
                disabled: true
            }))
        };
    }

    /**
     * Validate form data
     */
    private validateFormData(): FormValidationResult {
        const errors: Record<string, string> = {};
        const data = {...this.formData};

        for (const field of this.config.fields) {
            const value = data[field.id];

            // Required field validation
            if (field.required && (!value || value.trim() === "")) {
                errors[field.id] = `${field.label} is required`;
                continue;
            }

            // Length validation
            if (value) {
                if (field.minLength && value.length < field.minLength) {
                    errors[field.id] = `${field.label} must be at least ${field.minLength} characters`;
                    continue;
                }
                if (field.maxLength && value.length > field.maxLength) {
                    errors[field.id] = `${field.label} must be no more than ${field.maxLength} characters`;
                    continue;
                }
            }

            // Custom validation
            if (field.validation && value) {
                const validationError = field.validation(value);
                if (validationError) {
                    errors[field.id] = validationError;
                    continue;
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            data
        };
    }

    /**
     * Handle modal button click
     */
    private async handleModalButton(buttonConfig: FormButton, interaction: ButtonInteraction): Promise<void> {
        if (!buttonConfig.fields || buttonConfig.fields.length === 0) {
            await interaction.reply({
                content: "No fields configured for this modal.",
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const modalManager = new ModalManager(interaction);

        // Convert form fields to modal fields
        const modalFields: ModalFieldConfig[] = buttonConfig.fields.map(field => ({
            customId: field.id,
            label: field.label,
            style: field.type === "textarea" ? TextInputStyle.Paragraph : TextInputStyle.Short,
            value: this.formData[field.id] ?? field.defaultValue,
            required: field.required,
            placeholder: field.placeholder,
            minLength: field.minLength,
            maxLength: field.maxLength
        }));

        const result = await modalManager.showModal({
            customId: `${buttonConfig.id}_modal`,
            title: buttonConfig.modalTitle ?? `Edit ${buttonConfig.label}`,
            fields: modalFields
        });

        if (result.success && result.values) {
            // Update form data with modal results
            for (const [fieldId, value] of Object.entries(result.values)) {
                this.formData[fieldId] = value;
            }

            // Update the embed with new data
            this.updateEmbed();

            // Defer the update first, then edit
            await interaction.deferUpdate();
            await interaction.editReply({
                embeds: [this.embed],
                components: [this.createActionRow()]
            });
        }
    }

    /**
     * Handle submit button click
     */
    private async handleSubmit(interaction: ButtonInteraction): Promise<void> {
        const validation = this.validateFormData();

        if (!validation.isValid) {
            const errorMessage = Object.entries(validation.errors)
                .map(([_field, error]) => `• ${error}`)
                .join("\n");

            await interaction.reply({
                content: `❌ **Validation Errors:**\n${errorMessage}`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (this.config.onSubmit) {
            await this.config.onSubmit(validation.data, interaction);
        }
        else {
            await interaction.reply({
                content: "✅ Form submitted successfully!",
                flags: MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Handle cancel button click
     */
    private async handleCancel(interaction: ButtonInteraction): Promise<void> {
        if (this.config.onCancel) {
            await this.config.onCancel(interaction);
        }
        else {
            await interaction.update({
                content: "❌ Form cancelled.",
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Start the form and handle interactions
     */
    async start(): Promise<void> {
        this.updateEmbed();

        const response = await this.interaction.reply({
            embeds: [this.embed],
            components: [this.createActionRow()],
            flags: this.config.ephemeral ? MessageFlags.Ephemeral : undefined
        });

        // Set up button collector
        const collector = response.createMessageComponentCollector({
            filter: (i: ButtonInteraction) => i.user.id === this.interaction.user.id,
            time: this.config.timeout,
            componentType: ComponentType.Button
        });

        collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
            const buttonConfig = this.config.buttons.find(btn => btn.id === buttonInteraction.customId);
            if (!buttonConfig) return;

            try {
                switch (buttonConfig.action) {
                    case "modal":
                        await this.handleModalButton(buttonConfig, buttonInteraction);
                        break;
                    case "submit":
                        await this.handleSubmit(buttonInteraction);
                        break;
                    case "cancel":
                        await this.handleCancel(buttonInteraction);
                        collector.stop();
                        break;
                    case "custom":
                        if (buttonConfig.handler) {
                            await buttonConfig.handler(buttonInteraction, this.formData);
                        }
                        break;
                }
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
        });

        collector.on("end", async () => {
            try {
                await this.interaction.editReply({
                    components: [this.createDisabledActionRow()]
                });

                if (this.config.onTimeout) {
                    await this.config.onTimeout();
                }
            }
            catch (error) {
                console.log("Failed to disable buttons on collector end:", error);
            }
        });
    }

    /**
     * Get current form data
     */
    getFormData(): Record<string, string> {
        return {...this.formData};
    }

    /**
     * Set form data programmatically
     */
    setFormData(data: Partial<Record<string, string>>): void {
        for (const [fieldId, value] of Object.entries(data)) {
            if (value !== undefined) {
                this.formData[fieldId] = value;
            }
        }
        this.updateEmbed();
    }

    /**
     * Get current validation state
     */
    getValidationState(): FormValidationResult {
        return this.validateFormData();
    }
}
