// const extendCommand = require("./command");
// const extendColors = require("./colors");
// const extendEvents = require("./events");
// const extendString = require("./string");
// const extendMessage = require("./message");

module.exports = class Extensions {
    static addAll() {
        require("./string")();
        require("./colors")();
        require("./events")();
        require("./message")();
        require("./command")();
        require("./client")();
    }
};