// src/types.ts
import {AutocompleteInteraction, BaseInteraction, ButtonInteraction, ChatInputCommandInteraction, Collection, ModalSubmitInteraction, SlashCommandBuilder} from "discord.js";

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
        commands: Collection<string, CommandModule>
        revspin: Record<string, RevspinCacheEntry[]>;
    }
}

export type CommandModule = {
    data: SlashCommandBuilder;
    owner?: boolean;
    execute: <T extends BaseInteraction = ChatInputCommandInteraction>(interaction: T) => Promise<void>;
    autocomplete: <T extends BaseInteraction = AutocompleteInteraction>(i: T) => unknown;
    button: <T extends BaseInteraction = ButtonInteraction>(i: T) => unknown;
    modal: <T extends BaseInteraction = ModalSubmitInteraction>(i: T) => unknown;
}

export interface EventModule {
    name: string;
    once?: boolean;
    execute: (...args: unknown[]) => Promise<void>;
}

export interface CommandStats {
    commands?: {
        [key: string]: number;
    }
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