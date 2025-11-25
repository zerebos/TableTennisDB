import * as https from "https";


const getJSON = async (url: string, validator = (c: any) => c) => {
    const parsed = new URL(url);
    const rawResponse = await new Promise<string>(resolve => {
        const req = https.get({
            host: parsed.host,
            path: parsed.pathname + parsed.search,
            headers: {
                "host": "wtt-website-live-events-api-prod-cmfzgabgbzhphabb.eastasia-01.azurewebsites.net",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0",
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.5",
                "accept-encoding": "gzip, deflate, br, zstd",
                "referer": "https://worldtabletennis.com/",
                "origin": "https://worldtabletennis.com",
                "dnt": "1",
                "set-gpc": "1",
                "connection": "keep-alive",
                "priority": "u=4",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "cache-control": "no-cache",
            }
        }).on("response", function (response) {
            console.log(response.statusCode);
            let body = "";
            response.on("data", (chunk) => body += chunk);
            response.on("end", () => resolve(body));
        });
        console.log(req.getHeaders());
    });

    console.log(rawResponse);

    let json;
    try {
        json = JSON.parse(rawResponse);
        if (validator(json)) return json;
        console.error("JSON Validator Failed");
        throw new Error("JSON Validator Failed");
    }
    catch {
        return null;
    }
};

const isValidEvent = (json: any[]) => json.length && json[0]?.eventId;
const eventInfo = await getJSON(`https://wtt-website-live-events-api-prod-cmfzgabgbzhphabb.eastasia-01.azurewebsites.net/api/cms/GetLiveEventWithKey?Key=live_results_event_id`, isValidEvent);
console.log(eventInfo);