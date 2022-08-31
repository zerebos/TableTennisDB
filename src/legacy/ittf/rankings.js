const {Command} = require("discord.js-commando");
const {Constants} = require("discord.js");
const https = require("https");
const Paginator = require("../../paginator");

const categories = {sen: "SEN", senior: "SEN", seniors: "SEN", u21: "U21", u18: "U18", u15: "U15"};
const types = {singles: "SINGLES", doubles: "DOUBLES_PAIR", team: "TEAM", individual: "DOUBLES_INDIV", individual_doubles: "DOUBLES_INDIV"};
const typeDisplay = {SINGLES: "Singles", DOUBLES_PAIR: "Doubles", TEAM: "Team", DOUBLES_INDIV: "Doubles (indiv.)"};
const sexes = {m: "M", men: "M", mens: "M", w: "W", women: "W", womens: "W", mixed: "X", x: "X"};
const weeks = [1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49];
const months = {january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12};
const monthsDisplay = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const validity = {
    SEN: {
        M: {SINGLES: 2001, DOUBLES_PAIR: 2017, DOUBLES_INDIV: 2017, TEAM: 2017},
        W: {SINGLES: 2001, DOUBLES_PAIR: 2017, DOUBLES_INDIV: 2017, TEAM: 2017},
        X: {DOUBLES_PAIR: 2018}
    },
    U21: {
        M: {SINGLES: 2003},
        W: {SINGLES: 2003}
    },
    U18: {
        M: {SINGLES: 2002, TEAM: 2019},
        W: {SINGLES: 2002, TEAM: 2019}
    },
    U15: {
        M: {SINGLES: 2008},
        W: {SINGLES: 2008}
    }
};

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "rankings",
            group: "ittf",
            format: "<category> <eventType> <sex> <year> <month>",
            memberName: "rankings",
            description: "Gets world rankings.",
            details: `Allows you to get the rankings of a specific sex, age group, month and year.\nThis goes back to 2001 in some cases because that's how far the ITTF goes back.\nGenders: M, F\nAge groups: Seniors, U21, U18, U15\nMonths: Jan-Dec\nYears: 2001-Present`,
            examples: ["rankings", "rankings women", "rankings u21", "rankings 2019 u21 womens april"],
        });
    }

    getValidationError(category, sex, type, year) {
        let result = validity[category]; // result is object of sexes
        if (!result) return "category";
        result = result[sex]; // result is object of event types
        if (!result) return "sex";
        result = result[type]; // result is year number
        if (!result) return "type";
        if (year < result) return result;
    }
    
    async run(msg, args) {
        args = args.split(" ").map(a => a.toLowerCase());

        const today = new Date();
        const categoryIn = args.find(a => categories[a]) || "seniors";
        const typeIn = args.find(a => types[a]) || "singles";
        const sexIn = args.find(a => sexes[a]) || "mens";
        const year = args.find(a => a.length == 4 && !Number.isNaN(parseInt(a))) || today.getFullYear();

        // For this year (2020) due to the pandemic, rankings have not updated since April.
        const backupMonth = year == today.getFullYear() ? 4 : today.getMonth();
        const monthIn = args.find(a => months[a]) || monthsDisplay[backupMonth - 1].toLowerCase();
        const month = year == today.getFullYear() && monthIn > today.getMonth() ? backupMonth : months[monthIn];

        const category = categories[categoryIn];
        const type = types[typeIn];
        const sex = sexes[sexIn];
        const week = weeks[month - 1];

        const error = this.getValidationError(category, sex, type, year);
        if (error) {
            if (error === "category") return await msg.failure("Something went wrong with argument parsing.");
            if (error === "sex") return await msg.failure(`The chosen category \`${categoryIn}\` has no ${sexIn} data.`);
            if (error === "type") return await msg.failure(`The chosen category and sex combo (\`${categoryIn}\` \`${sexIn}\`) has no ${typeIn} data.`);
            return await msg.failure(`There is no data for ${categoryIn} ${sexIn} ${typeIn} before ${error}.`);
        }

        // JSON is larger, so went with csv
        // Here is JSON endpoint: https://ranking.ittf.com/public/s/ranking/list?category=SEN&typeGender=M%3BSINGLES&year=2000&week=14&offset=0&size=9999
        const viewUrl = `https://ranking.ittf.com/#/rankings/list/${category}/${sex}%3B${type}/${year}/${week}w`;
        const csvUrl = `https://ranking.ittf.com/public/s/ranking/csv?category=${category}&typeGender=${sex}%3B${type}&year=${year}&week=${week}`;

        msg.channel.startTyping();
        const result = await new Promise(resolve => {
            https.get(csvUrl).on("response", function (response) {
                let body = "";
                response.on("data", (chunk) => body += chunk);
                response.on("end", () => resolve(body));
            });
        });

        const rows = result.split("\n");
        if (rows.length < 3) return await msg.failure(`Invalid combination used: ${categoryIn} ${sexIn} ${typeIn} in ${monthsDisplay[month - 1]} ${year}.`);
        
        // Rank,Previous,ID,Assoc,Gender,Name,Points,Previous Points,WeekNum,MonthNum,YearNum
        const players = rows.slice(1).map(p => {
            const fields = p.split(",");
            const playerId = fields[2];
            const country = fields[3];
            const name = fields[5];
            const rating = fields[6];
            return `[${name}](https://ranking.ittf.com/#/players/profile/${playerId}) | ${country} | ${rating}`;
        });
        const p = new Paginator(this.client, msg, players, 10);
        let title = sex === "M" ? "Men's" : "Women's";
        if (category !== "SEN") title += ` ${category}`;
        title += ` ${typeDisplay[type]} Rankings ${monthsDisplay[month - 1]} ${year}`;
        p.embed.setAuthor(title, "https://ranking.ittf.com/img/logos/rankings.png", viewUrl);
        p.embed.setColor(Constants.Colors.INFO);
        await p.paginate();
        msg.channel.stopTyping(true);
    }
};