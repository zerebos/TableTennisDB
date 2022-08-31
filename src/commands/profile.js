const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle} = require("discord.js");
const path = require("path");
const Keyv = require("keyv");
const profiles = new Keyv("sqlite://" + path.resolve(__dirname, "..", "..", "settings.sqlite3"), {namespace: "profiles"});

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Share or edit your table tennis profile!")
        .addSubcommand(cmd => cmd.setName("view").setDescription("View and share your profile!"))
        .addSubcommand(cmd => cmd.setName("edit").setDescription("Modify or setup your profile!")),

    /** 
     * @param interaction {import("discord.js").CommandInteraction}
     */
    async execute(interaction) {
        const command = interaction.options.getSubcommand();
        if (command === "view") return await this.view(interaction);
        if (command === "edit") return await this.edit(interaction);
    },

    async view(interaction) {
        const profile = await profiles.get(interaction.user.id);

        if (!profile) {
            const noEmbed = new EmbedBuilder().setColor("Red").setDescription("No profile found, please set one up using `/editprofile`!");
            return await interaction.reply({embeds: [noEmbed]});
        }

        const profileEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setAuthor({name: `${interaction.user.username}'s Profile`, iconURL: interaction.user.avatarURL()})
            .addFields(
                {name: "Forehand", value: profile.forehand ?? "\u200B", inline: true},
                {name: "Backhand", value: profile.backhand ?? "\u200B", inline: true},
                {name: "Blade", value: profile.blade ?? "\u200B", inline: true},
                
                {name: "Strengths", value: profile.strengths ?? "\u200B", inline: true},
                {name: "Weaknesses", value: profile.weaknesses ?? "\u200B", inline: true},
                {name: "Playstyle", value: profile.playstyle ?? "\u200B", inline: true},
            );

        await interaction.reply({embeds: [profileEmbed]});
    },

    async edit(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("profile-save")
                    .setLabel("Save")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("profile-gear")
                    .setLabel("Edit Gear")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("profile-skills")
                    .setLabel("Edit Skills")
                    .setStyle(ButtonStyle.Secondary),
        );

        const profile = await profiles.get(interaction.user.id);

        const profileEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setAuthor({name: `${interaction.user.username}'s Profile`, iconURL: interaction.user.avatarURL()})
            .addFields(
                {name: "Forehand", value: profile.forehand ?? "\u200B", inline: true},
                {name: "Backhand", value: profile.backhand ?? "\u200B", inline: true},
                {name: "Blade", value: profile.blade ?? "\u200B", inline: true},
                
                {name: "Strengths", value: profile.strengths ?? "\u200B", inline: true},
                {name: "Weaknesses", value: profile.weaknesses ?? "\u200B", inline: true},
                {name: "Playstyle", value: profile.playstyle ?? "\u200B", inline: true},
            );

        await interaction.reply({embeds: [profileEmbed], components: [row], ephemeral: true});
    },

    /** 
     * @param interaction {import("discord.js").ButtonInteraction}
     */
    async button(interaction) {
        const id = interaction.customId.split("-")[1];

        if (id === "gear") {
            const modal = new ModalBuilder().setTitle("Add Your Gear").setCustomId("profile-gear");
            const forehand = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("forehand").setLabel("Forehand").setStyle(TextInputStyle.Short));
            const backhand = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("backhand").setLabel("Backhand").setStyle(TextInputStyle.Short));
            const blade = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("blade").setLabel("Blade").setStyle(TextInputStyle.Short));
            modal.addComponents(forehand, backhand, blade);
            await interaction.showModal(modal);
        }
        if (id === "skills") {
            const modal = new ModalBuilder().setTitle("Add Your Skills").setCustomId("profile-skills");
            const strengths = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("strengths").setLabel("Strengths").setStyle(TextInputStyle.Short));
            const weaknesses = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("weaknesses").setLabel("Weaknesses").setStyle(TextInputStyle.Short));
            const playstyle = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("playstyle").setLabel("Playstyle").setStyle(TextInputStyle.Short));
            modal.addComponents(strengths, weaknesses, playstyle);
            await interaction.showModal(modal);
        }
        if (id === "save") {
            const data = {};
            interaction.message.embeds[0].fields.map(f => ({[f.name]: f.value}));
            interaction.message.embeds[0].fields.forEach(f => data[f.name.toLowerCase()] = f.value);
            await profiles.set(interaction.user.id, data);
            await interaction.update({embeds: [new EmbedBuilder().setColor("Green").setDescription("Profile saved successfully!")], components: []});
        }
    },

    /** 
     * @param interaction {import("discord.js").ModalSubmitInteraction}
     */
    async modal(interaction) {
    const id = interaction.customId.split("-")[1];
    if (id === "skills") return await this.skills(interaction);
    return await this.gear(interaction);
    },

    /** 
     * @param interaction {import("discord.js").ModalSubmitInteraction}
     */
    async gear(interaction) {
        const forehand = interaction.fields.getTextInputValue("forehand");
        const backhand = interaction.fields.getTextInputValue("backhand");
        const blade = interaction.fields.getTextInputValue("blade");
        interaction.message.embeds[0].fields[0].value = forehand;
        interaction.message.embeds[0].fields[1].value = backhand;
        interaction.message.embeds[0].fields[2].value = blade;
        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        await interaction.update({embeds: [newEmbed]});
    },

    /** 
     * @param interaction {import("discord.js").ModalSubmitInteraction}
     */
    async skills(interaction) {
        const strengths = interaction.fields.getTextInputValue("strengths");
        const weaknesses = interaction.fields.getTextInputValue("weaknesses");
        const playstyle = interaction.fields.getTextInputValue("playstyle");
        interaction.message.embeds[0].fields[3].value = strengths;
        interaction.message.embeds[0].fields[4].value = weaknesses;
        interaction.message.embeds[0].fields[5].value = playstyle;
        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        await interaction.update({embeds: [newEmbed]});
    },
};
