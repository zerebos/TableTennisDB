// src/types.ts
import {AutocompleteInteraction, ChatInputCommandInteraction, Collection, SlashCommandBuilder} from "discord.js";

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
    }
}

// Components (buttons, modals, selects) are handled locally by the command
// that creates them via collectors, so they are not part of this contract —
// only the two interaction kinds the global router dispatches are.
export type CommandModule = {
    data: SlashCommandBuilder;
    owner?: boolean;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface EventModule {
    name: string;
    once?: boolean;
    execute: (...args: unknown[]) => Promise<void>;
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