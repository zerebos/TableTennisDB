import operator
import discordbot
from bs4 import BeautifulSoup
import json
from discordbot import utilities
from models.dbitem import DBItem


class TableTennisDB:
    """Commands for looking up items on TableTennisDB."""

    def __init__(self, bot):
        self.bot = bot

    @staticmethod
    def get_candidate_embed(candidates):
        e = discordbot.Embed(colour=0x738bd7)
        e.title = "Best Matches:\n"
        if 'type' in dict(candidates[0]):
            for c in candidates:
                e.add_field(name=c['type'], value=c['name'] + " - " + "{:0.2f}".format(c['similarity'] * 100) + "%")
            return e
        else:
            response = ""
            for c in candidates:
                response += c['name'] + " - " + "{:0.2f}".format(c['similarity'] * 100) + "%\n"
            e.description = response
            return e

    async def find_item(self, item_type, query):
        await self.bot.type()

        candidates = DBItem.find_matches(DBItem.ITEM_TYPES[item_type], query)

        if candidates[0]['similarity'] >= DBItem.MATCHING_THRESHOLD:
            await self.bot.say((await DBItem.get_item(DBItem.ITEM_TYPES[item_type], candidates[0]['page'], self.bot.loop)).toDiscordString())
        else:
            await self.bot.say("Sorry, the " + item_type + " '" + query + "' was not found.\n\n")
            await self.bot.say(embed=self.get_candidate_embed(candidates))

    @discordbot.commands.command()
    @discordbot.checks.is_owner()
    async def update(self):

        msg = await self.bot.say("Updating cache for TableTennisDB.")

        for category in ['rubber', 'blade', 'pips', 'table', 'balls', 'shoes', 'sponge', 'trainingdvd', 'robot', 'net',
                         'premade']:

            await self.bot.edit_message(msg, "Updating cache for {0}.".format(category))

            url = 'http://www.tabletennisdb.com/' + category + '/'
            soup = BeautifulSoup(await utilities.fetchURL(url, self.bot.loop), "html.parser")

            items = list()
            for rubber in soup.find_all("td", class_="cell_name"):
                if rubber.a:
                    name = rubber.get_text()
                    page = rubber.a['href']
                    page = page.split('/')[1]
                    page = page.split('.')[0]
                    node = {'name': name, 'page': page}
                    items.append(node)

            with open('cache/' + category + '.json', 'w') as outfile:
                json.dump(items, outfile)

            await self.bot.edit_message(msg, "Cache updated for {0}.".format(category))

        await self.bot.edit_message(msg, "TableTennisDB cache updated!")

    @discordbot.commands.command()
    async def search(self, *, query: str):
        """Returns the top 5 results from a all categories.

        Everything you type past the command will be searched for. This yields the top matches across all categories of
        the TableTennisDB site.
        """

        top_candidates = []
        for item_type in DBItem.ITEM_TYPES:
            top_candidates.extend(DBItem.find_matches(DBItem.ITEM_TYPES[item_type], query))

        top_candidates.sort(key=operator.itemgetter('similarity'), reverse=True)

        await self.bot.say(embed=self.get_candidate_embed(top_candidates[:5]))

    @discordbot.commands.group(pass_context="true", invoke_without_command=True)
    async def stats(self, ctx, *, query = ""):
        """Tries to find the best result across all categories.

        The subcommands allow for search in one category.
        """

        if ctx.invoked_subcommand is not None:
            return
        # else:
        #     query = ctx.message.content[7:]

        if not query:
            return

        top_candidates = []
        for item_type in DBItem.ITEM_TYPES:
            candidate = DBItem.find_matches(DBItem.ITEM_TYPES[item_type], query)[0]
            candidate['type'] = DBItem.ITEM_TYPES[item_type]['url']
            top_candidates.append(candidate)

        top_candidates.sort(key=operator.itemgetter('similarity'), reverse=True)

        if top_candidates[0]['similarity'] >= DBItem.MATCHING_THRESHOLD:
            await self.find_item(top_candidates[0]['type'], top_candidates[0]['page'])
        else:
            await self.bot.say("Sorry, '" + query + "' was not found.\n\n")
            await self.bot.say(embed=self.get_candidate_embed(top_candidates[:5]))

    @stats.command(name="blade")
    async def stats_blade(self, *, query: str):
        """Gets the stats on a Blade"""

        await self.find_item('blade', query)

    @stats.command(name="pips")
    async def stats_pips(self, *, query: str):
        """Gets the stats on Pips"""

        await self.find_item('pips', query)

    @stats.command(name="rubber")
    async def stats_rubber(self, *, query: str):
        """Gets the stats on a Rubber"""

        await self.find_item('rubber', query)

    @stats.command(name="table")
    async def stats_table(self, *, query: str):
        """Gets the stats on a Table"""

        await self.find_item('table', query)

    @stats.command(name="ball")
    async def stats_ball(self, *, query: str):
        """Gets the stats on a Ball"""

        await self.find_item('balls', query)

    @stats.command(name="shoes")
    async def stats_shoes(self, *, query: str):
        """Gets the stats on a pair of Shoes"""

        await self.find_item('shoes', query)

    @stats.command(name="sponge")
    async def stats_sponge(self, *, query: str):
        """Gets the stats on a Sponge"""

        await self.find_item('sponge', query)

    @stats.command(name="dvd")
    async def stats_dvd(self, *, query: str):
        """Gets the stats on a Training DVD"""

        await self.find_item('trainingdvd', query)

    @stats.command(name="robot")
    async def stats_robot(self, *, query: str):
        """Gets the stats on a Robot"""

        await self.find_item('robot', query)

    @stats.command(name="net")
    async def stats_net(self, *, query: str):
        """Gets the stats on a Net Set"""

        await self.find_item('net', query)

    @stats.command(name="premade")
    async def stats_premade(self, *, query: str):
        """Gets the stats on a Premade Paddle"""

        await self.find_item('premade', query)

def setup(bot):
    bot.add_cog(TableTennisDB(bot))