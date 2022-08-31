const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "addrole",
            aliases: ["asar"],
            group: "assignableroles",
            memberName: "addrole",
            description: "Adds roles to the list of self-assignable roles.",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"],
            args: [
                {
                    key: "roles",
                    prompt: "Which roles should be self assignable?",
                    type: "string"
                }
            ]
        });
    }
    
    async run(msg, args) {
        const reqRoles = args.roles.split(",").map(r => r.trim().toLowerCase());
        const roles = msg.guild.roles.cache.filter(r => reqRoles.includes(r.name.toLowerCase()));
        const assignable = msg.guild.settings.get("assignableroles", {});
        const alreadyAssignable = [];
        const added = [];

        for (const [id, role] of roles) {
            if (assignable[id]) {
                alreadyAssignable.push(role.id);
                continue;
            }
            assignable[id] = 1;
            added.push(role.id);
        }
        if (alreadyAssignable.length) await msg.failure(`Already assignable roles: ${alreadyAssignable.map(r => `<@&${r}>`).join("\n")}`);
        if (added.length) await msg.success(`Roles now self-assignable: ${added.map(r => `<@&${r}>`).join("\n")}`);
        await msg.guild.settings.set("assignableroles", assignable);
    }
};