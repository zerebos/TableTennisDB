const {Constants} = require("discord.js");

// Adds Commando-specific events into the Events constant.
module.exports = () => {
    Object.assign(Constants.Events, {
        COMMAND_BLOCK: "commandBlock",
        COMMAND_CANCEL: "commandCancel",
        COMMAND_ERROR: "commandError",
        COMMAND_PREFIX_CHANGE: "commandPrefixChange",
        COMMAND_REGISTER: "commandRegister",
        COMMAND_REREGISTER: "commandReregister",
        COMMAND_RUN: "commandRun",
        COMMAND_STATUS_CHANGE: "commandStatusChange",
        COMMAND_UNREGISTER: "commandUnregister",
        GROUP_REGISTER: "groupRegister",
        GROUP_STATUS_CHANGE: "groupStatusChange",
        PROVIDER_READY: "providerReady",
        TYPE_REGISTER: "typeRegister",
        UNKNOWN_COMMAND: "unknownCommand",
    });
};