const {Command} = require("discord.js-commando");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "removerole",
            aliases: ["rsar"],
            group: "assignableroles",
            memberName: "removerole",
            description: "Removes roles from the list of self-assignable roles.",
            guildOnly: true,
            userPermissions: ["MANAGE_ROLES"],
            args: [
                {
                    key: "roles",
                    prompt: "Which roles should no longer be self assignable?",
                    type: "string"
                }
            ]
        });
    }
    
    async run(msg, args) {
        const reqRoles = args.roles.split(",").map(r => r.trim().toLowerCase());
        const roles = msg.guild.roles.cache.filter(r => reqRoles.includes(r.name.toLowerCase()));
        const assignable = msg.guild.settings.get("assignableroles", {});
        const notAssignable = [];
        const removed = [];

        for (const [id, role] of roles) {
            if (!assignable[id]) {
                notAssignable.push(role.id);
                // await msg.say(`> Role \`${role.name}\` is not self assignable.`);
                continue;
            }
            delete assignable[id];
            removed.push(role.id);
            // await msg.say(`> Role \`${role.name}\` is no longer self assignable.`);
        }
        if (notAssignable.length) await msg.failure(`Not assignable roles: ${notAssignable.map(r => `<@&${r}>`).join("\n")}`);
        if (removed.length) await msg.success(`Roles no longer self-assignable: ${removed.map(r => `<@&${r}>`).join("\n")}`);
        await msg.guild.settings.set("assignableroles", assignable);
    }
};