# TableTennisDB 🏓

[![Discord Bots](https://top.gg/api/widget/317185553349214209.svg)](https://top.gg/bot/317185553349214209)

A comprehensive Discord bot for table tennis enthusiasts featuring player rankings, equipment specifications, and personal profiles.

## 🚀 Quick Start

### 🌐 Add to Account (Recommended)
**New!** Install TableTennisDB to your Discord account for DM access and cross-server functionality:

[**Add to Your Account**](https://discord.com/oauth2/authorize?client_id=317185553349214209&integration_type=1&scope=applications.commands)

### 🔗 Add to Server (Traditional)
Add TableTennisDB to your Discord server:

[**Add to Server**](https://discord.com/oauth2/authorize?client_id=317185553349214209&permissions=2147863616&scope=bot%20applications.commands)

### 💬 Support
Need help? Join our [support server](https://discord.gg/MZ8hrES9Dd) for assistance and updates.

## ✨ Features

### 👤 Personal Profiles
Create and manage your table tennis profile with equipment and playing style information:
- **Equipment tracking** - Forehand rubber, backhand rubber, blade
- **Playing style** - Strengths, weaknesses, playstyle description
- **Cross-server sync** - Your profile works across all servers
- **DM access** - Edit and view profiles in direct messages

```
/profile edit          # Create or edit your profile
/profile view          # View your profile
/profile view @user    # View another user's profile
```

### 📊 Player Rankings & Information
Look up current ITTF rankings and player statistics:
- **Player lookup** - Search for any ITTF-ranked player
- **Current rankings** - View top players in various categories
- **Tournament data** - Information about major tournaments

```
/player Fan Zhendong               # Look up a specific player
/rankings                          # View current top rankings
/tournament World Championships    # Tournament information
```

### 🏓 Equipment Database
Comprehensive equipment specifications from RevSpin:
- **Rubber specifications** - Speed, spin, control ratings
- **Blade information** - Weight, layers, playing characteristics
- **Ball specifications** - Official tournament balls
- **Autocomplete search** - Fast and accurate equipment lookup

```
/rubber Tenergy 05     # Look up rubber specifications
/blade Viscaria        # Look up blade information
/balls DHS DJ40+       # Ball specifications
```

### 🔍 Smart Search
Advanced search capabilities with fuzzy matching:
- **Partial name matching** - Find equipment even with incomplete names
- **Category suggestions** - Get recommendations when exact matches aren't found
- **Autocomplete** - Suggestions as you type

## 🎯 User Installation Benefits

When you **Add to Account**, you get:

- ✅ **DM Access** - Use all commands in direct messages
- ✅ **Cross-Server Profiles** - Your profile works everywhere
- ✅ **Personal Use** - Access bot features without server installation
- ✅ **Mobile Friendly** - Perfect for on-the-go equipment research
- ✅ **Privacy** - Use commands privately without server spam

Perfect for:
- 🛒 Equipment research while shopping online
- 💬 Sharing player stats in private conversations
- 🏓 Quick lookups during tournaments or practice
- 📱 Mobile access when you need information fast

## 📋 Command Reference

### Profile Commands
- `/profile view` - View your profile
- `/profile view @user` - View another user's profile
- `/profile edit` - Create or edit your profile

### Player & Rankings
- `/player <name>` - Look up player rankings and information
- `/rankings` - View current ITTF rankings
- `/tournament <name>` - Tournament information and results

### Equipment Lookup
- `/rubber <name>` - Rubber specifications and ratings
- `/blade <name>` - Blade specifications and characteristics
- `/balls <name>` - Ball information and specifications

### Utility
- `/help` - Comprehensive help and command guide
- `/about` - Bot information and statistics
- `/ping` - Check bot status and response time

## 🛠️ Technology Stack

- **Discord.js** - Modern Discord API wrapper
- **TypeScript** - Type-safe development
- **Bun** - Fast JavaScript runtime
- **Drizzle ORM** - Type-safe SQLite database layer
- **RevSpin API** - Equipment database integration
- **ITTF Data** - Official ranking information

## 📈 Statistics

TableTennisDB serves thousands of table tennis players across multiple Discord servers, providing:
- Real-time ITTF ranking data
- Comprehensive equipment database
- Cross-platform profile management
- Fast, reliable command execution

## 🔒 Privacy & Data

- Profile data is securely stored
- Data is only used for bot functionality
- Cross-server profile sync respects user privacy
- No data is shared with third parties

## 🤝 Contributing

TableTennisDB is actively maintained and updated. For bug reports, feature requests, or contributions:

1. Join our [support server](https://discord.gg/MZ8hrES9Dd)
2. Report issues through Discord or GitHub
3. Suggest new features and improvements
4. Submit pull requests for improvements

We welcome contributions from the table tennis and Discord bot communities!

## 🗄️ Database

### Running the one-time migration

If you have an existing `settings.sqlite3` created by the old **keyv** backend, run the
migration script once before starting the bot.  It copies all data from the flat `keyv`
table into the new normalised tables and is fully idempotent:

```bash
bun run migrate
```

The original `keyv` table is left intact so you can roll back if needed.  Once you are
happy with the migration you can remove it manually:

```sql
DROP TABLE keyv;
```

---

## 🔬 keyv vs. Drizzle ORM – Analysis & Recommendation

### Approach A – keyv + SQLite (original)

**How it worked:** The project used [keyv](https://github.com/jaredwray/keyv) as a generic
key-value store backed by `@keyv/sqlite`.  Each "namespace" (profiles, stats,
userInstallNotices) was a virtual partition of a single `keyv` table.  All values were
stored as JSON blobs.

| Aspect | Detail |
|--------|--------|
| **Schema** | None – flat `key TEXT, value TEXT` table |
| **Type-safety** | Zero – values are `unknown` blobs; callers cast at read time |
| **Query power** | Key lookups only – no filtering, aggregation, or joins |
| **Stats aggregation** | Full scan of all guilds in application code |
| **Dependencies** | `keyv`, `@keyv/sqlite`, `sqlite3` (native addon) |
| **Setup** | One import, zero config |
| **Migration** | Not applicable (schema-less) |

### Approach B – Drizzle ORM + bun:sqlite (this PR)

**How it works:** The codebase now uses [Drizzle ORM](https://orm.drizzle.team) with the
native `bun:sqlite` driver.  Each domain concept is a proper table defined in
`src/schema.ts` with typed columns.  The `src/db.ts` module exposes typed helper
functions instead of generic get/set.

| Aspect | Detail |
|--------|--------|
| **Schema** | Explicit typed tables with primary keys and constraints |
| **Type-safety** | Full – query results are typed; no runtime casts needed |
| **Query power** | Full SQL via Drizzle's query builder (filters, joins, aggregations) |
| **Stats writes** | Single atomic `INSERT … ON CONFLICT DO UPDATE SET count = count + 1` |
| **Dependencies** | `drizzle-orm` only (uses Bun's built-in `bun:sqlite`) |
| **Setup** | Schema file + `CREATE TABLE IF NOT EXISTS` on startup |
| **Migration** | `bun run migrate` (one-time, idempotent) |

### ✅ Recommendation: **Drizzle ORM**

For this project, **Drizzle ORM is the better long-term choice** for the following reasons:

1. **Type-safety with zero overhead.** The old keyv approach required `as SomeType` casts
   at every read site and gave no compile-time guarantee that the stored data matched the
   expected shape.  Drizzle derives column types directly from the schema; a typo in a
   column name is a compile error, not a runtime surprise.

2. **Leaner dependency tree.** `@keyv/sqlite` pulled in the native `sqlite3` npm package
   which required compiling C++ bindings and had its own `overrides` workaround in
   `package.json`.  Drizzle uses Bun's built-in SQLite engine, removing an entire layer
   of native dependencies.

3. **Proper data modelling.** Profiles, stats, and notices are distinct entities with
   clear primary keys.  Drizzle makes this explicit in `src/schema.ts`, which serves as
   living documentation of the data model.

4. **Efficient writes.** The stats increment is now a single atomic SQL upsert
   (`INSERT … ON CONFLICT DO UPDATE SET count = count + 1`) instead of a read → mutate
   → write round-trip, which is both faster and race-condition-free.

5. **Future extensibility.** Adding indices, foreign keys, new columns, or cross-table
   queries is straightforward with Drizzle.  With keyv it would require JSON reshaping
   or namespace juggling.

**Trade-off:** Drizzle does require an explicit schema and a one-time migration for
existing data.  For a brand-new project that purely needed ephemeral key-value storage,
keyv's zero-config approach would be perfectly fine.  Given that this project already
has defined data shapes (ProfileData, CommandStats) and will likely grow over time,
the explicitness of Drizzle pays for itself immediately.



TableTennisDB is open source software licensed under the [MIT License](LICENSE).

---

**Get started today!** Add TableTennisDB to your account and discover the ultimate table tennis companion for Discord.

[**Add to Account**](https://discord.com/oauth2/authorize?client_id=317185553349214209&integration_type=1&scope=applications.commands) • [**Add to Server**](https://discord.com/oauth2/authorize?client_id=317185553349214209&permissions=2147863616&scope=bot%20applications.commands) • [**Support Server**](https://discord.gg/MZ8hrES9Dd)