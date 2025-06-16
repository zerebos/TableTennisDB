import "dotenv/config";

const snowflakeRegex = /^[0-9]{15,}$/;

if (!process.env.BOT_CLIENT_ID) {
    console.error("❌ No client id provided to environment variable BOT_CLIENT_ID.");
    process.exit(1);
}
else if (!snowflakeRegex.test(process.env.BOT_CLIENT_ID)) {
    console.error("❌ Invalid format for BOT_CLIENT_ID, ensure your environment variables are setup properly.");
    process.exit(1);
}

if (!process.env.BOT_TOKEN) {
    console.error("❌ No bot token provided to environment variable BOT_TOKEN.");
    process.exit(1);
}

// TODO: validate owner id format
if (!process.env.BOT_OWNER_ID) {
    console.error("❌ No bot owner id provided to environment variable BOT_OWNER_ID.");
    process.exit(1);
}
else if (!snowflakeRegex.test(process.env.BOT_OWNER_ID)) {
    console.error("❌ Invalid format for BOT_OWNER_ID, ensure your environment variables are setup properly.");
    process.exit(1);
}

// TODO: add validation for other varibles like absolute URLs and IDs
// or potentially make that a separate function in the main bot and use
// this script solely to check for the REQUIRED variables