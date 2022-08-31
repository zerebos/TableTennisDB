const {Command} = require("discord.js-commando");
const https = require("https");
const Cheerio = require("cheerio");

const months = {january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12};
const monthsDisplay = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "calendar",
            group: "ittf",
            format: "[<month>]",
            memberName: "calendar",
            description: "Shows ITTF events per-month.",
            examples: ["calendar", "calendar jan", "calendar january"],
        });
    }
    
    async run(msg, args) {
        const today = new Date();
        const month = months[args.toLowerCase()] - 1 || today.getMonth();
        const monthName = monthsDisplay[month];
        const url = `https://www.ittf.com/${today.getFullYear()}-event-calendar/`;
        const html = await new Promise(resolve => {
            https.get(url).on("response", function (response) {
                let body = "";
                response.on("data", (chunk) => body += chunk);
                response.on("end", () => resolve(body));
            });
        });
        const $ = Cheerio.load(html);
        const content = $(".content");
        const ul = $(content.find("ul").get(month));
        const description = ul.find("li").map((index, element) => {
            const el = $(element);
            const children = el.children("a");
            if (!children.length) return `- ${el.text()}`.trim();
            const link = children.attr("href");
            const text = children.text();
            return `- [${text}](${link})`.trim();
        }).get().join("\n");
        
        await msg.info({author: {name: `Events in ${monthName}`, url, iconURL: "http://discord.zackrauen.com/TableTennisDB/ittf_logo.png"}, description});
    }
};