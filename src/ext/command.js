const {Constants} = require("discord.js");
const Commando = require("discord.js-commando");
const Events = new Set(Object.values(Constants.Events));

const getListeners = function(command) {
    const prototype = Object.getPrototypeOf(command);
    return Object.getOwnPropertyNames(prototype).filter(m => m.startsWith("on") && typeof prototype[m] == "function").filter(e => Events.has(e[2].toLowerCase() + e.substr(3)));
};

const eventFromListener = function(listener) {
    return listener[2].toLowerCase() + listener.substr(3);
};

class CommandExt extends Commando.Command {
    constructor(client, info) {
        if (info && info.args) {
            for (const arg of info.args) {
                if (!arg.hasOwnProperty("defaultValue")) continue;
                arg.default = arg.defaultValue;
                delete arg.defaultValue;
            }
        }
        super(client, info);
        
        this._addInhibitor();
        this._registerListeners();
    }

    _addInhibitor() {
        if (!this.inhibitor) return;
        if (!this.inhibitor.name.startsWith("bound")) this.inhibitor = this.inhibitor.bind(this);
        this.client.dispatcher.addInhibitor(this.inhibitor);
    }

    _removeInhibitor() {
        if (!this.inhibitor) return;
        if (!this.inhibitor.name.startsWith("bound")) this.inhibitor = this.inhibitor.bind(this);
        this.client.dispatcher.removeInhibitor(this.inhibitor);
    }

    _registerListeners() {
        const listeners = getListeners(this);
        if (!listeners.length) return;
        for (const listener of listeners) {
            if (!this[listener].name.startsWith("bound")) this[listener] = this[listener].bind(this);
            this.client.on(eventFromListener(listener), this[listener]);
        }
    }

    _unregisterListeners() {
        const listeners = getListeners(this);
        if (!listeners.length) return;
        for (const listener of listeners) {
            this.client.off(eventFromListener(listener), this[listener]);
        }
    }

    reload() {
        this._removeInhibitor();
        this._unregisterListeners();
        return super.reload();
    }

    /**
     * Called when the command produces an error while running
     * @param {Error} err - Error that was thrown
     * @param {CommandMessage} message - Command message that the command is running from (see {@link Command#run})
     * @param {Object|string|string[]} args - Arguments for the command (see {@link Command#run})
     * @param {boolean} fromPattern - Whether the args are pattern matches (see {@link Command#run})
     * @param {?ArgumentCollectorResult} result - Result from obtaining the arguments from the collector
     * (if applicable - see {@link Command#run})
     * @returns {Promise<?Message|?Array<Message>>}
     */
    onError(err, message, args, fromPattern, result) { // eslint-disable-line no-unused-vars
        let contact = "to the bot owner";
        const invite = this.client.options.invite;
        const github = this.client.options.github;
        if (github) contact = `on [GitHub](${github})`;
        if (invite) contact = `${github ? contact + " or " : ""}in the [Support Server](${invite})`;
        return message.channel.send({embed: {
            color: Constants.Colors.FAILURE,
            description: [`An error occurred while running the command: \`${err.name}: ${err.message}\``, `If the issue persists, please reach out ${contact}.`].join("\n")
        }});
    }
}

module.exports = () => {
    delete Commando.Command;
    Commando.Command = CommandExt;
};