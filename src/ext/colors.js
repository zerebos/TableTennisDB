const {Constants} = require("discord.js");

module.exports = () => {
    Constants.Colors.SUCCESS = 0x71cd40;
    Constants.Colors.FAILURE = Constants.Colors.RED;
    Constants.Colors.INFO = Constants.Colors.BLUE;
    Constants.Colors.WARNING = Constants.Colors.GOLD;
    Constants.Colors.generate =  function(red, green, blue) {
        return parseInt("0x{{red}}{{green}}{{blue}}".format(red, green, blue), 16);
    };
};