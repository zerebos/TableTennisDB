const util = require("util");
const {splitMessage} = require("discord.js");
const tags = require("common-tags");
const {Command, util: {escapeRegex}} = require("discord.js-commando");

const nl = "!!NL!!";
const nlPattern = new RegExp(nl, "g");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "eval",
            group: "botadmin",
            memberName: "eval",
            description: "Executes JavaScript code.",
            details: "Only the bot owner(s) may use this command.",
            ownerOnly: true,
            args: [
                {
                    key: "script",
                    prompt: "What code would you like to evaluate?",
                    type: "string"
                }
            ]
        });

        this.lastResult = null;
        Object.defineProperty(this, "_sensitivePattern", {value: null, configurable: true});
    }

    run(msg, args) {
        // Make a bunch of helpers
        /* eslint-disable no-unused-vars */
        const message = msg;
        const client = msg.client;
        const lastResult = this.lastResult;
        const doReply = val => {
            if (val instanceof Error) {
                msg.failure(`Callback error: \`${val}\``);
            }
            else {
                const result = this.makeResultMessages(val, process.hrtime(this.hrStart));
                if (Array.isArray(result)) for (const item of result) msg.say(item);
                else msg.say(result);
            }
        };
        /* eslint-enable no-unused-vars */

        // Run the code and measure its execution time
        let hrDiff;
        try {
            const hrStart = process.hrtime();
            this.lastResult = eval(args.script);
            hrDiff = process.hrtime(hrStart);
        }
        catch (err) {
            return msg.failure(`Error while evaluating: \`${err}\``);
        }

        // Prepare for callback time and respond
        this.hrStart = process.hrtime();
        const result = this.makeResultMessages(this.lastResult, hrDiff, args.script);
        if (Array.isArray(result)) {
            return result.map(item => msg.say(item));
        }
        return msg.say(result);
    }

    makeResultMessages(result, hrDiff, input = null) {
        const inspected = util.inspect(result, {depth: 0})
            .replace(nlPattern, "\n")
            .replace(this.sensitivePattern, "--snip--");
        const split = inspected.split("\n");
        const last = inspected.length - 1;
        const prependPart = inspected[0] !== "{" && inspected[0] !== "[" && inspected[0] !== "'" ? split[0] : inspected[0];
        const appendPart = inspected[last] !== "}" && inspected[last] !== "]" && inspected[last] !== "'" ?
            split[split.length - 1] :
            inspected[last];
        const prepend = `\`\`\`javascript\n${prependPart}\n`;
        const append = `\n${appendPart}\n\`\`\``;
        if (input) {
            return splitMessage(tags.stripIndents`
                *Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ""}${hrDiff[1] / 1000000}ms.*
                \`\`\`javascript
                ${inspected}
                \`\`\`
            `, {maxLength: 1900, prepend, append});
        }
        return splitMessage(tags.stripIndents`
            *Callback executed after ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ""}${hrDiff[1] / 1000000}ms.*
            \`\`\`javascript
            ${inspected}
            \`\`\`
        `, {maxLength: 1900, prepend, append});
    }

    get sensitivePattern() {
        if (this._sensitivePattern) return this._sensitivePattern;
        let pattern = "";
        if (this.client.token) pattern += escapeRegex(this.client.token);
        Object.defineProperty(this, "_sensitivePattern", {value: new RegExp(pattern, "gi"), configurable: false});
        return this._sensitivePattern;
    }
};
