const {Command} = require("discord.js-commando");
const {Collection} = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "roleme",
            aliases: ["iam"],
            group: "assignableroles",
            memberName: "roleme",
            description: "Gives user a self assignable role.",
            guildOnly: true,
            args: [
                {
                    key: "roles",
                    prompt: "Which roles would you like to have?",
                    type: "string"
                }
            ]
        });
    }
    
    async run(msg, args) {
        const reqRoles = args.roles.split(",").map(r => r.trim().toLowerCase());
        const roles = msg.guild.roles.cache.filter(r => reqRoles.includes(r.name.toLowerCase()));
        const assignable = msg.guild.settings.get("assignableroles", {});
        const toAdd = new Collection();
        const added = [];
        const notAssignable = [];
        const alreadyHave = [];
        for (const [id, role] of roles) {
            if (!assignable[id]) {
                notAssignable.push(role.id);
                continue;
            }
            if (msg.member.roles.cache.has(id)) {
                alreadyHave.push(role.id);
                continue;
            }
            toAdd.set(id, role);
            added.push(role.id);
        }

        if (notAssignable.length) await msg.failure(`Unassignable roles: ${notAssignable.map(r => `<@&${r}>`).join("\n")}`);
        if (alreadyHave.length) await msg.failure(`You already have: ${alreadyHave.map(r => `<@&${r}>`).join("\n")}.`);
        if (added.length) await msg.success(`Successfully added roles: ${added.map(r => `<@&${r}>`).join("\n")}`);
        if (toAdd.size) await msg.member.roles.add(toAdd, "roleme command");
    }
};