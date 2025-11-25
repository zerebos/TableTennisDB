# Unified Command Architecture Examples

The `createCommand` function now supports both collector-based and global handler-based commands through optional parameters.

## 🎯 Pattern 1: Collector-Based Commands (Profile, Settings, etc.)

```typescript
export default createCommand({
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Manage your profile"),

    // No components parameter needed - uses collectors directly
    async execute(interaction) {
        const response = await interaction.reply({
            content: "Profile menu",
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.Button,
                    customId: "edit_profile",
                    label: "Edit Profile",
                    style: ButtonStyle.Primary
                }]
            }]
        });

        // Set up collector for this interaction
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000
        });

        collector.on("collect", async (buttonInteraction) => {
            if (buttonInteraction.customId === "edit_profile") {
                // Handle inline
                const modal = new ModalBuilder()...
                await buttonInteraction.showModal(modal);

                // Await modal submission
                const modalSubmission = await buttonInteraction.awaitModalSubmit({...});
                // Handle modal inline
            }
        });
    }

    // No components factory needed
});
```

## 🌐 Pattern 2: Global Handler Commands (Moderation, Persistent UI, etc.)

```typescript
export default createCommand({
    data: new SlashCommandBuilder()
        .setName("modtools")
        .setDescription("Moderation tools"),

    // Components parameter available when components are defined
    async execute(interaction, components) {
        const banButton = components?.get("modtools:btn:ban")?.builder;
        const kickButton = components?.get("modtools:btn:kick")?.builder;

        await interaction.reply({
            content: "Moderation panel",
            components: [{
                type: ComponentType.ActionRow,
                components: [banButton, kickButton]
            }]
        });
    },

    // Components factory creates global handlers
    components(factory) {
        return [
            factory.button("ban", async (interaction) => {
                // Global handler - works across all servers/users
                const user = await getUserFromContext(interaction);
                await banUser(user);
                await interaction.reply("User banned!");
            }),

            factory.button("kick", async (interaction) => {
                // Global handler - persistent across bot restarts
                const user = await getUserFromContext(interaction);
                await kickUser(user);
                await interaction.reply("User kicked!");
            })
        ];
    }
});
```

## 🔄 How the System Works

### Type Detection
```typescript
// In createCommand function:
const componentMap = config.components?.(componentFactory) || new Map();

return {
    execute: (interaction) =>
        config.execute(interaction, componentMap.size > 0 ? componentMap : undefined)
};
```

### Interaction Routing
```typescript
// In interaction handler:
if (executor === "execute") {
    if ("components" in command) {
        const components = command.components.size > 0 ? command.components : undefined;
        await command.execute(interaction, components);
    } else {
        await command.execute(interaction); // Legacy commands
    }
}
```

## ✅ Benefits

1. **Single Factory**: One `createCommand` function for all patterns
2. **Type Safety**: TypeScript infers whether components are available
3. **Flexibility**: Commands choose their interaction pattern naturally
4. **Backward Compatible**: Existing commands work unchanged
5. **Clear Intent**: Components parameter presence indicates the pattern used

## 📋 When to Use Each Pattern

| Use Case | Pattern | Reason |
|----------|---------|---------|
| User profiles | Collector | Personal, temporary, scoped |
| Settings panels | Collector | User-specific, session-based |
| Pagination | Collector | Temporary, user-specific |
| Moderation tools | Global | Cross-user, persistent |
| Role buttons | Global | Always available, cross-user |
| Public utilities | Global | Persistent, high-traffic |

## 🔧 Realistic Examples of Permanent Buttons

