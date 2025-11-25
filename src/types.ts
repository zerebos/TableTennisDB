// src/types.ts
import {AutocompleteInteraction, ButtonInteraction, ChatInputCommandInteraction, Collection, ModalSubmitInteraction, SlashCommandBuilder, StringSelectMenuInteraction, type ClientEvents, ButtonBuilder, ModalBuilder, StringSelectMenuBuilder, Events} from "discord.js";

export interface ProfileData {
    forehand?: string;
    backhand?: string;
    blade?: string;
    strengths?: string;
    weaknesses?: string;
    playstyle?: string;
}

// export interface ExtendedClient extends Client {
//     cpuUsage?: NodeJS.CpuUsage;
//     commands: Collection<string, CommandModule>
//     revspin?: Record<string, object>;
// }

export interface RevspinCacheEntry {
    similarity: number;
    name: string;
    href: string;
}

// Extend the Discord.js Client interface globally
declare module "discord.js" {
    interface Client {
        cpuUsage: NodeJS.CpuUsage;
        commands: Collection<string, CommandModule | HybridCommandModule>;
        componentHandlers?: Map<string, (interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction) => Promise<void>>;
        revspin: Record<string, RevspinCacheEntry[]>;
    }
}

export type CommandModule = {
    data: SlashCommandBuilder;
    owner?: boolean;
    guildId: string;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
    button?: (interaction: ButtonInteraction) => Promise<void>;
    modal?: (interaction: ModalSubmitInteraction) => Promise<void>;
};

export interface EventModule<T extends keyof ClientEvents = keyof ClientEvents> {
    name: T;
    once?: boolean;
    execute: (...args: ClientEvents[T]) => Promise<void>;
}

// Helper function to create event modules with type safety and DRY principle
export function createEventModule<T extends keyof ClientEvents>(
    config: {
        name: T,
        once?: boolean;
        execute: (...args: ClientEvents[T]) => Promise<void>;
    }
): EventModule<T> {
    return {
        name: config.name,
        once: config.once,
        execute: config.execute
    };
}

export interface CommandStats {
    commands?: {
        [key: string]: number;
    };
}


/**
 * @example
 * const examplePlayer = {
 *    Active: true,
 *    addDTime: "2015-10-29T22:38:42.247",
 *    eligibilityUsed: 1,
 *    eligible: true,
 *    email: "",
 *    firstName: "Edsel",
 *    firstSeason: 17,
 *    id: 11845,
 *    isWoman: false,
 *    lastName: "Theodore",
 *    lastSeason: 17,
 *    operationalStatus: "Approved",
 *    rating: 553,
 *    school: 231,
 *    updDTime: "2016-02-01T23:09:58.157",
 *    usatt: ""
 * };
 */
export interface NCTTAPlayer {
    Active: boolean;
    addDTime: string;
    eligibilityUsed: number;
    eligible: boolean;
    email: string;
    firstName: string;
    firstSeason: number;
    id: number;
    isWoman: boolean;
    lastName: string;
    lastSeason: number;
    operationalStatus: string;
    rating: number;
    school: number;
    updDTime: string;
    usatt: string;
}

// Component definition interface for hybrid architecture
export interface ComponentDefinition {
    id: string;
    handler: (interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction) => Promise<void>;
    builder: ButtonBuilder | ModalBuilder | StringSelectMenuBuilder;
}

// Component factory for creating type-safe components
export class ComponentFactory {
    constructor(private commandName: string) {}

    button(id: string, handler: (interaction: ButtonInteraction) => Promise<void>): ComponentDefinition {
        const uniqueId = `${this.commandName}:btn:${id}`;
        const builder = new ButtonBuilder().setCustomId(uniqueId);

        return {
            id: uniqueId,
            handler: handler as (interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction) => Promise<void>,
            builder
        };
    }

    modal(id: string, handler: (interaction: ModalSubmitInteraction) => Promise<void>): ComponentDefinition {
        const uniqueId = `${this.commandName}:modal:${id}`;
        const builder = new ModalBuilder().setCustomId(uniqueId);

        return {
            id: uniqueId,
            handler: handler as (interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction) => Promise<void>,
            builder
        };
    }

    selectMenu(id: string, handler: (interaction: StringSelectMenuInteraction) => Promise<void>): ComponentDefinition {
        const uniqueId = `${this.commandName}:select:${id}`;
        const builder = new StringSelectMenuBuilder().setCustomId(uniqueId);

        return {
            id: uniqueId,
            handler: handler as (interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction) => Promise<void>,
            builder
        };
    }
}

// Event factory for creating type-safe events
export class EventFactory {
    constructor(private commandName: string) {}

    event<T extends keyof ClientEvents>(
        name: T,
        handler: (...args: ClientEvents[T]) => Promise<void>,
        options?: {once?: boolean;}
    ): EventModule<T> {
        return createEventModule({
            name,
            once: options?.once,
            execute: async (...args: ClientEvents[T]) => {
                try {
                    await handler(...args);
                }
                catch (error) {
                    console.error(`[${this.commandName}] Error in ${name} event:`, error);
                }
            }
        });
    }

    // Convenient shortcuts
    ready(handler: (...args: ClientEvents["ready"]) => Promise<void>, once = true) {
        return this.event(Events.ClientReady as "ready", handler, {once});
    }

    guildCreate(handler: (...args: ClientEvents["guildCreate"]) => Promise<void>) {
        return this.event(Events.GuildCreate as "guildCreate", handler);
    }

    voiceStateUpdate(handler: (...args: ClientEvents["voiceStateUpdate"]) => Promise<void>) {
        return this.event(Events.VoiceStateUpdate as "voiceStateUpdate", handler);
    }

    messageCreate(handler: (...args: ClientEvents["messageCreate"]) => Promise<void>) {
        return this.event(Events.MessageCreate as "messageCreate", handler);
    }
}

// Enhanced hybrid command module interface
export interface HybridCommandModule {
    data: SlashCommandBuilder;
    owner?: boolean;
    execute: (interaction: ChatInputCommandInteraction, components?: Map<string, ComponentDefinition>) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
    components: Map<string, ComponentDefinition>;
    events?: Array<EventModule<keyof ClientEvents>>;
    cleanup?: () => Promise<void>;
}

// Enhanced createCommand function
export function createCommand(config: {
    data: SlashCommandBuilder;
    owner?: boolean;
    execute: (interaction: ChatInputCommandInteraction, components?: Map<string, ComponentDefinition>) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
    components?: (factory: ComponentFactory) => ComponentDefinition[];
    events?: (factory: EventFactory) => Array<EventModule<keyof ClientEvents>>;
    cleanup?: () => Promise<void>;
}): HybridCommandModule {
    const commandName = config.data.name;
    const componentFactory = new ComponentFactory(commandName);
    const eventFactory = new EventFactory(commandName);

    // Setup components and create lookup map
    const componentDefs = config.components?.(componentFactory) || [];
    const componentMap = new Map<string, ComponentDefinition>();
    componentDefs.forEach(def => componentMap.set(def.id, def));

    // Setup events
    const events = config.events?.(eventFactory) || [];

    return {
        data: config.data,
        owner: config.owner,
        execute: (interaction) => config.execute(interaction, componentMap.size > 0 ? componentMap : undefined),
        autocomplete: config.autocomplete,
        components: componentMap,
        events: events.length > 0 ? events : undefined,
        cleanup: config.cleanup
    };
}