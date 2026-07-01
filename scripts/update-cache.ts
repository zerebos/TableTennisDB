import {load} from "cheerio";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {getText} from "../src/http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheFolder = path.resolve(__dirname, "..", ".revspin");
const categories = ["rubber", "blade", "pips", "table", "balls", "shoes", "sponge", "trainingdvd", "robot", "net", "premade"];

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0";

async function updateCache() {
    if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);

    for (const category of categories) {

        const startTime = performance.now();
        console.log(`Updating cache for ${category}.`);
        console.group();

        let stepEnd, stepStart = performance.now();
        const html = await getText(`https://revspin.net/${category}/`, {"user-agent": USER_AGENT});
        stepEnd = performance.now();
        console.log(`✅ HTML fetched in ${stepEnd - stepStart}ms.`);

        stepStart = performance.now();
        const $ = load(html);
        const data = $("td.cell_name").map((_, el) => {
            const base = $(el);
            const link = base.find("a").attr("href");
            if (!link) return null;
            return {name: base.text().trim(), href: link};
        }).get().filter(i => i);
        stepEnd = performance.now();
        console.log(`✅ Data parsed in ${stepEnd - stepStart}ms.`);

        stepStart = performance.now();
        fs.writeFileSync(path.join(cacheFolder, `${category}.json`), JSON.stringify(data));
        stepEnd = performance.now();
        console.log(`✅ File saved in ${stepEnd - stepStart}ms.`);

        const endTime = performance.now();
        const timeTook = endTime - startTime;
        console.log(`✅ Cache updated for ${category} in ${timeTook}ms.`);
        console.groupEnd();
    }
}


console.log("");
console.log("Updating cache for RevSpin.net");
console.log("");

updateCache().then(() => {
    console.log("");
    console.log(`✅ RevSpin cache updated!`);
});
