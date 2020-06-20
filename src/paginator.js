// pager = Pages(self.bot, message=ctx.message, entries=list(data.keys()))
// pager.embed.colour = 0x738bd7  # blurple
// pager.embed.set_author(name=ctx.message.server.name + " Reactions", icon_url=ctx.message.server.icon_url)
// await pager.paginate()

const {MessageEmbed} = require("discord.js");

module.exports = class Paginator {
    constructor(client, command, entries, itemsPerPage = 10) {
        this.client = client;
        this.command = command;
        this.entries = entries;
        this.itemsPerPage = itemsPerPage;
        this.numPages = Math.floor(this.entries.length / this.itemsPerPage);
        if (this.entries.length % this.itemsPerPage) this.numPages = this.numPages + 1;
        this.embed = new MessageEmbed();
        this.reactions = [
            this.numPages > 2 && ["⏪", this.firstPage.bind(this)],
            ["◀️", this.previousPage.bind(this)],
            ["▶️", this.nextPage.bind(this)],
            this.numPages > 2 && ["⏩", this.lastPage.bind(this)],
            // ["\N{INPUT SYMBOL FOR NUMBERS}", this.numbered_page .bind(this)],
            ["⏹️", c => c.stop("user")],
            // ["\N{INFORMATION SOURCE}", this.show_help.bind(this)],
        ].filter(r => r);
    }

    getEntriesForPage(page) {
        const base = (page - 1) * this.itemsPerPage;
        return this.entries.slice(base, base + this.itemsPerPage);
    }

    async firstPage() {await this.showPage(1);}
    async lastPage() {await this.showPage(this.numPages);}
    async nextPage() {await this.validatedShowPage(this.currentPage + 1);}
    async previousPage() {await this.validatedShowPage(this.currentPage - 1);}
    async validatedShowPage(page) {
        if (page > 0 && page <= this.numPages) await this.showPage(page);
    }

    async showPage(page) {
        this.currentPage = page;
        const currentEntries = this.getEntriesForPage(page);
        this.embed.setDescription(currentEntries.map((v, i) => `${i + 1 + ((this.currentPage - 1) * this.itemsPerPage)}. ${v}`).join("\n"));
        this.embed.setFooter(`Page ${this.currentPage} of ${this.numPages} (${this.entries.length} items)`);
        if (this.message) return await this.message.edit("", this.embed);
        this.message = await this.command.channel.send(this.embed);
        for (const reaction of this.reactions) await this.message.react(reaction[0]);
    }

    async paginate() {
        await this.showPage(1);

        // while (this.stillNavigating) {
        //     const reactionCollector = (r, u) => u.id === this.message.author.id && this.reactions.find(e => e[0] == e.emoji.name);
        //     const reactions = await this.message.awaitReactions(reactionCollector, {max: 1, time: 30000});
        // }

        const filter = (r, u) => u.id === this.command.author.id && this.reactions.find(e => e[0] == r.emoji.name);
        const collector = await this.message.createReactionCollector(filter, {idle: 60000});
        collector.on("collect", (r, u) => {
            const action = this.reactions.find(e => e[0] == r.emoji.name)[1];
            r.users.remove(u);
            collector.resetTimer();
            action(collector);
        });
        collector.on("end", () => this.message.reactions.removeAll());
    }
};
