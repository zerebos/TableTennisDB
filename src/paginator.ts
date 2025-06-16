import {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ButtonInteraction, MessageComponentInteraction} from "discord.js";

export default class Paginator {
    private interaction: CommandInteraction;
    private entries: string[];
    private itemsPerPage: number;
    public embed: EmbedBuilder;
    private numPages: number;
    private currentPage: number = 1;
    private buttonInteraction?: ButtonInteraction;

    constructor(interaction: CommandInteraction, entries: string[], itemsPerPage: number = 10) {
        this.interaction = interaction;
        this.entries = entries;
        this.itemsPerPage = itemsPerPage;
        this.embed = new EmbedBuilder();
        this.numPages = Math.floor(this.entries.length / this.itemsPerPage);
        if (this.entries.length % this.itemsPerPage) this.numPages = this.numPages + 1;
    }

    get buttons() {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("first")
                    .setLabel("<< First")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(this.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId("previous")
                    .setLabel("< Previous")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(this.currentPage === 1),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("Next >")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(this.currentPage === this.numPages),
                new ButtonBuilder()
                    .setCustomId("last")
                    .setLabel("Last >>")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(this.currentPage === this.numPages),
                new ButtonBuilder()
                    .setCustomId("stop")
                    .setLabel("Stop")
                    .setStyle(ButtonStyle.Danger),
        );
    }

    getEntriesForPage(page: number): string[] {
        const base = (page - 1) * this.itemsPerPage;
        return this.entries.slice(base, base + this.itemsPerPage);
    }

    async firstPage() {await this.showPage(1);}
    async lastPage() {await this.showPage(this.numPages);}
    async nextPage() {await this.validatedShowPage(this.currentPage + 1);}
    async previousPage() {await this.validatedShowPage(this.currentPage - 1);}
    async validatedShowPage(page: number) {
        if (page > 0 && page <= this.numPages) await this.showPage(page);
    }

    async showPage(page: number) {
        this.currentPage = page;
        const currentEntries = this.getEntriesForPage(page);
        this.embed.setDescription(currentEntries.map((v, i) => `${i + 1 + ((this.currentPage - 1) * this.itemsPerPage)}. ${v}`).join("\n"));
        this.embed.setFooter({text: `Page ${this.currentPage} of ${this.numPages} (${this.entries.length} items)`});
        if (this.buttonInteraction) await this.buttonInteraction.update({embeds: [this.embed], components: [this.buttons]});
        await this.interaction.editReply({embeds: [this.embed], components: [this.buttons]});
    }

    async paginate() {
        await this.showPage(1);

        const msg = await this.interaction.fetchReply();
        const filter = (i: MessageComponentInteraction) => i.user.id === this.interaction.user.id;

        const collector = msg.createMessageComponentCollector({filter, time: 60000});

        collector.on("collect", async i => {
            this.buttonInteraction = i as ButtonInteraction;
            if (i.customId === "first") await this.firstPage();
            if (i.customId === "last") await this.lastPage();
            if (i.customId === "previous") await this.previousPage();
            if (i.customId === "next") await this.nextPage();
            if (i.customId === "stop") collector.stop();
        });

        collector.on("end", async () => {
            await this.interaction.editReply({components: []});
        });
    }
}
