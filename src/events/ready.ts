import type {Client} from "discord.js";
import * as revspin from "../revspin";

export default {
    name: "ready",
    once: true,
    async execute(client: Client) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);
        client.cpuUsage = process.cpuUsage();
        await revspin.load();
    }
};
