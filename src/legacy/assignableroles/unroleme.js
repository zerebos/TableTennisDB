const {Command} = require("discord.js-commando");
const {Collection} = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "unroleme",
            aliases: ["iamnot"],
            group: "assignableroles",
            memberName: "unroleme",
            description: "Remove a self assignable role.",
            guildOnly: true,
            args: [
                {
                    key: "roles",
                    prompt: "Which roles would you like to remove?",
                    type: "string"
                }
            ]
        });
    }
    
    async run(msg, args) {
        const reqRoles = args.roles.split(",").map(r => r.trim().toLowerCase());
        const roles = msg.guild.roles.cache.filter(r => reqRoles.includes(r.name.toLowerCase()));
        const assignable = msg.guild.settings.get("assignableroles", {});
        const toRemove = new Collection();
        const dontHave = [];
        const notAssignable = [];
        const removed = [];
        for (const [id, role] of roles) {
            if (!assignable[id]) {
                notAssignable.push(role.name);
                continue;
            }
            if (msg.member.roles.cache.has(id)) {
                removed.push(role.id);
                toRemove.set(id, role);
                continue;
            }
            dontHave.push(role.id);
        }

        if (notAssignable.length) await msg.failure(`Unassignable roles: ${notAssignable.map(r => `<@&${r}>`).join("\n")}`);
        if (dontHave.length) await msg.failure(`You don't have: ${dontHave.map(r => `<@&${r}>`).join("\n")}`);
        if (removed.length) await msg.success(`Successfully removed roles: ${removed.map(r => `<@&${r}>`).join("\n")}`);
        if (toRemove.size) await msg.member.roles.remove(toRemove, "unroleme command");
    }
};