### **1. Role Selection System**
```typescript
export default createCommand({
    data: new SlashCommandBuilder()
        .setName("setup-roles")
        .setDescription("Setup persistent role selection"),

    async execute(interaction, components) {
        const roleButtons = [
            components?.get("roles:btn:developer")?.builder,
            components?.get("roles:btn:designer")?.builder,
            components?.get("roles:btn:tester")?.builder
        ];

        const embed = new EmbedBuilder()
            .setTitle("🎭 Select Your Roles")
            .setDescription("Click buttons below to toggle roles. These work permanently!");

        await interaction.reply({
            embeds: [embed],
            components: [{
                type: ComponentType.ActionRow,
                components: roleButtons
            }]
        });
    },

    components(factory) {
        return [
            factory.button("developer", async (interaction) => {
                const role = interaction.guild?.roles.cache.find(r => r.name === "Developer");
                if (!role) return;

                const member = interaction.member as GuildMember;
                if (member.roles.cache.has(role.id)) {
                    await member.roles.remove(role);
                    await interaction.reply({content: "❌ Removed Developer role", ephemeral: true});
                } else {
                    await member.roles.add(role);
                    await interaction.reply({content: "✅ Added Developer role", ephemeral: true});
                }
            }),

            factory.button("designer", async (interaction) => {
                // Similar role toggle logic...
            }),

            factory.button("tester", async (interaction) => {
                // Similar role toggle logic...
            })
        ];
    }
});
```

**Why Permanent?**
- Works for **anyone** who finds the message (even months later)
- No timeout - available 24/7
- Survives bot restarts
- Multiple users can use simultaneously

### **2. Support Ticket System**
```typescript
export default createCommand({
    data: new SlashCommandBuilder()
        .setName("setup-support")
        .setDescription("Setup support ticket system"),

    async execute(interaction, components) {
        const ticketButton = components?.get("support:btn:create-ticket")?.builder;

        const embed = new EmbedBuilder()
            .setTitle("🎫 Need Help?")
            .setDescription("Click the button below to create a private support ticket")
            .setColor("Blue");

        // Pin this message for permanent access
        const response = await interaction.reply({
            embeds: [embed],
            components: [{
                type: ComponentType.ActionRow,
                components: [ticketButton]
            }]
        });

        if (interaction.channel?.type === ChannelType.GuildText) {
            await response.pin();
        }
    },

    components(factory) {
        return [
            factory.button("create-ticket", async (interaction) => {
                // Create private thread for support
                const channel = interaction.channel as TextChannel;
                const thread = await channel.threads.create({
                    name: `ticket-${interaction.user.username}-${Date.now()}`,
                    type: ChannelType.PrivateThread,
                    reason: `Support ticket created by ${interaction.user.tag}`
                });

                await thread.members.add(interaction.user.id);

                await interaction.reply({
                    content: `✅ Created your support ticket: ${thread}`,
                    ephemeral: true
                });

                await thread.send({
                    content: `Hello ${interaction.user}! Support staff will be with you shortly.`,
                    embeds: [new EmbedBuilder()
                        .setTitle("🎫 Support Ticket")
                        .setDescription("Please describe your issue in detail")
                        .setColor("Green")]
                });
            })
        ];
    }
});
```

**Why Permanent?**
- Users need help at **any time**
- No timeout restrictions
- Works for all server members
- Support staff don't need to recreate the system

### **3. Moderation Quick Actions**
```typescript
export default createCommand({
    data: new SlashCommandBuilder()
        .setName("mod-panel")
        .setDescription("Setup moderation panel"),

    async execute(interaction, components) {
        if (!interaction.memberPermissions?.has("ModerateMembers")) {
            return await interaction.reply({content: "❌ You need moderation permissions", ephemeral: true});
        }

        const modButtons = [
            components?.get("mod:btn:timeout-user")?.builder,
            components?.get("mod:btn:kick-user")?.builder,
            components?.get("mod:btn:ban-user")?.builder,
            components?.get("mod:btn:clear-messages")?.builder
        ];

        await interaction.reply({
            content: "🛡️ **Moderation Panel** - Right-click a message → Apps → Moderate User",
            components: [{
                type: ComponentType.ActionRow,
                components: modButtons.slice(0, 4)
            }],
            ephemeral: true // Only mods see this
        });
    },

    components(factory) {
        return [
            factory.button("timeout-user", async (interaction) => {
                // Show modal to select user and duration
                const modal = new ModalBuilder()
                    .setCustomId("timeout_modal")
                    .setTitle("Timeout User");
                // ... modal logic
            }),

            factory.button("kick-user", async (interaction) => {
                // Quick kick action with confirmation
            }),

            factory.button("ban-user", async (interaction) => {
                // Ban action with reason modal
            }),

            factory.button("clear-messages", async (interaction) => {
                // Bulk message deletion
            })
        ];
    }
});
```

**Why Permanent?**
- Moderation happens **24/7**
- Multiple moderators need access
- Emergency situations require immediate access
- No timeout delays for urgent actions

### **4. Server Information Hub**
```typescript
export default createCommand({
    data: new SlashCommandBuilder()
        .setName("setup-info")
        .setDescription("Setup server information hub"),

    async execute(interaction, components) {
        const infoButtons = [
            components?.get("info:btn:rules")?.builder,
            components?.get("info:btn:channels")?.builder,
            components?.get("info:btn:staff")?.builder,
            components?.get("info:btn:bots")?.builder
        ];

        const embed = new EmbedBuilder()
            .setTitle("📚 Server Information")
            .setDescription("Click buttons below to learn about our server!")
            .setThumbnail(interaction.guild?.iconURL())
            .setColor("Purple");

        await interaction.reply({
            embeds: [embed],
            components: [{
                type: ComponentType.ActionRow,
                components: infoButtons
            }]
        });
    },

    components(factory) {
        return [
            factory.button("rules", async (interaction) => {
                const rulesEmbed = new EmbedBuilder()
                    .setTitle("📜 Server Rules")
                    .setDescription("1. Be respectful\n2. No spam\n3. Use appropriate channels")
                    .setColor("Red");

                await interaction.reply({embeds: [rulesEmbed], ephemeral: true});
            }),

            factory.button("channels", async (interaction) => {
                const channels = interaction.guild?.channels.cache
                    .filter(c => c.type === ChannelType.GuildText)
                    .map(c => `${c} - ${c.topic || 'No description'}`)
                    .join('\n');

                await interaction.reply({
                    content: `📂 **Server Channels:**\n${channels}`,
                    ephemeral: true
                });
            }),

            factory.button("staff", async (interaction) => {
                // Show staff list
            }),

            factory.button("bots", async (interaction) => {
                // Show bot information
            })
        ];
    }
});
```

**Why Permanent?**
- New members join **constantly**
- Information is always relevant
- Reduces repetitive questions
- Works without staff intervention

### **5. Event Management System**
```typescript
export default createCommand({
    data: new SlashCommandBuilder()
        .setName("setup-events")
        .setDescription("Setup event signup system"),

    async execute(interaction, components) {
        const eventButtons = [
            components?.get("events:btn:weekly-tournament")?.builder,
            components?.get("events:btn:game-night")?.builder,
            components?.get("events:btn:community-meetup")?.builder
        ];

        await interaction.reply({
            content: "🎉 **Upcoming Events** - Click to join!",
            components: [{
                type: ComponentType.ActionRow,
                components: eventButtons
            }]
        });
    },

    components(factory) {
        return [
            factory.button("weekly-tournament", async (interaction) => {
                // Add user to tournament participants
                const tournamentRole = interaction.guild?.roles.cache.find(r => r.name === "Tournament Participant");
                if (tournamentRole) {
                    const member = interaction.member as GuildMember;
                    await member.roles.add(tournamentRole);
                    await interaction.reply({
                        content: "✅ You're signed up for the weekly tournament!",
                        ephemeral: true
                    });
                }
            }),

            factory.button("game-night", async (interaction) => {
                // Game night signup logic
            }),

            factory.button("community-meetup", async (interaction) => {
                // Meetup signup logic
            })
        ];
    }
});
```

**Why Permanent?**
- Events announced **weeks in advance**
- People sign up over time
- No rush/timeout pressure
- Works across time zones

## 🆚 Collector vs Permanent Comparison

| Scenario | Pattern | Reason |
|----------|---------|---------|
| **"Edit your profile"** | Collector | Personal, temporary session |
| **"Join Developer role"** | Permanent | Public, always available |
| **"Configure bot settings"** | Collector | Admin-only, one-time setup |
| **"Create support ticket"** | Permanent | Anyone needs help anytime |
| **"Paginate search results"** | Collector | Specific to one search query |
| **"Server rules & info"** | Permanent | New members always joining |
| **"Quick moderation"** | Permanent | Emergencies happen 24/7 |
| **"Event signups"** | Permanent | Long registration periods |
